# -*- coding: utf-8 -*-
"""
교정된 자막 원문 한 편씩을 Gemini(thinking high)가 읽고, 사주 해석에 쓸 수 있는 구조화된 지식으로 정리한다.

파일마다 analysis/knowledge/<채널>/<videos|shorts>/<원문파일명>.json 을 만든다:
  - summary   : 영상 종합 요약
  - topics    : 다루는 영역
  - scope     : 일반 원리 / 특정 연도 운세 / 특정 월 운세 / 특정 대운·시기 / 사례·상담
  - years     : 다루는 연도
  - claims[]  : 조건(일간·일주·띠·월지·십성·신살·오행·격국·대운·세운 …) → 결과·행동(바람기, 큰돈, 단명, 이직 …)
                + tag(집계용 라벨) + category + polarity + certainty + time(해당 시기) + advice + quote(원문 구절)
  - insights  : 조건으로 표현하기 어려운 해석 원리
  - keywords

재실행하면 analysis/knowledge_manifest.json 기준으로 미처리분만 처리한다. 교정(rewrite_manifest.json)이 끝난 파일만 대상으로 삼는다.

사용:
  python analysis/extract_knowledge.py                    # 교정 완료 파일 중 미처리분 전체
  python analysis/extract_knowledge.py --limit 3 --print  # 시험(결과 출력)
  python analysis/extract_knowledge.py --workers 12
  python analysis/extract_knowledge.py --status
"""
import argparse, glob, hashlib, io, json, os, re, sys, threading, time
from concurrent.futures import ThreadPoolExecutor, as_completed

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, "data")
OUT_DIR = os.path.join(HERE, "knowledge")
MANIFEST = os.path.join(HERE, "knowledge_manifest.json")
REWRITE_MANIFEST = os.path.join(HERE, "rewrite_manifest.json")
LOG = os.path.join(HERE, "extract_log.txt")
SEP = "-" * 60
MODEL = os.environ.get("EXTRACT_MODEL", "gemini-3.8-flash")
THINKING = os.environ.get("EXTRACT_THINKING", "high")
PRICE_IN, PRICE_OUT = 0.75, 3.75   # USD / 1M tokens (2026-12-31까지 도입가)

sys.path.insert(0, HERE)
from build_kb import CLAIMS  # noqa: E402  집계 라벨을 기존 KB 라벨과 맞춘다

CATEGORIES = ["직장", "금전", "연애·결혼", "건강·수명", "학업·시험", "가족·자식", "성격·기질", "운세 흐름", "궁합·인간관계", "개운·조언", "명리 이론", "기타"]
COND_TYPES = ["일간", "일주", "띠", "년주", "월주", "시주", "년지", "월지", "일지", "시지", "천간", "지지", "십성", "십성 위치", "십성 과다", "십성 없음", "신살", "오행 과다", "오행 부족", "오행 구성", "격국", "신강약", "구조·조합", "합충형파해", "12운성", "공망", "대운", "세운", "월운", "연령대", "성별", "계절·절기", "기타"]
EXTRA_TAGS = [
    "명이 짧음·수명 위험", "장수", "큰 재물·부자", "재물 대운 시기", "외도·바람기", "무속·신끼", "유명세·연예 기질", "이민·해외 거주",
    "사기·법적 문제", "조기 성공", "늦은 성공·대기만성", "폭발적 성장·도약", "사업가 기질", "직장인 기질", "결혼 인연 시기", "자식 인연 약함",
    "부모 덕·유산", "배우자 덕", "주도적·보스 기질", "희생·봉사 기질", "예술·창작 재능", "학자·연구 기질", "권력·정치", "칼·의료·군경 계열",
    "교육·가르침", "외모·매력", "고독·독신", "운 상승기", "운 하강기", "조심할 시기", "좋은 시기·달", "궁합 좋음", "궁합 나쁨", "개운법",
    "이사·이동 시기", "합격·문서 시기", "이별·정리 시기", "연애 시기", "재물 손실 시기", "건강 주의 시기", "기타",
]
TAGS = list(CLAIMS.keys()) + [t for t in EXTRA_TAGS if t not in CLAIMS]

SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string", "description": "영상 내용을 3~5문장으로 종합 요약(한국어). 누가 어떤 조건을 가지면 어떻게 된다는 핵심을 담는다."},
        "topics": {"type": "array", "items": {"type": "string", "enum": CATEGORIES}},
        "scope": {"type": "string", "enum": ["일반 원리", "특정 연도 운세", "특정 월 운세", "특정 대운·시기", "사례·상담", "기타"]},
        "years": {"type": "array", "items": {"type": "integer"}, "description": "영상이 다루는 연도(예 2026). 없으면 빈 배열"},
        "claims": {
            "type": "array",
            "description": "영상에서 말한 '조건 → 결과·행동·특징' 을 빠짐없이. 조건이 여럿 겹치면(예: 월지 정관 + 병오 대운) conditions 에 모두 넣는다.",
            "items": {
                "type": "object",
                "properties": {
                    "conditions": {"type": "array", "items": {"type": "object", "properties": {
                        "type": {"type": "string", "enum": COND_TYPES},
                        "value": {"type": "string", "description": "정규 표기. 일간·천간: 갑/을/병/정/무/기/경/신/임/계 · 지지·띠: 자/축/인/묘/진/사/오/미/신/유/술/해 · 일주: 갑자 처럼 두 글자 · 십성: 비견/겁재/식신/상관/편재/정재/편관/정관/편인/정인 · 오행: 목/화/토/금/수 · 십성 위치: '월지 정관' · 신살: 도화살/역마살/귀문관살/백호대살/괴강살/양인살/화개살/천을귀인/원진/공망 등 · 대운·세운: '병오 대운', '2026년 병오년', '정관 대운' · 합충형파해: '자오충', '인해합' 등"},
                    }, "required": ["type", "value"]}},
                    "outcome": {"type": "string", "description": "결과·행동·특징 한 문장(30자 안팎). 예: 바람을 피우기 쉽다 / 40대에 큰돈을 번다 / 명이 짧을 수 있다 / 이직이 잦다 / 2026년 5월에 합격운"},
                    "tag": {"type": "string", "enum": TAGS, "description": "집계용 라벨. 가장 가까운 것 하나"},
                    "category": {"type": "string", "enum": CATEGORIES},
                    "polarity": {"type": "integer", "enum": [-1, 0, 1], "description": "좋은 결과 1, 나쁜 결과 -1, 중립 0"},
                    "certainty": {"type": "string", "enum": ["확언", "경향", "조건부", "추측"]},
                    "time": {"type": "string", "description": "해당 시기. 항상 적용이면 '항상'. 예: '2026년', '2026년 5월', '병오 대운', '30대', '갑진년~병오년'"},
                    "advice": {"type": "string", "description": "함께 제시된 조언·개운법. 없으면 빈 문자열"},
                    "quote": {"type": "string", "description": "근거가 되는 원문 구절 그대로(120자 이내)"},
                },
                "required": ["conditions", "outcome", "tag", "category", "polarity", "certainty", "time", "advice", "quote"],
            },
        },
        "insights": {"type": "array", "items": {"type": "string"}, "description": "조건→결과로 쓰기 어려운 해석 원리·통찰(각 1~2문장). 예: '간여지동 해에는 오행이 많은 쪽부터 본다'"},
        "keywords": {"type": "array", "items": {"type": "string"}, "description": "핵심어 5~12개"},
    },
    "required": ["summary", "topics", "scope", "years", "claims", "insights", "keywords"],
}

SYSTEM = """당신은 사주·명리학에 정통한 지식 정리 전문가입니다. 입력은 사주 전문가의 유튜브 강의 자막(교정본) 한 편입니다.
이 영상을 끝까지 읽고, 앞으로 사주 해석 엔진이 참고할 수 있도록 '어떤 조건(글자·조합·시기)이면 어떤 결과·행동·특징이 나온다'를 빠짐없이 구조화하세요.

원칙
1. 영상에서 실제로 말한 내용만 적습니다. 일반 상식으로 보충하지 않습니다.
2. 조건은 가능한 한 명리 용어로 정규화합니다(일간 '갑', 띠 '오', 일주 '갑자', 십성 위치 '월지 정관', 신살 '귀문관살', 오행 과다 '화', 대운 '병오 대운', 세운 '2026년 병오년').
   여러 조건이 겹쳐야 성립하는 이야기(예: 월지가 정관인데 대운이 편관 → 직장 변동)는 conditions 에 모두 넣습니다.
3. 결과(outcome)는 행동·사건·특징을 짧고 구체적으로: '바람을 피우기 쉽다', '큰돈을 번다', '명이 짧을 수 있다', '이직이 잦다', '2026년 5월 합격운', '연상과 인연'.
4. 특정 연도·월·대운에만 해당하는 이야기는 time 에 시기를 적고 conditions 에도 세운/월운/대운 조건을 넣습니다. 항상 적용되는 원리는 time '항상'.
5. tag 는 목록 중 가장 가까운 라벨 하나. 맞는 게 없으면 '기타'.
6. quote 는 근거 원문 구절을 그대로 짧게(120자 이내).
7. 홍보·인사·잡담은 제외합니다. 순위 영상(TOP3 등)은 순위마다 claim 으로 나눕니다.
8. 출력은 지정된 JSON 스키마만."""

_lock = threading.Lock()


def sha(s):
    return hashlib.sha1(s.encode("utf-8")).hexdigest()[:12]


def load_key():
    k = os.environ.get("GEMINI_API_KEY", "").strip()
    if not k and os.path.exists(os.path.join(ROOT, ".env")):
        m = re.search(r"GEMINI_API_KEY\s*=\s*\"?([^\"\r\n]+)", io.open(os.path.join(ROOT, ".env"), encoding="utf-8").read())
        k = m.group(1).strip() if m else ""
    if not k:
        sys.exit("GEMINI_API_KEY 가 없습니다 (.env)")
    return k


def load_json(p, default):
    if os.path.exists(p):
        try:
            return json.load(io.open(p, encoding="utf-8"))
        except Exception:
            pass
    return default


def save_json_atomic(p, obj, indent=None):
    tmp = p + ".tmp"
    io.open(tmp, "w", encoding="utf-8", newline="\n").write(json.dumps(obj, ensure_ascii=False, indent=indent))
    for i in range(6):
        try:
            os.replace(tmp, p); return
        except PermissionError:
            time.sleep(0.3 * (i + 1))
    os.replace(tmp, p)


def log(msg):
    line = time.strftime("%H:%M:%S ") + msg
    with _lock:
        print(line, flush=True)
        try:
            io.open(LOG, "a", encoding="utf-8").write(line + "\n")
        except Exception:
            pass


def all_files():
    out = []
    for ch in sorted(os.listdir(DATA)):
        for tab in ("shorts", "videos"):
            d = os.path.join(DATA, ch, tab)
            if os.path.isdir(d):
                out += sorted(glob.glob(os.path.join(d, "*.txt")))
    return out


def rel_of(path):
    return os.path.relpath(path, ROOT).replace("\\", "/")


def parse_header(header):
    meta = {}
    for ln in header.splitlines():
        m = re.match(r"^([^:]{1,12}):\s*(.*)$", ln.strip())
        if m:
            meta[m.group(1).strip()] = m.group(2).strip()
    return meta


class Extractor:
    def __init__(self, key):
        from google import genai
        from google.genai import types
        self.types = types
        self.client = genai.Client(api_key=key)
        self.usage = {"in": 0, "out": 0, "think": 0, "calls": 0}

    def _cfg(self, temperature):
        t = self.types
        kw = dict(system_instruction=SYSTEM, temperature=temperature, max_output_tokens=60000,
                  response_mime_type="application/json", response_json_schema=SCHEMA,
                  thinking_config=t.ThinkingConfig(thinking_level=THINKING))
        return t.GenerateContentConfig(**kw)

    def call(self, prompt, temperature=0.3):
        delay = 5
        for attempt in range(7):
            try:
                r = self.client.models.generate_content(model=MODEL, contents=prompt, config=self._cfg(temperature))
                u = r.usage_metadata
                with _lock:
                    self.usage["calls"] += 1
                    self.usage["in"] += (u.prompt_token_count or 0)
                    self.usage["out"] += (u.candidates_token_count or 0)
                    self.usage["think"] += (u.thoughts_token_count or 0)
                return r.text or ""
            except Exception as e:
                msg = str(e)
                if attempt == 6:
                    raise
                if any(k in msg for k in ("429", "RESOURCE_EXHAUSTED", "503", "UNAVAILABLE", "500", "INTERNAL", "DEADLINE", "504", "timeout", "Timeout", "overloaded")):
                    time.sleep(delay); delay = min(delay * 2, 120)
                    continue
                raise

    def extract(self, meta, body):
        prompt = f"[채널] {meta.get('_channel', '')}\n[제목] {meta.get('제목', '')}\n[업로드] {meta.get('업로드', '')}\n[길이(초)] {meta.get('길이(초)', '')}\n\n[자막 본문]\n{body}"
        last_err = None
        for temp in (0.3, 0.6):
            txt = self.call(prompt, temp)
            try:
                obj = json.loads(txt)
                if isinstance(obj, dict) and "claims" in obj:
                    return obj
                last_err = "schema"
            except Exception as e:
                last_err = f"json: {str(e)[:80]}"
        raise RuntimeError(f"JSON 파싱 실패 ({last_err})")


def cost(u):
    return (u["in"] * PRICE_IN + (u["out"] + u["think"]) * PRICE_OUT) / 1e6


def process(ex, path, manifest):
    rel = rel_of(path)
    raw = io.open(path, encoding="utf-8").read()
    if SEP not in raw:
        return rel, "skip(형식)", None
    header, body = raw.split(SEP, 1)
    body = body.strip()
    if len(body) < 80:
        return rel, "skip(짧음)", None
    meta = parse_header(header)
    parts = rel.split("/")
    meta["_channel"], meta["_tab"] = parts[1], parts[2]
    t0 = time.time()
    obj = ex.extract(meta, body)
    rec = {
        "source": rel, "channel": meta["_channel"], "tab": meta["_tab"], "video_id": meta.get("영상 ID", ""), "title": meta.get("제목", ""),
        "url": meta.get("URL", ""), "upload": meta.get("업로드", ""), "duration_sec": meta.get("길이(초)", ""), "views": meta.get("조회수", ""),
        "chars": len(body), "model": MODEL, "thinking": THINKING, "extracted_at": time.strftime("%Y-%m-%d %H:%M"),
    }
    rec.update(obj)
    out_path = os.path.join(OUT_DIR, meta["_channel"], meta["_tab"], os.path.splitext(os.path.basename(path))[0] + ".json")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    save_json_atomic(out_path, rec, indent=1)
    with _lock:
        manifest[rel] = {"sha_in": sha(raw), "out": os.path.relpath(out_path, ROOT).replace("\\", "/"), "claims": len(obj.get("claims", [])), "chars": len(body), "ts": rec["extracted_at"]}
        save_json_atomic(MANIFEST, manifest)
    return rel, "ok", (len(obj.get("claims", [])), time.time() - t0)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--paths", nargs="*", default=None)
    ap.add_argument("--print", action="store_true", help="결과 JSON 을 화면에 출력(시험용)")
    ap.add_argument("--status", action="store_true")
    ap.add_argument("--all", action="store_true", help="교정 여부와 무관하게 전체 대상")
    a = ap.parse_args()
    files = a.paths or all_files()
    manifest = load_json(MANIFEST, {})
    rewrite = load_json(REWRITE_MANIFEST, {})
    if a.status:
        done = [v for v in manifest.values() if v.get("out")]
        print(f"추출 {len(done)}/{len(files)} | claims 합계 {sum(v.get('claims', 0) for v in done):,} | 평균 {sum(v.get('claims', 0) for v in done) / max(1, len(done)):.1f}개/편")
        return
    todo, waiting = [], 0
    for p in files:
        rel = rel_of(p)
        cur = sha(io.open(p, encoding="utf-8").read())
        if rel in manifest and manifest[rel].get("sha_in") == cur:
            continue
        if not a.all and not a.paths and rewrite.get(rel, {}).get("sha_out") != cur:
            waiting += 1   # 아직 교정되지 않은 파일은 다음 실행에서
            continue
        todo.append(p)
    if a.limit:
        todo = todo[: a.limit]
    log(f"대상 {len(todo)}개 (전체 {len(files)}, 이미 추출 {sum(1 for p in files if rel_of(p) in manifest)}, 교정 대기 {waiting}) model={MODEL} thinking={THINKING} workers={a.workers}")
    ex = Extractor(load_key())
    t0, n, fails = time.time(), 0, 0
    with ThreadPoolExecutor(max_workers=a.workers) as pool:
        futs = {pool.submit(process, ex, p, manifest): p for p in todo}
        for f in as_completed(futs):
            n += 1
            try:
                rel, st, info = f.result()
                extra = f" claims {info[0]} {info[1]:.0f}s" if info else ""
                log(f"[{n}/{len(todo)}] {st} {rel[-70:]}{extra}")
                if a.print and st == "ok":
                    out_rel = manifest[rel]["out"]
                    print(io.open(os.path.join(ROOT, out_rel), encoding="utf-8").read()[:6000])
            except Exception as e:
                fails += 1
                log(f"[{n}/{len(todo)}] FAIL {rel_of(futs[f])[-70:]} :: {str(e)[:200]}")
            if n % 20 == 0:
                u = ex.usage
                log(f"   -- 진행 {n}/{len(todo)} 경과 {(time.time() - t0) / 60:.1f}분 | 토큰 in {u['in']:,} out {u['out']:,} think {u['think']:,} | 누적 약 ${cost(u):.2f}")
    u = ex.usage
    log(f"완료: {n}개, 실패 {fails}, {(time.time() - t0) / 60:.1f}분 | 토큰 in {u['in']:,} out {u['out']:,} think {u['think']:,} | 약 ${cost(u):.2f}")


if __name__ == "__main__":
    main()
