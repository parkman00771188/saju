# -*- coding: utf-8 -*-
"""
전문가 발언 다이제스트: 정제된 자막에서 키(일간·일주·십성·격국·신살·구조·오행·자리×십성·십성 운·신년운세)별로
"실제로 말한 문장"을 골라 영역별로 정리한다.
  - 필러 제거, 홍보·인사 문장 제외, 명리 용어+주장/영역 키워드가 있는 문장만, 근사 중복 제거
  - 출력: saju-site/public/kb_digest.json  { key: { 영역: [문장...] } }
"""
import io, os, re, sys, json, math, collections

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_kb as KB  # noqa: E402

ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "saju-site", "public", "kb_digest.json")

FILLER = re.compile(r"(?<![가-힣])(어|음|아|자|뭐|이제|그니까|그러니까|근데|약간|좀|막|되게|진짜|그냥|자꾸|이게|저기|아니|네|예|응|어떤|이런|그런|어찌|여러분들?|자기가)(?![가-힣])")
TAGS = re.compile(r"\[[^\]]{1,8}\]|>>|&gt;|&lt;|&amp;")
PROMO = re.compile(r"구독|좋아요|댓글|링크|어플|앱을|프로필|채널|영상에서|다음 시간|이번 시간|오늘은|안녕하|인사드|눌러|포스텔러|광고|후원|멤버십|공유|알림|만세력을|사연|상담 신청|문의|카톡|톡으로|디엠|DM")
QUESTION = re.compile(r"(궁금하죠|그렇죠|맞죠|아시죠|아세요|볼까요|알려 줄게|알려드릴게|해 볼게요)\s*[?.!]?$")
EXCLUDE = re.compile(r"제가|저는|저희|우리 |내가 |감사합니다|여사님|선생님|님이|님은|님 |씨가|씨는|씨의|걱정이 많습니다|준비 중인데|에피소드|다음 편|캘린더|준비해 볼|매달마다|스포|참고하시면|같이 준비|여러분들에게|말씀드리고 싶었|말씀드리면|추천하는|알려드릴|보여드릴|해 드리면|도화도르|스탠|오사주|연예인|아이돌|BTS|방탄|아이브|세븐틴|장원영|미연|사연|댓글|질문|궁금합니다|인가요|주세요|드릴게요|볼게요|해볼까|들어보|보내 주|시청|채널|영상|구독|\?")
DEICTIC = re.compile(r"요거|요런|요게|이거|저거|그거|이것들|저런|그런 식|이런 식|아까|앞서|말씀드린|말씀드렸|위에서|위 표|여기서|이때|그때는|있니다|거든나요|되거든나|합격원|그거는|저건|이건")
FRAG_START = re.compile(r"^(싫|싶|그래가지고|거든|볼 수|있습니다|없습니다|해서 |해야|이라면|라면|다음은|그렇다는 말은|그 얘기는|그만큼|동시에|사실 |근데|하지만|그리고|또 |또이|또는|이 |그 |저 |것들|분들 |같은 경우|경우에는|때문에|이렇게|그렇게)")
DECL = re.compile(r"(다|요|죠|니다|에요|예요|거든요|잖아요|습니다|됩니다|합니다|입니다|있어요|없어요|해요|돼요)\.$")
EXPLAIN = re.compile(r"특징|경향|편이|편입니다|기질|성향|수 있|기 쉽|경우가 많|많습니다|많아요|합니다|됩니다|의미|뜻하|상징|해당|자리|사람은|사람들은|분들은|하면|있으면|강하면|많으면|없으면")
TERM = re.compile("|".join(sorted({re.escape(w) for w in """사주 팔자 일간 일주 월지 월간 년주 시주 시지 년지 일지 천간 지지 지장간 대운 세운 월운 용신 기신 희신 격국 신강 신약 조후 통근 투출
비견 겁재 식신 상관 편재 정재 편관 정관 편인 정인 비겁 식상 재성 관성 인성 칠살 관살
갑목 을목 병화 정화 무토 기토 경금 신금 임수 계수 자수 축토 인목 묘목 진토 사화 오화 미토 신금 유금 술토 해수 목 화 토 금 수 오행
장생 목욕 관대 건록 제왕 쇠지 병지 사지 묘지 절지 태지 양지
역마 도화 홍염 화개 백호 괴강 양인 천을귀인 태극귀인 문창 학당 천덕 월덕 복성 금여 귀문관살 원진 공망 고란 현침 간여지동 삼재 겁살 재살 천살 지살 월살 망신 장성 반안 육해
합 충 형 파 해 육합 삼합 방합 상충 원국 운 띠 년생 신년운세 운세 병오년 을사년 갑진년 정미년""".split()}, key=len, reverse=True)))
YEAR_HINT = re.compile(r"20\d\d|\d\d년|올해|내년|상반기|하반기|\d{1,2}월|이번 달|이달|연말|연초|봄|여름|가을|겨울")
TTI_NAME = {v: k for k, v in KB.TTI.items()}
STEM_NAME = {v: k for k, v in KB.STEM_TITLE.items()}


def sentences(text):
    t = TAGS.sub(" ", text)
    t = re.sub(r"\s+", " ", t).strip()
    parts = re.split(r"(?<=[.?!])\s+|(?<=[요다죠까])\s+(?=[가-힣\"'(])", t)
    out = []
    for p in parts:
        p = p.strip()
        if not p:
            continue
        if out and len(p) < 12:
            out[-1] = out[-1] + " " + p
        else:
            out.append(p)
    return out


def clean(s):
    s = FILLER.sub(" ", s)
    s = re.sub(r"\s+", " ", s).strip(" ,.")
    s = re.sub(r"^(그래서|그리고|그러면|그런데|그럼|또|또는|왜냐면|왜냐하면)\s+", "", s)
    if s and s[-1] not in ".!?":
        s += "."
    return s


def build():
    docs = KB.load_docs()
    cats = {k: re.compile("|".join(map(re.escape, v))) for k, v in KB.CATEGORIES.items()}
    claim_rx = {label: re.compile("|".join(v[2])) for label, v in KB.CLAIMS.items()}
    claim_cat = {label: v[0] for label, v in KB.CLAIMS.items()}
    # 전역 토큰 빈도(ASR 잡음 판별용)
    gtf = collections.Counter()
    for d in docs:
        gtf.update(re.findall(r"[가-힣]{2,6}", d["text"]))
    def rare_ratio(t):
        tk = re.findall(r"[가-힣]{2,6}", t)
        return (sum(1 for w in tk if gtf[w] < 3) / len(tk)) if tk else 1.0
    # 문장 인덱스
    doc_sents = []
    for d in docs:
        ss = []
        for s in sentences(d["text"]):
            if PROMO.search(s) or "�" in s:
                continue
            c = clean(s)
            if not (30 <= len(c) <= 110):
                continue
            if QUESTION.search(c) or EXCLUDE.search(c) or DEICTIC.search(c) or FRAG_START.search(c) or not DECL.search(c):
                continue
            if len(re.findall(r"일주|일간", c)) >= 3 or rare_ratio(c) > 0.08 or len(c) > 100:
                continue
            if not TERM.search(c):
                continue
            labels = [l for l, rx in claim_rx.items() if rx.search(c)]
            cat_hits = {k: len(rx.findall(c)) for k, rx in cats.items()}
            cat_hits = {k: v for k, v in cat_hits.items() if v}
            if not labels and not cat_hits:
                continue
            score = len(labels) * 1.2 + sum(cat_hits.values()) * 0.6 + (0.6 if YEAR_HINT.search(c) else 0) + min(len(TERM.findall(c)), 4) * 0.3 + min(len(EXPLAIN.findall(c)), 3) * 0.5 - rare_ratio(c) * 4 - (0.6 if len(c) > 95 else 0)
            # 영역 결정: 카테고리 키워드 최다 → 없으면 주장 라벨의 영역
            if cat_hits:
                cat = max(cat_hits.items(), key=lambda x: x[1])[0]
            else:
                cat = claim_cat[labels[0]] if labels else "전체"
            if cat in ("가족", "운"):
                cat = "전체"
            ss.append({"t": c, "score": round(score, 2), "cat": cat, "labels": labels})
        doc_sents.append(ss)
    print("문장 인덱스 완료: %d문장" % sum(len(x) for x in doc_sents))

    # 키 사전
    keys = {}
    for name, dic in (("concepts", KB.CONCEPTS), ("patterns", KB.PATTERNS)):
        for key, rx in KB.compile_dict(dic).items():
            keys[key] = rx
    # 신년운세 키(제목 기반) — 문서 단위로 전체 문장 사용, 총정리 영상은 분절
    year_docs = collections.defaultdict(list)
    for di, d in enumerate(docs):
        y = KB.year_of(d["title"], d.get("upload", ""))
        if not y:
            continue
        t = d["title"]
        stems_t = [st for ko, st in KB.STEM_TITLE.items() if ko in t or (KB.STEM_KO[st] + " 일간") in t or (KB.STEM_KO[st] + "일간") in t]
        ttis_t = [br for ko, br in KB.TTI.items() if (ko + "띠") in t]
        roundup = bool(KB.ROUNDUP_RX.search(t)) or len(stems_t) >= 3 or len(ttis_t) >= 3
        year_docs["Y%d" % y].append((di, None))
        if roundup:
            segs = KB.segment_by(d["text"], KB.STEM_HEAD_RX, lambda ko: KB.STEM_TITLE.get(ko))
            for st, seg in segs.items():
                if st: year_docs["%s+Y%d" % (st, y)].append((di, seg))
            tsegs = KB.segment_by(d["text"], KB.TTI_HEAD_RX, lambda ko: KB.TTI.get(ko))
            for br, seg in tsegs.items():
                if br: year_docs["%s+Y%d" % (br, y)].append((di, seg))
            if not segs and not tsegs:
                for st in stems_t: year_docs["%s+Y%d" % (st, y)].append((di, None))
                for br in ttis_t: year_docs["%s+Y%d" % (br, y)].append((di, None))
        else:
            for st in stems_t: year_docs["%s+Y%d" % (st, y)].append((di, None))
            for br in ttis_t: year_docs["%s+Y%d" % (br, y)].append((di, None))

    def toks(s):
        return set(re.findall(r"[가-힣]{2,}", s))

    def select(cands, per_cat=3, overall=4, cap=14):
        cands = sorted(cands, key=lambda x: -x["score"])
        chosen, seen = {}, []
        def ok(c):
            tk = toks(c["t"])
            for s in seen:
                inter = len(tk & s)
                if inter and inter / max(1, min(len(tk), len(s))) > 0.6:
                    return False
            return True
        for c in cands:
            if len(chosen.get(c["cat"], [])) >= per_cat or not ok(c):
                continue
            chosen.setdefault(c["cat"], []).append(c["t"]); seen.append(toks(c["t"]))
        allc = [c for c in cands if ok(c)][:overall]
        if allc:
            chosen["전체"] = (chosen.get("전체", []) + [c["t"] for c in allc])[:overall + per_cat]
            for c in allc: seen.append(toks(c["t"]))
        total = sum(len(v) for v in chosen.values())
        if total > cap:
            for k in list(chosen):
                chosen[k] = chosen[k][:max(1, math.floor(len(chosen[k]) * cap / total))]
        return chosen

    out = {}
    # 개념·패턴 키
    for ki, (key, rx) in enumerate(keys.items()):
        cands = []
        for di, d in enumerate(docs):
            if not rx.search(d["text"]):
                continue
            for s in doc_sents[di]:
                m = rx.search(s["t"])
                if m and s["score"] >= 2.4 and re.match(r"\s?(은|는|이|가|의|을|를|과|와|이라|으로|에서|에|도|들|분들|일간|일주|살|격|운|이란|이면|하면|일 때|이 있|가 있)", s["t"][m.end():m.end() + 6]):
                    cands.append(s)
        if len(cands) >= 3:
            out[key] = select(cands, per_cat=2, overall=3, cap=10)
        if ki % 60 == 0:
            print("  keys %d/%d" % (ki, len(keys)))
    # 신년운세 키
    for key, ents in year_docs.items():
        cands = []
        for di, seg in ents:
            for s in doc_sents[di]:
                if seg is not None and s["t"][:30] not in seg and s["t"] not in seg:
                    continue
                if (YEAR_HINT.search(s["t"]) or s["labels"]) and s["score"] >= 2.0:
                    cands.append(dict(s, score=s["score"] + (0.8 if YEAR_HINT.search(s["t"]) else 0)))
        if len(cands) >= 3:
            out[key] = select(cands, per_cat=2, overall=4, cap=12)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with io.open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    n_sent = sum(len(v) for k in out.values() for v in k.values())
    print("완료: %s (%.0f KB) 키 %d개 · 문장 %d개" % (OUT, os.path.getsize(OUT) / 1024, len(out), n_sent))
    # 리포트 샘플
    with io.open(os.path.join(HERE, "digest_report.md"), "w", encoding="utf-8") as f:
        f.write("# 전문가 발언 다이제스트 샘플\n\n")
        for key in ["甲", "甲寅", "정인", "정인격", "도화", "귀문관살", "재다신약", "월지+정인", "정관운", "庚+Y2026", "午+Y2026", "Y2026", "火과다"]:
            if key in out:
                f.write("## %s\n" % key)
                for cat, ss in out[key].items():
                    f.write("- **%s**\n" % cat)
                    for s in ss: f.write("  - %s\n" % s)
                f.write("\n")


if __name__ == "__main__":
    build()
