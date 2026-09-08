# -*- coding: utf-8 -*-
"""ASR 오탈자 후보 채굴: 말뭉치의 빈출 토큰 중 명리 용어와 자모 편집거리 1~2인 것을 찾아 출력한다."""
import io, os, re, collections, json, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")

VOCAB = set("""사주 팔자 사주팔자 일간 일주 월지 월간 년주 시주 시지 년지 일지 천간 지지 지장간 대운 세운 월운 용신 기신 희신 구신 한신 격국 신강 신약 중화 조후 억부 통근 투출
비견 겁재 식신 상관 편재 정재 편관 정관 편인 정인 비겁 식상 재성 관성 인성 칠살 관살
갑목 을목 병화 정화 무토 기토 경금 신금 임수 계수 자수 축토 인목 묘목 진토 사화 오화 미토 신금 유금 술토 해수
목화 화토 토금 금수 수목 목극토 토극수 수극화 화극금 금극목 목생화 화생토 토생금 금생수 수생목
장생 목욕 관대 건록 제왕 쇠지 병지 사지 묘지 절지 태지 양지
역마 역마살 도화 도화살 홍염 홍염살 화개 화개살 백호 백호대살 괴강 괴강살 양인 양인살 천을귀인 태극귀인 문창귀인 학당귀인 천덕귀인 월덕귀인 복성귀인 금여록 귀문관살 원진살 원진 공망 고란살 현침살 간여지동 평두살 겁살 재살 천살 지살 월살 망신살 장성살 반안살 육해살 삼재 백호살
정관격 편관격 정재격 편재격 식신격 상관격 정인격 편인격 건록격 양인격 월겁격
식신제살 상관견관 관살혼잡 재다신약 인다신약 군겁쟁재 재생관 관인상생 살인상생 탐재괴인 상관패인 식신생재 상관생재 재관쌍미 무재 무관 무인성 무식상 무비겁
육합 삼합 방합 상충 형살 파살 해살 원진살 자형 삼형 상형 합충 형충
갑자 을축 병인 정묘 무진 기사 경오 신미 임신 계유 갑술 을해 병자 정축 무인 기묘 경진 신사 임오 계미 갑신 을유 병술 정해 무자 기축 경인 신묘 임진 계사 갑오 을미 병신 정유 무술 기해 경자 신축 임인 계묘 갑진 을사 병오 정미 무신 기유 경술 신해 임자 계축 갑인 을묘 병진 정사 무오 기미 경신 신유 임술 계해
신년운세 운세 명리 명리학 궁합 배우자 자식 부모 형제 상사 동료""".split())

CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"
JUNG = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ"
JONG = " ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ"

def jamo(s):
    out = []
    for ch in s:
        c = ord(ch) - 0xAC00
        if 0 <= c < 11172:
            out += [CHO[c // 588], JUNG[(c % 588) // 28], JONG[c % 28].strip() or "-"]
        else:
            out.append(ch)
    return out

def lev(a, b):
    if abs(len(a) - len(b)) > 3: return 9
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]

def load_texts():
    for ch in sorted(os.listdir(DATA)):
        d = os.path.join(DATA, ch)
        if not os.path.isdir(d): continue
        for tab in ("videos", "shorts"):
            p = os.path.join(d, tab)
            if not os.path.isdir(p): continue
            for f in os.listdir(p):
                if f.endswith(".txt"):
                    raw = io.open(os.path.join(p, f), encoding="utf-8").read()
                    yield raw.split("-" * 60, 1)[-1]

PARTICLE = re.compile(r"(이에요|예요|입니다|거든요|잖아요|습니다|니다|으로|에서|한테|이랑|까지|부터|처럼|보다|에게|께서|이나|이다|이라|라고|하고|이고|이면|는데|은데|들이|들은|들의|들을|이|가|은|는|을|를|의|에|도|로|과|와|만|나|랑|든|요|죠|고|서)$")

def main():
    tf = collections.Counter()
    ctx = {}
    for text in load_texts():
        for m in re.finditer(r"[가-힣]{2,6}", text):
            w = m.group()
            w2 = PARTICLE.sub("", w) if len(w) > 2 else w
            if len(w2) < 2: continue
            tf[w2] += 1
            if w2 not in ctx: ctx[w2] = text[max(0, m.start() - 25):m.end() + 25].replace("\n", " ")
    vj = {v: jamo(v) for v in VOCAB}
    cands = []
    for w, n in tf.items():
        if n < 4 or w in VOCAB: continue
        wj = jamo(w)
        best = None
        for v, j in vj.items():
            if abs(len(v) - len(w)) > 1: continue
            d = lev(wj, j)
            thr = 1 if len(v) <= 2 else 2
            if d <= thr and (best is None or d < best[0]): best = (d, v)
        if best: cands.append((n, w, best[1], best[0], ctx[w]))
    cands.sort(reverse=True)
    out = os.path.join(ROOT, "analysis", "asr_candidates.tsv")
    with io.open(out, "w", encoding="utf-8") as f:
        f.write("count\ttoken\tvocab\tdist\tcontext\n")
        for n, w, v, d, c in cands:
            f.write("%d\t%s\t%s\t%d\t%s\n" % (n, w, v, d, c))
    print("candidates:", len(cands), "->", out)
    for n, w, v, d, c in cands[:int(sys.argv[1]) if len(sys.argv) > 1 else 120]:
        print("%5d  %-8s -> %-8s d=%d | %s" % (n, w, v, d, c[:70]))

if __name__ == "__main__":
    main()
