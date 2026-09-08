# -*- coding: utf-8 -*-
"""
크롤링된 자막 원문(data/<채널>/{videos,shorts}/*.txt)을 Gemini로 문맥 교정해 제자리에 덮어쓴다.

- ASR 오인식(구사들이→94년생들이, 귀문 관사→귀문관살 …)을 문맥에 맞게 복원
- 짧게 끊긴 자막 줄을 문장·문단으로 정리, [음악] 같은 태그·군말 제거
- 요약·의역 금지(길이 비율로 검증), 헤더(제목/ID/URL …)는 그대로 유지
- analysis/rewrite_manifest.json 에 처리 결과를 기록 → 중단 후 재실행하면 이어서 진행
- 원본은 git 이력(교정 전 커밋)에 남아 있으므로 별도 백업은 만들지 않는다

사용:
  python analysis/rewrite_transcripts.py                        # 전체(미처리분만)
  python analysis/rewrite_transcripts.py --limit 3 --out <폴더>   # 미리보기(원본 안 건드림)
  python analysis/rewrite_transcripts.py --workers 8
  python analysis/rewrite_transcripts.py --status               # 진행 상황만 출력
"""
import argparse, glob, hashlib, io, json, os, re, sys, threading, time
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
MANIFEST = os.path.join(ROOT, "analysis", "rewrite_manifest.json")
LOG = os.path.join(ROOT, "analysis", "rewrite_log.txt")
SEP = "-" * 60
MODEL = os.environ.get("REWRITE_MODEL", "gemini-3.8-flash")
CHUNK = 7000          # 본문이 이보다 길면 줄 경계에서 잘라 여러 번 호출
RATIO_MIN, RATIO_MAX = 0.55, 1.35

SYSTEM = """당신은 한국어 유튜브 자동 자막(ASR) 교정 전문가이며 사주·명리학 용어에 정통합니다.
입력은 사주 강의 영상의 자동 생성 자막입니다. 아래 규칙으로 교정한 본문만 출력하세요.

1. 잘못 인식된 말은 문맥으로 원래 말을 복원합니다. 예) 구사들이→94년생들이, 귀문 관사→귀문관살, 왕내한다→왕래한다, 감여지동→간여지동, 개핵→계해, 현관→편관, 정제→정재, 비견 겹재→비견 겁재, 사주 발자→사주팔자, 병원→병오년(연도 문맥일 때), 대운·세운·월운, 일간·일주·월지·시주 등.
2. 표준 표기: 천간(갑·을·병·정·무·기·경·신·임·계), 지지(자·축·인·묘·진·사·오·미·신·유·술·해), 육십갑자(갑자·을축…, 병오년·정미년), 십성(비견·겁재·식신·상관·편재·정재·편관·정관·편인·정인), 신살(귀문관살·도화살·역마살·백호살·양인살·화개살·괴강살·천을귀인·원진·공망·형충파해), 격국·용신·희신·기신·구신·한신, 신강·신약, 12운성(장생·목욕·관대·건록·제왕·쇠·병·사·묘·절·태·양).
3. 짧게 끊긴 자막 줄은 자연스러운 문장으로 이어 붙이고 마침표·쉼표를 넣습니다. 의미 단위로 문단을 나누되(문단 사이 빈 줄 하나) 문단은 3~6문장 정도로 합니다.
4. [음악] [박수] [웃음] 같은 자막 태그, '어', '음', '그', 말 더듬 반복은 제거합니다.
5. 요약·생략·추가·의역·순서 변경 금지. 말투(존댓말/반말), 농담, 광고·인사말도 그대로 두고 교정만 합니다. 내용 길이는 원문과 거의 같아야 합니다.
6. 확신이 없는 단어는 원문대로 둡니다. 숫자·연도·나이·이름은 문맥상 확실할 때만 고칩니다.
7. 출력은 교정된 본문만. 머리말·설명·따옴표·코드블록·마크다운 금지."""

_lock = threading.Lock()


def sha(s):
    return hashlib.sha1(s.encode("utf-8")).hexdigest()[:12]


def load_key():
    k = os.environ.get("GEMINI_API_KEY", "").strip()
    if not k and os.path.exists(os.path.join(ROOT, ".env")):
        m = re.search(r"GEMINI_API_KEY\s*=\s*\"?([^\"\r\n]+)", io.open(os.path.join(ROOT, ".env"), encoding="utf-8").read())
        k = m.group(1).strip() if m else ""
    if not k:
        sys.exit("GEMINI_API_KEY 가 없습니다 (.env 에 GEMINI_API_KEY=... 를 넣어 주세요)")
    return k


def load_manifest():
    if os.path.exists(MANIFEST):
        try:
            return json.load(io.open(MANIFEST, encoding="utf-8"))
        except Exception:
            pass
    return {}


def save_manifest(m):
    tmp = MANIFEST + ".tmp"
    io.open(tmp, "w", encoding="utf-8").write(json.dumps(m, ensure_ascii=False, indent=0, sort_keys=True))
    for i in range(6):   # Windows: 백신·인덱서가 잠깐 잠그면 PermissionError → 잠시 후 재시도
        try:
            os.replace(tmp, MANIFEST); return
        except PermissionError:
            time.sleep(0.3 * (i + 1))
    os.replace(tmp, MANIFEST)


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


def split_doc(raw):
    if SEP not in raw:
        return None, raw
    h, b = raw.split(SEP, 1)
    return h + SEP, b.strip("\r\n")


def title_of(header):
    m = re.search(r"^제목:\s*(.*)$", header or "", re.M)
    return m.group(1).strip() if m else ""


def chunks_of(body):
    if len(body) <= CHUNK:
        return [body]
    lines, out, cur, n = body.splitlines(), [], [], 0
    for ln in lines:
        cur.append(ln)
        n += len(ln) + 1
        if n >= CHUNK:
            out.append("\n".join(cur)); cur, n = [], 0
    if cur:
        out.append("\n".join(cur))
    return out


def norm(s):
    s = re.sub(r"\[[^\]]{1,10}\]", "", s)
    return re.sub(r"\s+", "", s)


def hangul_ratio(s):
    s2 = re.sub(r"\s+", "", s)
    return (len(re.findall(r"[가-힣]", s2)) / len(s2)) if s2 else 0


def clean_out(t):
    t = t.strip()
    t = re.sub(r"^```[a-z]*\s*|\s*```$", "", t).strip()
    t = re.sub(r"^(교정된? ?본문|교정 결과|출력)\s*[:：]\s*", "", t).strip()
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t


class Rewriter:
    def __init__(self, key):
        from google import genai
        from google.genai import types
        self.types = types
        self.client = genai.Client(api_key=key)
        self.usage = {"in": 0, "out": 0, "think": 0, "calls": 0}

    def _cfg(self, temperature):
        t = self.types
        kw = dict(system_instruction=SYSTEM, temperature=temperature, max_output_tokens=32000)
        try:
            kw["thinking_config"] = t.ThinkingConfig(thinking_level="low")
            return t.GenerateContentConfig(**kw)
        except Exception:
            kw.pop("thinking_config", None)
            return t.GenerateContentConfig(**kw)

    def call(self, prompt, temperature=0.2):
        delay = 4
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
                    time.sleep(delay); delay = min(delay * 2, 90)
                    continue
                raise

    def fix_chunk(self, title, chunk, idx, total, prev_tail):
        ctx = f"[영상 제목] {title}\n" if title else ""
        if total > 1:
            ctx += f"[안내] 긴 강의 자막의 {idx + 1}/{total} 부분입니다. 이 부분만 교정해 출력하세요.\n"
            if prev_tail:
                ctx += f"[직전 부분 끝(참고용, 출력 금지)] …{prev_tail}\n"
        prompt = ctx + "\n[교정할 자막]\n" + chunk
        for temp in (0.2, 0.5):
            out = clean_out(self.call(prompt, temp))
            a, b = len(norm(chunk)), len(norm(out))
            ratio = b / a if a else 1
            if RATIO_MIN <= ratio <= RATIO_MAX and hangul_ratio(out) >= 0.45 and b > 0:
                return out, ratio, True
            log(f"   재시도: 길이비 {ratio:.2f} 한글비 {hangul_ratio(out):.2f} (chunk {idx + 1}/{total})")
        return chunk, 1.0, False   # 검증 실패 → 원문 유지

    def fix_body(self, title, body):
        parts = chunks_of(body)
        outs, ratios, ok_all, prev = [], [], True, ""
        for i, ch in enumerate(parts):
            o, r, ok = self.fix_chunk(title, ch, i, len(parts), prev)
            outs.append(o); ratios.append(r); ok_all = ok_all and ok
            prev = re.sub(r"\s+", " ", o)[-300:]
        return "\n\n".join(outs), (sum(ratios) / len(ratios)), ok_all, len(parts)


def process(rw, path, manifest, out_dir):
    rel = os.path.relpath(path, ROOT).replace("\\", "/")
    raw = io.open(path, encoding="utf-8").read()
    header, body = split_doc(raw)
    if header is None or not body.strip():
        return rel, "skip(형식)", None
    cur = sha(raw)
    rec = manifest.get(rel)
    if rec and rec.get("sha_out") == cur and out_dir is None:
        return rel, "done(이미)", None
    t0 = time.time()
    new_body, ratio, ok, nparts = rw.fix_body(title_of(header), body)
    new_raw = header + "\n\n" + new_body.strip() + "\n"
    if out_dir is not None:
        dst = os.path.join(out_dir, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        io.open(dst, "w", encoding="utf-8", newline="\n").write(new_raw)
    else:
        tmp = path + ".tmp"
        io.open(tmp, "w", encoding="utf-8", newline="\n").write(new_raw)
        os.replace(tmp, path)
        with _lock:
            manifest[rel] = {"sha_in": cur, "sha_out": sha(new_raw), "model": MODEL, "ratio": round(ratio, 3), "ok": ok, "parts": nparts, "chars": len(body), "ts": time.strftime("%Y-%m-%d %H:%M")}
            save_manifest(manifest)
    return rel, ("ok" if ok else "partial"), (ratio, time.time() - t0, nparts)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--out", default=None, help="미리보기: 원본 대신 이 폴더에 결과 저장")
    ap.add_argument("--paths", nargs="*", default=None)
    ap.add_argument("--status", action="store_true")
    a = ap.parse_args()
    files = a.paths or all_files()
    manifest = load_manifest()
    if a.status:
        done = [r for r in manifest.values() if r.get("sha_out")]
        print(f"처리 {len(done)}/{len(files)} | partial {sum(1 for r in done if not r.get('ok'))} | 평균 길이비 {sum(r['ratio'] for r in done) / max(1, len(done)):.3f}")
        return
    todo = []
    for p in files:
        rel = os.path.relpath(p, ROOT).replace("\\", "/")
        if a.out is None and rel in manifest and manifest[rel].get("sha_out") == sha(io.open(p, encoding="utf-8").read()):
            continue
        todo.append(p)
    if a.limit:
        todo = todo[: a.limit]
    log(f"대상 {len(todo)}개 (전체 {len(files)}, 이미 처리 {len(files) - len(todo)}) model={MODEL} workers={a.workers}")
    rw = Rewriter(load_key())
    t0, n, fails = time.time(), 0, 0
    with ThreadPoolExecutor(max_workers=a.workers) as ex:
        futs = {ex.submit(process, rw, p, manifest, a.out): p for p in todo}
        for f in as_completed(futs):
            n += 1
            try:
                rel, st, info = f.result()
                extra = f" 길이비 {info[0]:.2f} {info[1]:.0f}s parts {info[2]}" if info else ""
                log(f"[{n}/{len(todo)}] {st} {rel[-70:]}{extra}")
            except Exception as e:
                fails += 1
                log(f"[{n}/{len(todo)}] FAIL {os.path.relpath(futs[f], ROOT)[-70:]} :: {str(e)[:160]}")
            if n % 25 == 0:
                u = rw.usage
                log(f"   -- 진행 {n}/{len(todo)} 경과 {(time.time() - t0) / 60:.1f}분 | 토큰 in {u['in']:,} out {u['out']:,} think {u['think']:,} calls {u['calls']}")
    u = rw.usage
    log(f"완료: {n}개, 실패 {fails}, {(time.time() - t0) / 60:.1f}분 | 토큰 in {u['in']:,} out {u['out']:,} think {u['think']:,}")


if __name__ == "__main__":
    main()
