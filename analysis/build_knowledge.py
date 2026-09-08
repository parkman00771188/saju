# -*- coding: utf-8 -*-
"""
extract_knowledge.py 가 만든 analysis/knowledge/**/*.json(영상별 조건→결과 지식)을 모아
  1) saju-site/public/kb_claims.json  : 해석 엔진용 색인 (조건 키 → 결과 라벨별 집계: 횟수·문서 수·리프트·대표 결과 문장·원문 인용·조언)
  2) analysis/knowledge_digest.md     : 사람이 읽는 정리본 (조건별 자주 나오는 결과, 연도·월별 운, 통찰)
을 만든다.

조건 키는 앱(interpret.js)이 쓰는 키와 같은 표기로 정규화한다:
  일간 '甲' · 일주 '甲子' · 띠 '띠=午' · 지지 '午' · 십성 '정관' · 위치 십성 '월지+정관' · 십성 과다/없음 '관성과다'/'무관'
  신살 '도화'·'귀문관살' … · 오행 '火과다'/'火결핍' · 격국 '정관격' · 신강/신약 · 구조 '관인상생' · 합충 '子午충'
  12운성 '제왕' · 대운 '정관운'/'대운=丙午' · 세운 'Y2026'/'세운=丙午' · 월운 'Y2026-12'/'월운=庚子' · 나이 '나이=30대' · 성별 '성별=여'
두 조건이 함께 걸린 주장은 'A&B' 짝 키에도 색인해 조합 해석에 쓴다.
"""
import collections, glob, io, json, os, re, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
KDIR = os.path.join(HERE, "knowledge")
OUT_APP = os.path.join(ROOT, "saju-site", "public", "kb_claims.json")
OUT_MD = os.path.join(HERE, "knowledge_digest.md")
EASY = os.path.join(HERE, "easy_outs.json")   # easy_outs.py 가 만든 {전문 문장: 쉬운 문장}
MAX_ITEMS = int(os.environ.get("KB_MAX_ITEMS", "10"))       # 키당 앱에 싣는 결과 라벨 수(단일 키)
PAIR_ITEMS = int(os.environ.get("KB_PAIR_ITEMS", "6"))       # 짝 키 항목 수
PAIR_MIN_DOCS = int(os.environ.get("KB_PAIR_MIN_DOCS", "4"))  # 짝 키 최소 영상 수(연도 짝 키는 3)
APP_MIN_YEAR = int(time.strftime("%Y"))                      # 앱 색인에는 올해 이후 연도 키만 (지난 신년운세는 다이제스트에만)

STEM = {"갑": "甲", "을": "乙", "병": "丙", "정": "丁", "무": "戊", "기": "己", "경": "庚", "신": "辛", "임": "壬", "계": "癸"}
BRANCH = {"자": "子", "축": "丑", "인": "寅", "묘": "卯", "진": "辰", "사": "巳", "오": "午", "미": "未", "신": "申", "유": "酉", "술": "戌", "해": "亥"}
ANIMAL = {"쥐": "子", "소": "丑", "호랑이": "寅", "범": "寅", "토끼": "卯", "용": "辰", "뱀": "巳", "말": "午", "양": "未", "원숭이": "申", "닭": "酉", "개": "戌", "돼지": "亥"}
EL = {"목": "木", "화": "火", "토": "土", "금": "金", "수": "水", "나무": "木", "불": "火", "흙": "土", "쇠": "金", "물": "水"}
GODS = ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"]
GROUP = {"비견": "비겁", "겁재": "비겁", "식신": "식상", "상관": "식상", "편재": "재성", "정재": "재성", "편관": "관성", "정관": "관성", "편인": "인성", "정인": "인성",
         "비겁": "비겁", "식상": "식상", "재성": "재성", "관성": "관성", "인성": "인성", "관살": "관성", "재": "재성", "관": "관성", "인": "인성"}
NONE_KEY = {"비겁": "무비겁", "식상": "무식상", "재성": "무재", "관성": "무관", "인성": "무인성"}
SINSAL = [  # (정규식, 앱 키)
    (r"귀문", "귀문관살"), (r"백호", "백호대살"), (r"괴강", "괴강"), (r"양인", "양인"), (r"도화", "도화"), (r"홍염", "홍염"), (r"역마", "역마"), (r"화개", "화개"),
    (r"천을\s?귀인", "천을귀인"), (r"태극\s?귀인", "태극귀인"), (r"문창", "문창귀인"), (r"학당", "학당귀인"), (r"천덕", "천덕귀인"), (r"월덕", "월덕귀인"), (r"복성", "복성귀인"),
    (r"원진", "원진살"), (r"공망", "공망"), (r"고란", "고란살"), (r"현침", "현침살"), (r"간여지동", "간여지동"), (r"삼재", "삼재"), (r"금여", "금여록"), (r"평두", "평두살"),
    (r"겁살", "겁살"), (r"재살", "재살"), (r"천살", "천살"), (r"지살", "지살"), (r"월살", "월살"), (r"망신", "망신"), (r"장성", "장성"), (r"반안", "반안"), (r"육해", "육해"),
    (r"년살|연살", "도화"), (r"격각", "격각살"), (r"과숙", "과숙살"), (r"천라지망", "천라지망"), (r"음양차착|음착|양착", "음양차착살"), (r"암록", "암록"), (r"천문", "천문성"), (r"천의", "천의성"), (r"홍란", "홍란살"), (r"천희", "천희"),
    (r"천주", "천주귀인"), (r"황은", "황은대사"), (r"정록", "정록"), (r"고신", "고신살"), (r"문곡", "문곡귀인"), (r"천관", "천관귀인"), (r"천복", "천복귀인"), (r"국인", "국인귀인"), (r"관귀학관|학관", "관귀학관"), (r"천록", "천록"),
]
STAGE = {"장생": "장생", "목욕": "목욕", "관대": "관대", "건록": "건록", "제왕": "제왕", "쇠": "쇠지", "병": "병지", "사": "사지", "묘": "묘지", "절": "절지", "태": "태지", "양": "양지"}
STRUCT = ["식신제살", "상관견관", "관살혼잡", "재다신약", "인다신약", "군겁쟁재", "재생관", "관인상생", "살인상생", "상관패인", "식신생재", "상관생재", "식상생재", "간여지동", "재관쌍미", "신왕재왕", "종격", "종재", "종살", "종강"]
REL = [("삼합", "삼합"), ("방합", "방합"), ("육합", "합"), ("충", "충"), ("형", "형"), ("파", "파"), ("해", "해"), ("원진", "원진"), ("귀문", "귀문"), ("합", "합")]
CAT_APP = {"직장": "직장", "금전": "금전", "연애·결혼": "연애", "건강·수명": "건강", "학업·시험": "학업", "가족·자식": "가족", "성격·기질": "성격", "운세 흐름": "운", "궁합·인간관계": "가족", "개운·조언": "운", "명리 이론": None, "기타": "운"}
GANZHI = [s + b for i in range(60) for s, b in [(list(STEM.values())[i % 10], list(BRANCH.values())[i % 12])]]
CH_NAME = {"FORCETELLERKR": "포스텔러", "dohwadore_saju": "도화도르", "ohsaju": "오사주", "stan4pillars": "스탠사주"}


def ko_gz(v):
    """'병오' → '丙午' (한글 간지 두 글자)"""
    v = re.sub(r"\s", "", v)
    m = re.match(r"^([갑을병정무기경신임계])([자축인묘진사오미신유술해])", v)
    return STEM[m.group(1)] + BRANCH[m.group(2)] if m else None


def year_of_gz(gz):
    """간지 → 2000~2040 사이 연도"""
    if gz not in GANZHI:
        return None
    i = GANZHI.index(gz)   # 甲子=1984
    for base in (1984, 2044):
        y = base + i
        if 2000 <= y <= 2040:
            return y
    return None


def stem_of(v):
    v = re.sub(r"(일간|천간|목|화|토|금|수|\s|\(.*?\))", "", v)
    return STEM.get(v[:1]) if v[:1] in STEM and len(v) <= 2 else None


def branch_of(v):
    v0 = re.sub(r"\s|\(.*?\)|띠|년생|생", "", v)
    for a, b in ANIMAL.items():
        if v0.startswith(a):
            return b
    v0 = re.sub(r"(수|목|화|토|금)$", "", v0)
    return BRANCH.get(v0[:1]) if v0[:1] in BRANCH and len(v0) <= 2 else None


def god_of(v):
    for g in GODS:
        if g in v:
            return g
    return None


def rel_key(v):
    """'자오충' → '子午충', '갑경충' → '甲庚충', '인오술 삼합' → '寅午戌'"""
    v0 = re.sub(r"\s", "", v)
    chars = [BRANCH.get(c) or STEM.get(c) for c in v0]
    han = "".join(c for c in chars if c)
    if len(han) < 2:
        return None
    for word, tag in REL:
        if word in v0:
            if tag == "삼합" and len(han) == 3:
                return han
            return han[:2] + tag if tag != "방합" else han + "방합"
    return None


def normalize(ctype, value):
    """(조건 type, value) → 앱 키 목록. 정규화 못 하면 [] (원문 값은 다이제스트에만 쓴다)"""
    v = value.strip()
    keys = []
    ge = re.search(r"(비겁|식상|재성|관성|인성|비견|겁재|식신|상관|편재|정재|편관|정관|편인|정인)\s*(?:이|가|은|는|의)?\s*(목|화|토|금|수)(?!\S*(일간|년|월))|(목|화|토|금|수)\s*(비겁|식상|재성|관성|인성|비견|겁재|식신|상관|편재|정재|편관|정관|편인|정인)", v)
    if ge and ctype in ("구조·조합", "십성", "오행 구성", "기타", "십성 과다"):
        g = ge.group(1) or ge.group(5); e = ge.group(2) or ge.group(4)
        keys.append(f"{GROUP[g]}={EL[e]}")   # 예: '화 재성' → 재성=火 (일간이 임·계인 사람)
    if ctype in ("일간", "천간"):
        s = stem_of(v)
        if s: keys.append(s)
        elif re.fullmatch(r"(목|화|토|금|수)(\s?일간)?", v): keys.append(f"일간오행={EL[v[:1]]}")
    elif ctype == "일주" or ctype in ("년주", "월주", "시주"):
        gz = ko_gz(v)
        if gz: keys.append(gz if ctype == "일주" else f"{ctype}={gz}")
    elif ctype in ("띠", "년지"):
        b = branch_of(v)
        if b: keys.append(f"띠={b}")
    elif ctype in ("월지", "일지", "시지"):
        g = god_of(v); b = branch_of(v)
        if g: keys.append(f"{ctype}+{g}")
        elif b: keys.append(f"{ctype}={b}")
    elif ctype == "지지":
        b = branch_of(v)
        if b: keys.append(b)
    elif ctype == "십성":
        g = god_of(v)
        if g: keys.append(g)
        elif v in GROUP: keys.append(GROUP[v])
    elif ctype == "십성 위치":
        m = re.search(r"([년월일시])(?:지|주|간)?\s*(비견|겁재|식신|상관|편재|정재|편관|정관|편인|정인)", v)
        mg = re.search(r"([년월일시])(?:지|주|간)?\s*(비겁|식상|재성|관성|인성|관살)", v)
        if m: keys.append(f"{m.group(1)}지+{m.group(2)}")
        elif mg: keys.append(f"{mg.group(1)}지+{GROUP[mg.group(2)]}")
        else:
            g = god_of(v)
            if g: keys.append(g)
    elif ctype == "십성 과다":
        g = god_of(v) or next((k for k in GROUP if k in v), None)
        if g: keys.append(f"{GROUP[g]}과다")
    elif ctype == "십성 없음":
        g = god_of(v) or next((k for k in GROUP if k in v), None)
        if g: keys.append(NONE_KEY[GROUP[g]])
    elif ctype == "신살":
        for rx, k in SINSAL:
            if re.search(rx, v):
                keys.append(k); break
    elif ctype == "오행 과다":
        e = next((EL[k] for k in EL if k in v), None)
        if e: keys.append(f"{e}과다")
    elif ctype == "오행 부족":
        e = next((EL[k] for k in EL if k in v), None)
        if e: keys.append(f"{e}결핍")
    elif ctype == "오행 구성" and not keys:
        v0 = re.sub(r"\s|\(.*?\)", "", v)
        if re.fullmatch(r"(목|화|토|금|수|나무|불|흙|쇠|물)(과다|많음|강함)?", v0):   # '화' 하나만 적힌 구성 = 그 오행이 많은 사주
            keys.append(f"{EL[next(k for k in EL if v0.startswith(k))]}과다")
    elif ctype == "격국":
        m = re.search(r"(정관|편관|정재|편재|식신|상관|정인|편인|건록|양인|월겁)격", v)
        if m: keys.append(m.group(0))
    elif ctype == "신강약":
        if "신강" in v or "신왕" in v: keys.append("신강")
        elif "신약" in v: keys.append("신약")
        elif "중화" in v: keys.append("중화")
    elif ctype == "구조·조합":
        v0 = v.replace("식상생재", "식신생재")
        for s in STRUCT:
            if s in v0:
                keys.append(s); break
        if not keys and re.search(r"재다", v0): keys.append("재다신약")
        if not keys:
            k = rel_key(v)
            if not k:
                han = "".join(BRANCH.get(c, "") for c in re.sub(r"\s", "", v))
                if len(han) == 3 and len(re.sub(r"\s", "", v)) <= 5: k = han   # '신자진' 같은 삼합 세 글자
            if k: keys.append(k)
    elif ctype in ("합충형파해", "구조·조합") and not keys:
        k = rel_key(v)
        if not k and ctype == "구조·조합":
            han = "".join(BRANCH.get(c, "") for c in re.sub(r"\s", "", v))
            if len(han) == 3 and len(re.sub(r"\s", "", v)) <= 5: k = han   # '사유축' 같은 삼합 세 글자
        if k: keys.append(k)
    elif ctype == "12운성":
        for k, kk in STAGE.items():
            if v.startswith(k):
                keys.append(kk); break
    elif ctype == "공망":
        keys.append("공망")
    elif ctype == "대운":
        g = god_of(v); gz = ko_gz(v)
        if g: keys.append(f"{g}운")
        elif re.search(r"(비겁|식상|재성|관성|인성|관살)", v): keys.append(f"{GROUP[re.search(r'(비겁|식상|재성|관성|인성|관살)', v).group(1)]}운")
        me = re.search(r"(목|화|토|금|수)\s?(대운|운)", v)
        if me and not gz: keys.append(f"대운오행={EL[me.group(1)]}")
        if gz: keys.append(f"대운={gz}")
        m = re.search(r"(\d0)\s?대", v)
        if m and not (g or gz): keys.append(f"나이={m.group(1)}대")
    elif ctype == "세운":
        gz = ko_gz(re.sub(r"^\d{4}\s?년?\s?", "", v))
        m = re.search(r"(20\d\d)", v)
        y = int(m.group(1)) if m else (year_of_gz(gz) if gz else None)
        if y: keys.append(f"Y{y}")
        if gz: keys.append(f"세운={gz}")
        elif not y:
            b = branch_of(re.sub(r"년|해", "", v))
            if b: keys.append(f"세운지={b}")
    elif ctype == "월운":
        gz = ko_gz(v)
        if gz: keys.append(f"월운={gz}")
        m = re.search(r"(1[0-2]|[1-9])\s?월", v)
        if m: keys.append(f"M{int(m.group(1))}")
    elif ctype == "연령대":
        m = re.search(r"(\d0)\s?대", v)
        if m: keys.append(f"나이={m.group(1)}대")
    elif ctype == "성별":
        if re.search(r"여", v): keys.append("성별=여")
        elif re.search(r"남", v): keys.append("성별=남")
    elif ctype == "계절·절기":
        for s in ("봄", "여름", "가을", "겨울"):
            if s in v: keys.append(f"계절={s}"); break
    return keys


def time_keys(t):
    """time 문자열 → 연도/월 키"""
    out = []
    m = re.search(r"(20\d\d)\s?년", t or "")
    if m:
        y = m.group(1); out.append(f"Y{y}")
        mm = re.search(r"(1[0-2]|[1-9])\s?월", t)
        if mm: out.append(f"Y{y}-{int(mm.group(1))}")
    return out


def norm_sentence(s):
    return re.sub(r"[\s.,!?'\"·]", "", s or "")


def main():
    files = sorted(glob.glob(os.path.join(KDIR, "*", "*", "*.json")))
    docs = []
    for f in files:
        try:
            docs.append(json.load(io.open(f, encoding="utf-8")))
        except Exception:
            pass
    print("지식 파일 %d개" % len(docs))
    # 색인: key -> tag -> 집계
    idx = collections.defaultdict(lambda: collections.defaultdict(lambda: {"n": 0, "docs": set(), "pol": 0, "cats": collections.Counter(), "outs": collections.Counter(), "quotes": [], "advice": collections.Counter(), "times": collections.Counter(), "cert": collections.Counter()}))
    key_docs = collections.defaultdict(set)
    raw_conds = collections.Counter()
    tag_docs_total = collections.Counter()
    insights = collections.defaultdict(list)
    year_month = collections.defaultdict(lambda: collections.defaultdict(list))   # Y2026 -> key -> [claims]
    n_claims = 0
    for d in docs:
        did = d.get("video_id") or d.get("source")
        title, ch = d.get("title", ""), CH_NAME.get(d.get("channel", ""), d.get("channel", ""))
        for ins in d.get("insights", []) or []:
            insights[d.get("scope", "기타")].append((ins, title, ch))
        for c in d.get("claims", []) or []:
            n_claims += 1
            keys = set()
            for cond in c.get("conditions", []) or []:
                ks = normalize(cond.get("type", ""), cond.get("value", ""))
                if ks:
                    keys.update(ks)
                else:
                    raw_conds[(cond.get("type", ""), cond.get("value", "")[:40])] += 1
            keys.update(time_keys(c.get("time", "")))
            if not keys:
                continue
            tag = c.get("tag") or "기타"
            tag_docs_total[tag] += 1
            klist = sorted(keys)
            ykeys = [k for k in klist if re.match(r"^Y20\d\d(-\d+)?$", k)]
            if ykeys:
                # 특정 연도(월)에 한정된 이야기: 'Y2026', 'Y2026&조건' 에만 색인해 일반 성향 근거와 섞이지 않게 한다
                conds = [k for k in klist if k not in ykeys]
                index_keys = ykeys + [f"{y}&{k}" if y < k else f"{k}&{y}" for y in ykeys for k in conds]
            else:
                index_keys = klist + ([f"{a}&{b}" for i, a in enumerate(klist) for b in klist[i + 1:]] if len(klist) <= 6 else [])
            for k in index_keys:
                key_docs[k].add(did)
                e = idx[k][tag]
                e["n"] += 1; e["docs"].add(did); e["pol"] += int(c.get("polarity") or 0)
                e["cats"][c.get("category", "")] += 1
                e["outs"][c.get("outcome", "").strip()] += 1
                if c.get("quote") and len(e["quotes"]) < 8:
                    e["quotes"].append((c["quote"][:140], title[:40], ch))
                if c.get("advice"):
                    e["advice"][c["advice"].strip()[:120]] += 1
                e["times"][c.get("time", "항상")] += 1
                e["cert"][c.get("certainty", "")] += 1
            for yk in [k for k in klist if k.startswith("Y")]:
                for k in klist:
                    if k != yk and not k.startswith("Y"):
                        year_month[yk][k].append(c)
    # 기준율·리프트 (단일 키만)
    single = {k: v for k, v in idx.items() if "&" not in k}
    base_tot = sum(len(key_docs[k]) for k in single) or 1
    base_agg = collections.Counter()
    for k in single:
        for t, e in single[k].items():
            base_agg[t] += len(e["docs"])
    base = {t: base_agg[t] / base_tot for t in base_agg}

    def pack(k, min_docs):
        kd = len(key_docs[k]); items = []
        pair, ypair = "&" in k, ("&" in k and "Y20" in k)
        for t, e in idx[k].items():
            if len(e["docs"]) < min_docs or t == "기타":
                continue
            b = base.get(t, 0)
            rate = (len(e["docs"]) + b * 20) / (kd + 20)
            lift = round(min(rate / b if b else 1.0, 9.99), 2)
            outs = [o for o, _ in e["outs"].most_common(3) if o]
            pol = e["pol"] / max(1, e["n"])
            cat = e["cats"].most_common(1)[0][0] if e["cats"] else ""
            items.append({"tag": t, "n": e["n"], "docs": len(e["docs"]), "lift": lift, "pol": round(pol, 2), "cat": CAT_APP.get(cat, "운") or "운",
                          "outs": outs, "quote": e["quotes"][0] if e["quotes"] else None, "advice": (e["advice"].most_common(1)[0][0][:90] if e["advice"] else ""),
                          "time": e["times"].most_common(1)[0][0] if e["times"] else "항상", "times": [t0 for t0, _ in e["times"].most_common(3) if t0 != "항상"]})
        items.sort(key=lambda x: -(x["docs"] * min(x["lift"], 4.0)))
        items = items[:PAIR_ITEMS if pair else MAX_ITEMS]
        out_items = []
        for i, it in enumerate(items):   # 용량: 빈 값은 생략, 하위 항목·짝 키는 인용을 줄인다 (앱은 필드가 없으면 기본값으로 처리)
            keep_quote = it["quote"] and (i < 6 if not pair else (ypair and i < 3))
            o = {"tag": it["tag"], "docs": it["docs"], "lift": it["lift"], "cat": it["cat"], "outs": it["outs"][:3 if i < 4 else 2]}
            if it["n"] != it["docs"]: o["n"] = it["n"]
            if it["pol"]: o["pol"] = it["pol"]
            if keep_quote: o["quote"] = [it["quote"][0][:100], it["quote"][1][:30], it["quote"][2]]   # 출처는 다이제스트용, 앱 JSON 에서는 비운다
            if it["advice"] and i < 6 and not pair: o["advice"] = it["advice"][:80]
            if it["time"] != "항상": o["time"] = it["time"]
            if it["times"]: o["times"] = it["times"][:2]
            out_items.append(o)
        return {"docs": kd, "items": out_items}

    app = {"meta": {"docs": len(docs), "claims": n_claims, "built": time.strftime("%Y-%m-%d %H:%M"), "base": {t: round(b, 4) for t, b in base.items()}}, "by_key": {}}
    for k in idx:
        pair = "&" in k
        if len(key_docs[k]) < ((3 if "Y20" in k else PAIR_MIN_DOCS) if pair else 2):
            continue
        ym = re.search(r"Y(20\d\d)", k)
        if ym and int(ym.group(1)) < APP_MIN_YEAR:
            continue
        if re.search(r"(^|&)M\d+(&|$)", k):   # 월만 있는 키(M8)는 앱에서 쓰지 않음
            continue
        p = pack(k, 1 if pair else 2)
        if p["items"]:
            app["by_key"][k] = p
    os.makedirs(os.path.dirname(OUT_APP), exist_ok=True)
    # 앱 JSON: 출처(제목·채널)는 비우고, 결과 문장·조언은 쉬운 문장 매핑(easy_outs.json)이 있으면 그것으로 바꾼다
    easy = json.load(io.open(EASY, encoding="utf-8")) if os.path.exists(EASY) else {}
    ez = lambda s: easy.get(s, s)
    def app_item(it):
        o = dict(it, outs=[ez(x) for x in it["outs"]])
        if it.get("advice"): o["advice"] = ez(it["advice"])
        if it.get("quote"): o["quote"] = [it["quote"][0], "", ""]
        return o
    app_out = {"meta": dict(app["meta"], easy=len(easy)), "by_key": {k: {"docs": p["docs"], "items": [app_item(it) for it in p["items"]]} for k, p in app["by_key"].items()}}
    print("쉬운 문장 매핑 %d개 적용" % len(easy))
    io.open(OUT_APP, "w", encoding="utf-8").write(json.dumps(app_out, ensure_ascii=False, separators=(",", ":")))
    print("앱 색인: 키 %d개(짝 키 %d) → %s (%.0f KB)" % (len(app["by_key"]), sum(1 for k in app["by_key"] if "&" in k), OUT_APP, os.path.getsize(OUT_APP) / 1024))

    # ---------- 사람이 읽는 다이제스트 ----------
    L = ["# 사주 전문가 강의 지식 정리 (자동 생성)", "", "영상 %d편 · 조건→결과 주장 %s개 · 생성 %s" % (len(docs), format(n_claims, ","), app["meta"]["built"]), "",
         "각 항목: **결과 라벨** (영상 수, 다른 조건 대비 배수) — 대표 결과 문장 / 「원문 인용」 (채널 · 영상)", ""]

    def section(title, keys, min_docs=3, top=10):
        rows = [(k, app["by_key"][k]) for k in keys if k in app["by_key"] and app["by_key"][k]["docs"] >= min_docs]
        if not rows:
            return
        L.append("## " + title); L.append("")
        for k, p in sorted(rows, key=lambda kv: -kv[1]["docs"]):
            L.append("### %s (영상 %d편)" % (k, p["docs"]))
            for it in p["items"][:top]:
                q = it.get("quote")
                L.append("- **%s** (%d편, ×%.1f%s) — %s%s" % (it["tag"], it["docs"], it["lift"], "" if it.get("time", "항상") == "항상" else ", " + it["time"], " / ".join(it["outs"][:2]),
                                                          (" 「%s」 (%s · %s)" % (q[0][:90], q[2], q[1][:24])) if q else ""))
                if it.get("advice"):
                    L.append("  - 조언: %s" % it["advice"][:100])
            L.append("")

    K = list(app["by_key"].keys())
    section("일간", [s for s in STEM.values()])
    section("띠(년지)", [f"띠={b}" for b in BRANCH.values()])
    section("일주", sorted(k for k in K if re.match(r"^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$", k)))
    section("십성·위치 십성·과다/없음", sorted(k for k in K if any(g in k for g in GODS + list(GROUP)) and "&" not in k and not k.endswith("운") and not k.endswith("격")))
    section("신살", sorted(k for k in K if any(k == s for _, s in SINSAL)))
    section("오행 과다·결핍", sorted(k for k in K if re.match(r"^[木火土金水](과다|결핍)$", k)))
    section("격국·신강신약·구조", sorted(k for k in K if k.endswith("격") or k in ("신강", "신약", "중화") or k in STRUCT))
    section("합·충·형·원진·귀문", sorted(k for k in K if re.search(r"(충|합|형|파|해|원진|귀문)$", k) or re.match(r"^[子丑寅卯辰巳午未申酉戌亥]{3}$", k)))
    section("12운성·공망", sorted(k for k in K if k in STAGE.values() or k == "공망"))
    section("대운·세운·월운", sorted(k for k in K if k.endswith("운") or k.startswith(("대운=", "세운=", "월운=", "M"))))
    section("연도·월 (신년운세)", sorted(k for k in K if re.match(r"^Y20\d\d(-\d+)?$", k)), min_docs=2, top=14)
    section("나이·성별·계절", sorted(k for k in K if k.startswith(("나이=", "성별=", "계절="))), min_docs=2)
    # 연도 × 조건 (예: 2026년 갑 일간)
    yks = sorted(k for k in K if "&" in k and re.match(r"^Y20\d\d&", k) or (("&Y20" in k)))
    section("연도 × 조건 (예: 2026년의 갑 일간·말띠·정관 대운)", yks, min_docs=2, top=8)
    section("조건 두 개가 겹칠 때 (조합)", sorted(k for k in K if "&" in k and "Y20" not in k), min_docs=3, top=6)
    # 통찰
    L.append("## 해석 원리·통찰 (영상에서 뽑은 문장)"); L.append("")
    for scope, lst in insights.items():
        L.append("### %s (%d)" % (scope, len(lst)))
        seen = set()
        for ins, title, ch in lst[:400]:
            k = norm_sentence(ins)[:40]
            if k in seen:
                continue
            seen.add(k); L.append("- %s _(%s · %s)_" % (ins, ch, title[:30]))
        L.append("")
    L.append("## 정규화되지 않은 조건 값 (상위)"); L.append("")
    for (t, v), n in raw_conds.most_common(80):
        L.append("- %s: %s (%d)" % (t, v, n))
    io.open(OUT_MD, "w", encoding="utf-8").write("\n".join(L))
    print("다이제스트: %s (%.0f KB) | 정규화 실패 조건 %d종" % (OUT_MD, os.path.getsize(OUT_MD) / 1024, len(raw_conds)))


if __name__ == "__main__":
    main()
