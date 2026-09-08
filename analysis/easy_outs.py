# -*- coding: utf-8 -*-
"""
지식 색인(saju-site/public/kb_claims.json)에 들어가는 결과 문장(outs)·조언(advice)을
사주 용어를 모르는 일반 사용자도 읽을 수 있는 쉬운 문장으로 다시 쓴다 (Gemini, thinking low).

  - 뜻은 바꾸지 않고, 전문 용어(십성·신살·오행·자리 이름)는 쉬운 말로 풀거나 짧게 설명
  - '~함/~됨/~음' 같은 메모식 끝맺음을 자연스러운 해요체 한 문장으로
  - 결과는 analysis/easy_outs.json 에 {원문: 쉬운 문장} 으로 쌓이며, 재실행하면 새 문장만 처리
  - build_knowledge.py 가 이 매핑을 읽어 앱 JSON 에 적용한다 (다이제스트는 원문 유지)

사용: python analysis/easy_outs.py [--workers 8] [--batch 40] [--limit N]
"""
import argparse, io, json, os, re, sys, threading, time
from concurrent.futures import ThreadPoolExecutor, as_completed

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
APP_JSON = os.path.join(ROOT, "saju-site", "public", "kb_claims.json")
CACHE = os.path.join(HERE, "easy_outs.json")
LOG = os.path.join(HERE, "easy_outs_log.txt")
MODEL = os.environ.get("EASY_MODEL", "gemini-3.8-flash")

SYSTEM = """당신은 사주 상담 내용을 일반인에게 쉽게 풀어 쓰는 편집자입니다.
입력은 사주 강의에서 뽑은 짧은 결과·조언 문장들(전문 용어, 메모식 끝맺음 포함)입니다. 각 문장을 다음 규칙으로 다시 써서, 입력과 같은 개수·같은 순서의 JSON 문자열 배열로만 출력하세요.

1. 뜻을 바꾸거나 빼거나 보태지 않습니다. 시기(2026년 5월, 30대 등)·숫자·대상(남편, 상사, 자식 등)은 그대로 둡니다.
2. 전문 용어는 쉬운 말로 바꾸거나 괄호로 아주 짧게 풀어 줍니다. 예)
   식상→표현·재능 기운, 재성→돈·현실 기운, 관성/관살→직장·책임·규칙 기운, 인성→배움·문서·어머니 기운, 비겁→나와 같은 기운(형제·동료·경쟁),
   일간→나를 나타내는 글자, 일지/배우자궁→배우자 자리, 월지→사회 무대 자리, 시지→말년·자식 자리, 년지→집안·초년 자리,
   조열→뜨겁고 마른 기운, 습→차고 축축한 기운, 충→글자가 부딪힘, 합→글자가 묶임, 원진→이유 없는 서운함, 귀문→예민한 감각,
   도화→매력의 별, 역마→이동의 별, 화개→깊고 고독한 별, 백호·양인→강하고 날카로운 별, 대운→10년 단위의 큰 운, 세운→그해의 운,
   신강→나의 힘이 센, 신약→나의 힘이 약한, 용신→내게 필요한 기운, 기신→내게 부담되는 기운, 지장간→글자 속에 숨은 기운.
   천간·지지 글자 이름(갑목, 오화 …)은 '목 기운', '불 기운'처럼 오행으로 풀어 줍니다.
3. 메모식 표현('~함', '~됨', '~음', '~기 쉬움', 명사 나열)은 자연스러운 해요체 한 문장으로 바꿉니다. 예) '주변 사람들과 마찰이 생기기 쉬움' → '주변 사람들과 부딪히는 일이 생기기 쉬워요'.
   조언·명령 문장은 부드러운 권유로('~해 보세요', '~하는 게 좋아요').
4. 20~60자, 한 문장. 너무 단정적인 표현은 '~하기 쉬워요', '~하는 편이에요', '~할 수 있어요'처럼 경향으로 표현합니다.
5. 출력은 JSON 배열만. 설명·번호·머리말 금지."""

_lock = threading.Lock()


def log(msg):
    line = time.strftime("%H:%M:%S ") + msg
    with _lock:
        print(line, flush=True)
        try:
            io.open(LOG, "a", encoding="utf-8").write(line + "\n")
        except Exception:
            pass


def load_key():
    k = os.environ.get("GEMINI_API_KEY", "").strip()
    if not k and os.path.exists(os.path.join(ROOT, ".env")):
        m = re.search(r"GEMINI_API_KEY\s*=\s*\"?([^\"\r\n]+)", io.open(os.path.join(ROOT, ".env"), encoding="utf-8").read())
        k = m.group(1).strip() if m else ""
    if not k:
        sys.exit("GEMINI_API_KEY 가 없습니다 (.env)")
    return k


def collect_strings():
    a = json.load(io.open(APP_JSON, encoding="utf-8"))
    s = set()
    for p in a["by_key"].values():
        for it in p["items"]:
            for o in it.get("outs", []):
                if o and len(o) >= 4:
                    s.add(o)
            if it.get("advice") and len(it["advice"]) >= 4:
                s.add(it["advice"])
    return sorted(s)


class Rewriter:
    def __init__(self, key):
        from google import genai
        from google.genai import types
        self.types = types
        self.client = genai.Client(api_key=key)
        self.usage = {"in": 0, "out": 0, "think": 0, "calls": 0}

    def call(self, batch, temperature=0.3):
        t = self.types
        cfg = t.GenerateContentConfig(system_instruction=SYSTEM, temperature=temperature, max_output_tokens=8000,
                                      response_mime_type="application/json", response_json_schema={"type": "array", "items": {"type": "string"}},
                                      thinking_config=t.ThinkingConfig(thinking_level="low"))
        prompt = "다음 %d개 문장을 규칙대로 다시 써 주세요.\n%s" % (len(batch), json.dumps(batch, ensure_ascii=False))
        delay = 4
        for attempt in range(6):
            try:
                r = self.client.models.generate_content(model=MODEL, contents=prompt, config=cfg)
                u = r.usage_metadata
                with _lock:
                    self.usage["calls"] += 1; self.usage["in"] += u.prompt_token_count or 0
                    self.usage["out"] += u.candidates_token_count or 0; self.usage["think"] += u.thoughts_token_count or 0
                arr = json.loads(r.text or "[]")
                if isinstance(arr, list) and len(arr) == len(batch) and all(isinstance(x, str) for x in arr):
                    return arr
                raise ValueError("길이 불일치 %d≠%d" % (len(arr) if isinstance(arr, list) else -1, len(batch)))
            except Exception as e:
                msg = str(e)
                if attempt == 5:
                    raise
                if any(k in msg for k in ("429", "RESOURCE_EXHAUSTED", "503", "UNAVAILABLE", "500", "INTERNAL", "504", "timeout", "overloaded")):
                    time.sleep(delay); delay = min(delay * 2, 60)
                else:
                    temperature = 0.5   # 길이 불일치·JSON 오류 → 온도 바꿔 재시도
        return None


def ok_pair(src, dst):
    d = (dst or "").strip()
    if not d or len(d) < 6 or len(d) > 120:
        return False
    return 0.5 <= len(d) / max(1, len(src)) <= 3.2


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--batch", type=int, default=40)
    ap.add_argument("--limit", type=int, default=0)
    a = ap.parse_args()
    cache = json.load(io.open(CACHE, encoding="utf-8")) if os.path.exists(CACHE) else {}
    strings = collect_strings()
    todo = [s for s in strings if s not in cache]
    if a.limit:
        todo = todo[: a.limit]
    log("문장 %d개 중 미처리 %d개 (batch %d, workers %d)" % (len(strings), len(todo), a.batch, a.workers))
    rw = Rewriter(load_key())
    batches = [todo[i:i + a.batch] for i in range(0, len(todo), a.batch)]

    def work(batch):
        arr = rw.call(batch)
        if arr is None:
            if len(batch) <= 5:
                return {}
            mid = len(batch) // 2
            return {**work(batch[:mid]), **work(batch[mid:])}
        return {s: d.strip() for s, d in zip(batch, arr) if ok_pair(s, d)}

    done, t0 = 0, time.time()
    with ThreadPoolExecutor(max_workers=a.workers) as ex:
        futs = {ex.submit(work, b): b for b in batches}
        for f in as_completed(futs):
            try:
                res = f.result()
            except Exception as e:
                log("FAIL batch: %s" % str(e)[:160]); res = {}
            with _lock:
                cache.update(res)
                tmp = CACHE + ".tmp"
                io.open(tmp, "w", encoding="utf-8").write(json.dumps(cache, ensure_ascii=False, indent=0, sort_keys=True))
                os.replace(tmp, CACHE)
            done += 1
            if done % 10 == 0 or done == len(batches):
                u = rw.usage
                log("  %d/%d batches | 누적 %d문장 | %.1f분 | in %s out %s think %s | 약 $%.2f" % (done, len(batches), len(cache), (time.time() - t0) / 60, format(u["in"], ","), format(u["out"], ","), format(u["think"], ","), (u["in"] * 0.75 + (u["out"] + u["think"]) * 3.75) / 1e6))
    log("완료: 매핑 %d개" % len(cache))


if __name__ == "__main__":
    main()
