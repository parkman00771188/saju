# -*- coding: utf-8 -*-
"""
크롤링된 유튜브 자막 원문을 분석해 사주 개념별 지식 통계를 만든다.

입력:  ../data/<채널>/{videos,shorts}/*.txt + *_index.json
출력:
  ../saju-site/src/data/kb_stats.json   개념별 {언급수, 다룬 영상 top N, 함께 나오는 주제어 프로파일}
  ./excerpts/<개념>.txt                  개념별 대표 문맥 조각 (해석 문장 집필용 참고 자료, 사이트에 미포함)
  ./report.md                            전체 요약 리포트

사용법:  python build_kb.py
"""
import io, json, os, re, collections

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, "data")
OUT_JSON = os.path.join(ROOT, "saju-site", "src", "data", "kb_stats.json")
EXC_DIR = os.path.join(HERE, "excerpts")

CHANNEL_NAME = {"dohwadore_saju": "도화도르", "stan4pillars": "스탠사주"}

# ---------------------------------------------------------------------------
# 개념 사전: key -> 정규식 패턴 목록 (ASR 원문의 띄어쓰기 변형을 허용)
# ---------------------------------------------------------------------------
def sp(word):
    r"""'갑목' -> '갑\s?목' 처럼 글자 사이 공백 허용"""
    return r"\s?".join(map(re.escape, word))

CONCEPTS = {
    # 일간(천간) 오행
    "甲": ["갑목", "갑 일간", "갑일간"], "乙": ["을목", "을 일간", "을일간"],
    "丙": ["병화", "병 일간", "병일간"], "丁": ["정화", "정 일간", "정일간"],
    "戊": ["무토", "무 일간", "무일간"], "己": ["기토", "기 일간", "기일간"],
    "庚": ["경금", "경 일간", "경일간"], "辛": ["신금", "신 일간", "신일간"],
    "壬": ["임수", "임 일간", "임일간"], "癸": ["계수", "계 일간", "계일간"],
    # 지지
    "子": ["자수", "자월", "자시", "쥐띠"], "丑": ["축토", "축월", "소띠"], "寅": ["인목", "인월", "호랑이띠", "범띠"],
    "卯": ["묘목", "묘월", "토끼띠"], "辰": ["진토", "진월", "용띠"], "巳": ["사화", "사월생", "뱀띠"],
    "午": ["오화", "오월생", "말띠"], "未": ["미토", "미월", "양띠"], "申": ["신금", "신월", "원숭이띠"],
    "酉": ["유금", "유월", "닭띠"], "戌": ["술토", "술월", "개띠"], "亥": ["해수", "해월", "돼지띠"],
    # 십성
    "비견": ["비견"], "비겁": ["겁재", "비겁"], "식신": ["식신"], "상관": ["상관격", "상관이", "상관은", "상관을", "상관 있", "상관이 있", "식상"],
    "편재": ["편재"], "정재": ["정재"], "편관": ["편관", "칠살"], "정관": ["정관"], "편인": ["편인"], "정인": ["정인"],
    "재성": ["재성"], "관성": ["관성"], "인성": ["인성"], "식상": ["식상"], "비겁군": ["비겁"],
    # 십이운성
    "장생": ["장생"], "목욕": ["목욕"], "관대": ["관대"], "건록": ["건록"], "제왕": ["제왕"], "쇠지": ["쇠지"],
    "병지": ["병지"], "사지": ["사지"], "묘지": ["묘지"], "절지": ["절지"], "태지": ["태지"], "양지": ["양지"],
    # 신살
    "역마": ["역마"], "도화": ["도화살", "도화"], "화개": ["화개"], "백호대살": ["백호"], "괴강": ["괴강"],
    "양인": ["양인살", "양인"], "홍염": ["홍염"], "천을귀인": ["천을귀인", "천을 귀인"], "태극귀인": ["태극귀인", "태극 귀인"],
    "문창귀인": ["문창"], "귀문관살": ["귀문"], "원진살": ["원진"], "공망": ["공망"], "고란살": ["고란"],
    "현침살": ["현침"], "간여지동": ["간여지동"], "천덕귀인": ["천덕"], "월덕귀인": ["월덕"], "삼재": ["삼재"],
    "복성귀인": ["복성귀인", "복성 귀인"], "금여록": ["금여"], "평두살": ["평두"], "학당귀인": ["학당"],
    "겁살": ["겁살"], "재살": ["재살", "수옥살"], "천살": ["천살"], "지살": ["지살"], "월살": ["월살"], "망신": ["망신살"],
    "장성": ["장성살"], "반안": ["반안"], "육해": ["육해"],
    # 합충형파해
    "천간합": ["천간합", "간합"], "육합": ["육합"], "삼합": ["삼합"], "방합": ["방합"], "충": ["충이", "충을", "충은", "상충", "충 있", "충이 있", "충 맞"],
    "형": ["형살", "삼형"], "파": ["파살"], "해": ["해살", "육해"],
    # 오행 과다/결핍
    "木과다": [r"목\s?(이|기운이|이 너무|이 많|기운)?\s?(많|과다|강)", "목다"], "木결핍": [r"목\s?(이|기운이)?\s?(없|부족|약)", "무목"],
    "火과다": [r"화\s?(가|기운이|기운)?\s?(많|과다|강)", "화다"], "火결핍": [r"화\s?(가|기운이)?\s?(없|부족|약)", "무화"],
    "土과다": [r"토\s?(가|기운이|기운)?\s?(많|과다|강)", "토다"], "土결핍": [r"토\s?(가|기운이)?\s?(없|부족|약)"],
    "金과다": [r"금\s?(이|기운이|기운)?\s?(많|과다|강)", "금다"], "金결핍": [r"금\s?(이|기운이)?\s?(없|부족|약)", "무금"],
    "水과다": [r"수\s?(가|기운이|기운)?\s?(많|과다|강)", "수다"], "水결핍": [r"수\s?(가|기운이)?\s?(없|부족|약)", "무수"],
    # 운
    "대운": ["대운"], "세운": ["세운", "신년운", "올해 운"], "월운": ["월운"],
    "신강": ["신강"], "신약": ["신약"], "용신": ["용신"], "격국": ["격국"],
}

# 함께 언급되는 주제어(테마) 사전
THEMES = {
    "재물": ["돈", "재물", "재산", "부자", "수입", "월급", "투자", "부동산", "주식"],
    "직장": ["직장", "회사", "조직", "승진", "이직", "취업", "공무원", "직업"],
    "사업": ["사업", "장사", "창업", "자영업", "프리랜서"],
    "연애": ["연애", "이성", "애인", "남자친구", "여자친구", "썸", "바람"],
    "결혼": ["결혼", "배우자", "남편", "아내", "부부", "이혼", "재혼"],
    "건강": ["건강", "아프", "병원", "수술", "질병", "몸"],
    "학업": ["공부", "시험", "학업", "합격", "자격증", "대학"],
    "명예": ["명예", "권력", "인정", "출세", "성공", "유명"],
    "예술": ["예술", "창작", "예체능", "음악", "그림", "글쓰기", "창의"],
    "종교": ["종교", "철학", "영성", "무속", "신기", "기도"],
    "이동": ["이사", "이동", "해외", "여행", "외국", "유학"],
    "성격": ["성격", "기질", "성향", "스타일", "타입"],
    "부모": ["부모", "어머니", "아버지", "엄마", "아빠", "집안"],
    "자식": ["자식", "아이", "자녀", "임신", "출산"],
    "고독": ["고독", "외로", "혼자", "독립"],
    "매력": ["매력", "인기", "끌리", "잘생", "예쁘", "호감"],
    "리더": ["리더", "대장", "우두머리", "카리스마", "주도"],
    "고집": ["고집", "자존심", "완벽주의", "융통성", "소신"],
    "예민": ["예민", "섬세", "감성", "감수성", "직관", "촉"],
    "사고": ["사고", "다치", "위험", "구설", "소송", "관재"],
    "변화": ["변화", "변동", "전환", "터닝", "바뀌"],
    "인간관계": ["인간관계", "친구", "사람들", "대인", "사회성"],
}

WINDOW = 60  # 문맥 조각 길이(앞뒤)


def load_docs():
    docs = []
    for ch in sorted(os.listdir(DATA)):
        chdir = os.path.join(DATA, ch)
        if not os.path.isdir(chdir):
            continue
        for tab in ("videos", "shorts"):
            idx = os.path.join(chdir, "%s_index.json" % tab)
            if not os.path.exists(idx):
                continue
            for r in json.load(io.open(idx, encoding="utf-8")):
                if not r or r.get("status") != "ok":
                    continue
                p = os.path.join(chdir, tab, r["file"])
                if not os.path.exists(p):
                    continue
                raw = io.open(p, encoding="utf-8").read()
                body = raw.split("-" * 60, 1)[-1]
                text = re.sub(r"\s+", " ", body).strip()
                docs.append({
                    "id": r["video_id"], "title": r.get("title", ""), "url": r["url"],
                    "channel": ch, "channel_name": CHANNEL_NAME.get(ch, ch), "tab": tab,
                    "text": text, "chars": len(text),
                })
    return docs


def compile_patterns():
    out = {}
    for key, pats in CONCEPTS.items():
        rx = []
        for p in pats:
            # 정규식 메타문자가 들어있으면 그대로, 아니면 띄어쓰기 허용 변형
            rx.append(p if any(c in p for c in "()[]|?*+\\") else sp(p))
        out[key] = re.compile("|".join(rx))
    themes = {k: re.compile("|".join(map(re.escape, v))) for k, v in THEMES.items()}
    return out, themes


def main():
    docs = load_docs()
    print("문서 %d개, 총 %s자" % (len(docs), format(sum(d["chars"] for d in docs), ",")))
    cpat, tpat = compile_patterns()
    os.makedirs(EXC_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)

    kb = {}
    for key, rx in cpat.items():
        per_doc = []
        theme_counter = collections.Counter()
        excerpts = []
        total = 0
        for d in docs:
            hits = [m.start() for m in rx.finditer(d["text"])]
            if not hits:
                continue
            total += len(hits)
            density = len(hits) / max(d["chars"], 1) * 10000
            per_doc.append((len(hits), density, d))
            # 주제어 프로파일: 키워드 주변 문맥에서 테마어 카운트
            for h in hits[:200]:
                ctx = d["text"][max(0, h - WINDOW):h + WINDOW]
                for t, trx in tpat.items():
                    if trx.search(ctx):
                        theme_counter[t] += 1
            # 대표 문맥 조각 (집필 참고용)
            for h in hits[:3]:
                excerpts.append((density, d["title"], d["text"][max(0, h - WINDOW):h + WINDOW]))
        per_doc.sort(key=lambda x: (x[0] * 0.5 + x[1] * 2), reverse=True)
        top = [{"id": x[2]["id"], "title": x[2]["title"], "url": x[2]["url"], "channel": x[2]["channel_name"], "hits": x[0]} for x in per_doc[:8]]
        theme_total = sum(theme_counter.values()) or 1
        themes = [{"theme": t, "share": round(c / theme_total, 3)} for t, c in theme_counter.most_common(6)]
        kb[key] = {"mentions": total, "docs": len(per_doc), "top": top, "themes": themes}

        excerpts.sort(key=lambda x: -x[0])
        with io.open(os.path.join(EXC_DIR, "%s.txt" % key.replace("/", "_")), "w", encoding="utf-8") as f:
            f.write("# %s  (언급 %d회 / 영상 %d개)\n\n" % (key, total, len(per_doc)))
            for _, title, ex in excerpts[:40]:
                f.write("[%s]\n  …%s…\n\n" % (title[:40], ex))

    meta = {
        "docs": len(docs), "chars": sum(d["chars"] for d in docs),
        "channels": sorted({(d["channel"], d["channel_name"]) for d in docs}),
    }
    with io.open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump({"meta": meta, "concepts": kb}, f, ensure_ascii=False, indent=1)

    # 리포트
    lines = ["# 지식 베이스 분석 리포트", "", "문서 %d개 · %s자 · 채널 %s" % (meta["docs"], format(meta["chars"], ","), ", ".join(c[1] for c in meta["channels"])), ""]
    lines.append("| 개념 | 언급 | 영상수 | 주요 주제어 |")
    lines.append("|---|---|---|---|")
    for key, v in sorted(kb.items(), key=lambda kv: -kv[1]["mentions"]):
        th = " ".join("%s(%d%%)" % (t["theme"], round(t["share"] * 100)) for t in v["themes"][:4])
        lines.append("| %s | %d | %d | %s |" % (key, v["mentions"], v["docs"], th))
    io.open(os.path.join(HERE, "report.md"), "w", encoding="utf-8").write("\n".join(lines))
    print("완료: %s" % OUT_JSON)


if __name__ == "__main__":
    main()
