# -*- coding: utf-8 -*-
"""
크롤링된 유튜브 자막 원문을 분석해 사주 개념·조합별 지식 통계를 만든다.

입력:  ../data/<채널>/{videos,shorts}/*.txt + *_index.json
출력:  ../saju-site/src/data/kb_stats.json
  concepts[key]  단일 개념 (일간·지지·십성·운성·신살·오행 과다/결핍·운·신강약)
  patterns[key]  조합 패턴 (60일주, 천간충/합, 지지충/육합/삼합/형/원진/귀문, 구조(식신제살·관살혼잡…), 일간×십성)
  각 항목 = {
    mentions, docs,           언급 횟수 / 다룬 영상 수
    polarity,                 -1(부정) ~ +1(긍정): 문맥의 긍정어·부정어 비율
    pos, neg,                 긍정어/부정어 등장 횟수
    categories: {…},          문맥의 운세 카테고리 비중 (직장 금전 연애 건강 학업 가족)
    keywords: […],            문맥에서 전체 대비 두드러지는 단어
  }
사용법:  python build_kb.py
"""
import io, json, os, re, math, collections

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, "data")
OUT_JSON = os.path.join(ROOT, "saju-site", "src", "data", "kb_stats.json")
EXC_DIR = os.path.join(HERE, "excerpts")
CHANNEL_NAME = {"dohwadore_saju": "도화도르", "stan4pillars": "스탠사주"}

STEM_KO = dict(zip("甲乙丙丁戊己庚辛壬癸", "갑을병정무기경신임계"))
BRANCH_KO = dict(zip("子丑寅卯辰巳午未申酉戌亥", "자축인묘진사오미신유술해"))
STEMS = "甲乙丙丁戊己庚辛壬癸"
BRANCHES = "子丑寅卯辰巳午未申酉戌亥"
TEN_GODS = ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"]


def sp(word):
    r"""'갑목' -> '갑\s?목' 처럼 글자 사이 공백 허용"""
    return r"\s?".join(map(re.escape, word))


STEM_NAMES = {s: [STEM_KO[s] + e for e in ("목", "화", "토", "금", "수") if e == {"甲": "목", "乙": "목", "丙": "화", "丁": "화", "戊": "토", "己": "토", "庚": "금", "辛": "금", "壬": "수", "癸": "수"}[s]] + [STEM_KO[s] + " 일간", STEM_KO[s] + "일간"] for s in STEMS}

CONCEPTS = {
    **{s: STEM_NAMES[s] for s in STEMS},
    "子": ["자수", "자월", "쥐띠"], "丑": ["축토", "축월", "소띠"], "寅": ["인목", "인월", "호랑이띠", "범띠"],
    "卯": ["묘목", "묘월", "토끼띠"], "辰": ["진토", "진월", "용띠"], "巳": ["사화", "뱀띠"],
    "午": ["오화", "말띠"], "未": ["미토", "미월", "양띠"], "申": ["신금", "신월", "원숭이띠"],
    "酉": ["유금", "유월", "닭띠"], "戌": ["술토", "술월", "개띠"], "亥": ["해수", "해월", "돼지띠"],
    "비견": ["비견"], "비겁": ["겁재", "비겁"], "식신": ["식신"],
    "상관": ["상관격", "상관이", "상관은", "상관을", "상관 있", "상관이 있", "식상"],
    "편재": ["편재"], "정재": ["정재"], "편관": ["편관", "칠살"], "정관": ["정관"], "편인": ["편인"], "정인": ["정인"],
    "재성": ["재성"], "관성": ["관성"], "인성": ["인성"], "식상": ["식상"],
    "장생": ["장생"], "목욕": ["목욕"], "관대": ["관대"], "건록": ["건록"], "제왕": ["제왕"], "쇠지": ["쇠지"],
    "병지": ["병지"], "사지": ["사지"], "묘지": ["묘지"], "절지": ["절지"], "태지": ["태지"], "양지": ["양지"],
    "역마": ["역마"], "도화": ["도화살", "도화"], "화개": ["화개"], "백호대살": ["백호"], "괴강": ["괴강"],
    "양인": ["양인살", "양인"], "홍염": ["홍염"], "천을귀인": ["천을귀인", "천을 귀인"], "태극귀인": ["태극귀인", "태극 귀인"],
    "문창귀인": ["문창"], "귀문관살": ["귀문"], "원진살": ["원진"], "공망": ["공망"], "고란살": ["고란"],
    "현침살": ["현침"], "간여지동": ["간여지동"], "천덕귀인": ["천덕"], "월덕귀인": ["월덕"], "삼재": ["삼재"],
    "복성귀인": ["복성귀인", "복성 귀인"], "금여록": ["금여"], "평두살": ["평두"], "학당귀인": ["학당"],
    "겁살": ["겁살"], "재살": ["재살", "수옥살"], "천살": ["천살"], "지살": ["지살"], "월살": ["월살"], "망신": ["망신살"],
    "장성": ["장성살"], "반안": ["반안"], "육해": ["육해"],
    "충": ["충이", "충을", "충은", "상충", "충 있", "충이 있", "충 맞"],
    "木과다": [r"목\s?(이|기운이|이 너무|이 많|기운)?\s?(많|과다|강)", "목다"], "木결핍": [r"목\s?(이|기운이)?\s?(없|부족|약)", "무목"],
    "火과다": [r"화\s?(가|기운이|기운)?\s?(많|과다|강)", "화다"], "火결핍": [r"화\s?(가|기운이)?\s?(없|부족|약)", "무화"],
    "土과다": [r"토\s?(가|기운이|기운)?\s?(많|과다|강)", "토다"], "土결핍": [r"토\s?(가|기운이)?\s?(없|부족|약)"],
    "金과다": [r"금\s?(이|기운이|기운)?\s?(많|과다|강)", "금다"], "金결핍": [r"금\s?(이|기운이)?\s?(없|부족|약)", "무금"],
    "水과다": [r"수\s?(가|기운이|기운)?\s?(많|과다|강)", "수다"], "水결핍": [r"수\s?(가|기운이)?\s?(없|부족|약)", "무수"],
    "대운": ["대운"], "세운": ["세운", "신년운", "올해 운"], "월운": ["월운"],
    "신강": ["신강"], "신약": ["신약"], "용신": ["용신"], "격국": ["격국"],
}

# ---------------------------------------------------------------------------
# 조합 패턴
# ---------------------------------------------------------------------------
PATTERNS = {}
# 60 일주
_s, _b = 0, 0
for i in range(60):
    st, br = STEMS[i % 10], BRANCHES[i % 12]
    ko = STEM_KO[st] + BRANCH_KO[br]
    PATTERNS[st + br] = [ko + "일주", ko + " 일주", ko + "일주분", ko + " 일간"]
# 천간 충 / 합
for a, b in [("甲", "庚"), ("乙", "辛"), ("丙", "壬"), ("丁", "癸")]:
    PATTERNS[a + b + "충"] = [STEM_KO[a] + STEM_KO[b] + "충", STEM_KO[a] + STEM_KO[b] + " 충", STEM_KO[a] + " " + STEM_KO[b] + " 충"]
for a, b in [("甲", "己"), ("乙", "庚"), ("丙", "辛"), ("丁", "壬"), ("戊", "癸")]:
    PATTERNS[a + b + "합"] = [STEM_KO[a] + STEM_KO[b] + "합", STEM_KO[a] + STEM_KO[b] + " 합"]
# 지지 충 / 육합 / 삼합 / 형 / 원진 / 귀문
for a, b in [("子", "午"), ("丑", "未"), ("寅", "申"), ("卯", "酉"), ("辰", "戌"), ("巳", "亥")]:
    PATTERNS[a + b + "충"] = [BRANCH_KO[a] + BRANCH_KO[b] + "충", BRANCH_KO[a] + BRANCH_KO[b] + " 충", BRANCH_KO[b] + BRANCH_KO[a] + "충"]
for a, b in [("子", "丑"), ("寅", "亥"), ("卯", "戌"), ("辰", "酉"), ("巳", "申"), ("午", "未")]:
    PATTERNS[a + b + "합"] = [BRANCH_KO[a] + BRANCH_KO[b] + "합", BRANCH_KO[a] + BRANCH_KO[b] + " 합", BRANCH_KO[b] + BRANCH_KO[a] + "합"]
for tri in ["寅午戌", "申子辰", "亥卯未", "巳酉丑"]:
    PATTERNS[tri] = ["".join(BRANCH_KO[c] for c in tri)]
for tri in ["寅巳申", "丑戌未"]:
    PATTERNS[tri + "형"] = ["".join(BRANCH_KO[c] for c in tri)]
PATTERNS["子卯형"] = ["자묘형", "자묘 형"]
for a, b in [("子", "未"), ("丑", "午"), ("寅", "酉"), ("卯", "申"), ("辰", "亥"), ("巳", "戌")]:
    PATTERNS[a + b + "원진"] = [BRANCH_KO[a] + BRANCH_KO[b] + "원진", BRANCH_KO[a] + BRANCH_KO[b] + " 원진", BRANCH_KO[b] + BRANCH_KO[a] + "원진"]
for a, b in [("子", "酉"), ("丑", "午"), ("寅", "未"), ("卯", "申"), ("辰", "亥"), ("巳", "戌")]:
    PATTERNS[a + b + "귀문"] = [BRANCH_KO[a] + BRANCH_KO[b] + "귀문", BRANCH_KO[a] + BRANCH_KO[b] + " 귀문", BRANCH_KO[b] + BRANCH_KO[a] + "귀문"]
# 구조 (격국·조합 용어)
PATTERNS.update({
    "식신제살": ["식신제살", "식신 제살"], "상관견관": ["상관견관", "상관 견관"], "관살혼잡": ["관살혼잡", "관살 혼잡"],
    "재다신약": ["재다신약", "재다 신약"], "인다신약": ["인다신약", "인성과다", "인성 과다", "인다"], "군겁쟁재": ["군겁쟁재", "비겁쟁재", "군비쟁재", "쟁재"],
    "재생관": ["재생관"], "관인상생": ["관인상생"], "살인상생": ["살인상생"], "탐재괴인": ["탐재괴인"], "상관패인": ["상관패인"],
    "식신생재": ["식신생재"], "상관생재": ["상관생재"], "재관쌍미": ["재관쌍미"],
    "무재": ["무재", r"재성\s?(이|은|가)?\s?없", "재성이 하나도"], "무관": ["무관 사주", "무관사주", r"관성\s?(이|은|가)?\s?없", "관이 없"],
    "무인성": ["무인성", r"인성\s?(이|은|가)?\s?없"], "무식상": ["무식상", r"식상\s?(이|은|가)?\s?없"], "무비겁": ["무비겁", r"비겁\s?(이|은|가)?\s?없"],
    "도화홍염": [r"도화[^.]{0,15}홍염", r"홍염[^.]{0,15}도화"], "양인편관": [r"양인[^.]{0,15}(편관|칠살)", r"(편관|칠살)[^.]{0,15}양인"],
    "백호괴강": [r"백호[^.]{0,15}괴강", r"괴강[^.]{0,15}백호"],
})
# 일간 × 십성
for s in STEMS:
    for g in TEN_GODS:
        alt = "(%s)" % "|".join(sp(n) for n in STEM_NAMES[s])
        gg = "(%s)" % ("편관|칠살" if g == "편관" else g)
        PATTERNS["%s+%s" % (s, "비겁" if g == "겁재" else g)] = [alt + r"[^.?!]{0,30}" + gg, gg + r"[^.?!]{0,30}" + alt]


# ---------------------------------------------------------------------------
# 주장(claim) 사전: 원문 문맥에서 실제로 말하는 결과·특성 표현을 정규화한다.
#   label: (카테고리, 극성, [정규식...])   극성 +1 긍정 / -1 부정 / 0 중립
# ---------------------------------------------------------------------------
CLAIMS = {
    # 직장
    "승진·직책": ("직장", 1, [r"승진", r"직책", r"직급이 오", r"자리를 잡"]),
    "취업·합격": ("직장", 1, [r"취업", r"입사", r"채용", r"합격"]),
    "이직·퇴사": ("직장", -1, [r"이직", r"퇴사", r"그만두", r"회사를 옮", r"직장을 옮", r"직장 변동", r"직장이 바뀌"]),
    "창업·사업 확장": ("직장", 0, [r"창업", r"사업을 시작", r"사업을 벌", r"사업 확장", r"판을 키"]),
    "독립·프리랜서": ("직장", 0, [r"프리랜서", r"독립적으로", r"혼자 일", r"자기 사업", r"1인"]),
    "상사·조직과 갈등": ("직장", -1, [r"상사(와|랑|하고)", r"윗사람과", r"조직과 (안 |못 )?맞", r"조직 생활이 (힘|어렵)", r"직장 생활이 (힘|어렵)"]),
    "명예·인정": ("직장", 1, [r"명예", r"인정을 받", r"인정받", r"알아주", r"유명해"]),
    "리더·대표": ("직장", 1, [r"리더", r"대표", r"사장", r"우두머리", r"이끄"]),
    "전문직·기술": ("직장", 1, [r"전문직", r"전문가", r"기술직", r"자격을 살", r"전문성"]),
    "공직·조직형": ("직장", 0, [r"공무원", r"공직", r"대기업", r"조직에 (잘 )?맞", r"조직 생활에"]),
    # 금전
    "재물이 들어옴": ("금전", 1, [r"돈이 (들어|생기|모이|붙)", r"재물이 (들어|생기|모이|따르)", r"재물운이 (좋|열)", r"수입이 (늘|올라|생기)", r"돈을 (벌|잘 벌)", r"부자"]),
    "돈이 샘·손재": ("금전", -1, [r"돈이 (새|나가|빠져|깨지)", r"손재", r"재물을 (잃|날리)", r"돈을 (잃|날리|까먹)", r"재물이 (나가|깨지|흩어)", r"손해를"]),
    "투자·부동산": ("금전", 0, [r"투자", r"주식", r"부동산", r"땅을", r"건물을"]),
    "빚·보증": ("금전", -1, [r"보증", r"빚", r"대출", r"채무", r"떼이"]),
    "낭비·씀씀이": ("금전", -1, [r"씀씀이", r"낭비", r"과소비", r"헤프", r"돈을 (막|잘) 쓰"]),
    "저축·알뜰": ("금전", 1, [r"저축", r"알뜰", r"모으는", r"아끼", r"실속"]),
    "큰돈·대박": ("금전", 1, [r"큰돈", r"큰 돈", r"대박", r"한 방", r"목돈", r"횡재"]),
    "재물 기복": ("금전", -1, [r"기복이", r"들락날락", r"들어왔다 나가", r"불안정한 수입", r"수입이 불규칙"]),
    # 연애
    "인기·매력": ("연애", 1, [r"인기", r"매력", r"끌리", r"호감", r"이성이 (많|따르|붙)", r"이성에게"]),
    "연애·만남": ("연애", 1, [r"연애(운|가|를)", r"새로운 (사람|인연)", r"만남", r"인연이 (들어|생기|오)", r"짝"]),
    "결혼·배우자 인연": ("연애", 1, [r"결혼(운|을|이|하)", r"배우자(를|가|와|복)", r"혼인", r"신혼"]),
    "이별·이혼": ("연애", -1, [r"이별", r"이혼", r"헤어지", r"헤어질", r"파경", r"별거"]),
    "바람·삼각관계": ("연애", -1, [r"바람", r"외도", r"삼각", r"양다리", r"불륜", r"애인이 (둘|여러)"]),
    "배우자와 갈등": ("연애", -1, [r"배우자(와|랑|하고) (갈등|싸|다투|안 맞|맞지)", r"남편(과|이랑|하고) (갈등|싸|다투)", r"아내(와|랑|하고) (갈등|싸|다투)", r"부부 (갈등|싸움|불화)", r"부부간"]),
    "결혼이 늦음": ("연애", -1, [r"결혼이 늦", r"늦게 결혼", r"만혼", r"결혼을 늦"]),
    "이성 문제·구설": ("연애", -1, [r"이성 문제", r"여자 문제", r"남자 문제", r"이성으로 인한", r"염문"]),
    # 건강
    "수술·큰 병": ("건강", -1, [r"수술", r"큰 병", r"입원", r"암", r"중병"]),
    "사고·부상": ("건강", -1, [r"사고", r"다치", r"부상", r"골절", r"교통"]),
    "스트레스·신경": ("건강", -1, [r"스트레스", r"신경이 (예민|날카|쓰)", r"신경성", r"신경쇠약", r"강박"]),
    "우울·불안": ("건강", -1, [r"우울", r"불안", r"공황", r"무기력", r"의욕이 없"]),
    "불면·수면": ("건강", -1, [r"불면", r"잠을 (못|잘 못)", r"수면"]),
    "과로·피로": ("건강", -1, [r"과로", r"피로", r"지치", r"번아웃", r"체력이 (떨어|달리|약)"]),
    "소화기·위장": ("건강", -1, [r"위장", r"소화", r"위가", r"장이 (약|안)", r"비위"]),
    "간·담·눈": ("건강", -1, [r"간(이|에) (안 좋|나쁘|약|무리)", r"간 기능", r"간 건강", r"간장", r"담낭", r"눈이 (안 좋|나빠|약)", r"시력"]),
    "심장·혈압": ("건강", -1, [r"심장", r"혈압", r"심혈관", r"뇌졸중", r"뇌"]),
    "신장·방광·생식": ("건강", -1, [r"신장", r"방광", r"생식", r"자궁", r"비뇨", r"호르몬"]),
    "폐·기관지·피부": ("건강", -1, [r"폐", r"기관지", r"호흡기", r"피부", r"비염", r"천식"]),
    "뼈·관절·근육": ("건강", -1, [r"뼈(가|에|를)", r"관절", r"허리", r"디스크", r"근육", r"목이 (아프|안 좋)"]),
    "건강 회복": ("건강", 1, [r"건강이 (좋아|회복|나아)", r"기력이 (살아|돌아|회복)", r"몸이 (좋아|가벼)"]),
    # 학업
    "시험 합격": ("학업", 1, [r"시험(에|을) (붙|합격|통과)", r"합격", r"시험운"]),
    "공부가 잘 됨": ("학업", 1, [r"공부가 (잘|되)", r"공부(운|를 잘)", r"학업(운|이 좋)", r"성적이 (오르|좋)", r"머리가 좋", r"총명"]),
    "자격·문서": ("학업", 1, [r"자격증", r"자격을", r"문서", r"계약서", r"학위", r"논문"]),
    "유학·해외 공부": ("학업", 0, [r"유학", r"해외에서 공부", r"어학"]),
    "학업 중단·방황": ("학업", -1, [r"공부가 (안|잘 안)", r"학업(이|을) (중단|포기|그만)", r"방황", r"집중이 (안|잘 안)"]),
    # 가족·관계
    "부모와 갈등·인연": ("가족", -1, [r"부모(와|랑|님과) (갈등|사이|인연이 약|떨어져)", r"아버지(와|랑|하고) (갈등|사이가|인연)", r"어머니(와|랑|하고) (갈등|사이가|인연)"]),
    "어머니·윗사람 덕": ("가족", 1, [r"어머니(의|가) (덕|도움|복)", r"윗사람(의|이) (도움|덕|끌어)", r"귀인", r"도움을 받"]),
    "자식 인연·출산": ("가족", 0, [r"자식(이|을|과|복|운|에)", r"자녀", r"출산", r"임신", r"아이를 (낳|갖)"]),
    "형제·동료와 갈등": ("가족", -1, [r"형제(와|랑|간) (갈등|다툼|사이)", r"동료(와|랑) (갈등|다툼|경쟁)", r"친구(와|랑|한테) (배신|갈등|돈)"]),
    "배신·뒤통수": ("가족", -1, [r"배신", r"뒤통수", r"사기를 당", r"이용당", r"믿었던"]),
    "고독·외로움": ("가족", -1, [r"고독", r"외로", r"혼자 (있|살|지내)", r"독신"]),
    "인간관계 원만": ("가족", 1, [r"인간관계가 (좋|원만|넓)", r"사람들이 (좋아|따르|모이)", r"인복", r"사교"]),
    # 성격·기질
    "고집·자존심": ("성격", -1, [r"고집", r"자존심", r"자기 주장", r"완고", r"꺾이지"]),
    "예민·섬세": ("성격", 0, [r"예민", r"섬세", r"감수성", r"민감"]),
    "리더십·카리스마": ("성격", 1, [r"리더십", r"카리스마", r"통솔", r"주도", r"장군"]),
    "성급·충동": ("성격", -1, [r"성급", r"충동", r"급한", r"조급", r"참지 못"]),
    "성실·책임감": ("성격", 1, [r"성실", r"책임감", r"꾸준히", r"부지런", r"묵묵히"]),
    "창의·재능": ("성격", 1, [r"창의", r"재능이", r"아이디어", r"끼가", r"예술적"]),
    "표현·언변": ("성격", 1, [r"말을 잘", r"언변", r"표현력", r"말재주", r"화술"]),
    "직관·촉": ("성격", 1, [r"직관", r"촉이 (좋|있|발달)", r"영감이", r"감이 (좋|뛰어)", r"눈치가"]),
    "완벽주의·깔끔": ("성격", 0, [r"완벽", r"깔끔", r"깐깐", r"까다"]),
    "의리·정의감": ("성격", 1, [r"의리", r"정의감", r"의협", r"불의를"]),
    "게으름·나태": ("성격", -1, [r"게으", r"나태", r"느긋", r"미루"]),
    "소심·우유부단": ("성격", -1, [r"소심", r"우유부단", r"결정을 못", r"눈치를 (많이 )?보"]),
    "자유·독립 성향": ("성격", 0, [r"자유로", r"자유를", r"독립적", r"구속(을|받|당)", r"얽매이", r"내 마음대로"]),
    "화려함·멋": ("성격", 0, [r"화려", r"멋을", r"꾸미", r"패션", r"외모"]),
    "종교·철학 성향": ("성격", 0, [r"종교", r"철학", r"영성", r"신앙", r"무속", r"절에 다", r"교회", r"수행"]),
    "말로 인한 화": ("성격", -1, [r"말(로|때문에) (화|구설|손해|적)", r"말실수", r"독설", r"말이 (거칠|세|앞서)"]),
    # 운의 흐름
    "변화·이동·이사": ("운", 0, [r"변화가 (많|크|생|오|일어)", r"변동", r"이사를", r"이사(가|를) (하|가)", r"이동(이|수|을)", r"옮기", r"터닝"]),
    "해외·먼 곳": ("운", 0, [r"해외", r"외국", r"먼 곳", r"타지"]),
    "정체·답답함": ("운", -1, [r"정체", r"답답", r"막히", r"제자리", r"풀리지 않"]),
    "발복·성공": ("운", 1, [r"발복", r"성공", r"잘 풀", r"풀리", r"승승장구", r"상승"]),
    "시련·고비": ("운", -1, [r"시련", r"고비", r"고생", r"힘든 시기", r"바닥"]),
    "구설·관재·소송": ("운", -1, [r"구설", r"관재", r"소송", r"법적", r"송사", r"벌금"]),
    "새 시작": ("운", 1, [r"새로 시작", r"새롭게", r"출발", r"시작하는"]),
    "정리·마무리": ("운", 0, [r"마무리", r"청산", r"끝맺", r"정리하는 (시기|해|때)", r"정리가 되"]),
    "준비·기다림": ("운", 0, [r"준비하는 (시기|해|때)", r"기다리는 (시기|해|때)", r"때를 (기다|봐야)", r"인내"]),
}

CATEGORIES = {
    "직장": ["직장", "회사", "조직", "승진", "이직", "취업", "공무원", "직업", "사업", "장사", "창업", "자영업", "프리랜서", "일이"],
    "금전": ["돈", "재물", "재산", "부자", "수입", "월급", "투자", "부동산", "주식", "금전", "재테크", "빚"],
    "연애": ["연애", "이성", "애인", "남자친구", "여자친구", "썸", "바람", "결혼", "배우자", "남편", "아내", "부부", "이혼", "재혼", "짝"],
    "건강": ["건강", "아프", "병원", "수술", "질병", "몸", "체력", "스트레스", "우울", "불면"],
    "학업": ["공부", "시험", "학업", "합격", "자격증", "대학", "학생", "논문", "유학"],
    "가족": ["부모", "어머니", "아버지", "엄마", "아빠", "자식", "아이", "자녀", "형제", "가족", "집안"],
}
POS_WORDS = ["좋", "길", "발복", "성공", "복이", "복을", "귀인", "잘 풀", "대박", "인기", "유리", "강점", "재능", "능력", "승진", "합격", "안정", "번창", "행운", "축복", "출세", "부자", "성취", "든든", "탁월", "총명", "매력", "도움"]
NEG_WORDS = ["나쁘", "흉", "사고", "수술", "이별", "이혼", "힘들", "어렵", "조심", "주의", "손해", "손재", "구설", "관재", "스트레스", "불안", "우울", "배신", "파산", "실패", "위험", "질병", "아프", "고생", "고독", "외로", "갈등", "싸움", "다툼", "안 좋", "좋지 않", "불리", "망", "깨지", "흔들"]

PARTICLE = re.compile(r"(이에요|예요|입니다|거든요|잖아요|습니다|니다|으로|에서|한테|이랑|까지|부터|처럼|보다|에게|께서|이나|이다|이라|라고|하고|이고|이면|면은|는데|은데|이든|든지|이고|이|가|은|는|을|를|의|에|도|로|과|와|만|나|랑|든|요|죠|고|서)$")
STOP = set("""그 이 저 것 거 게 걸 수 때 좀 더 다 또 안 못 잘 막 딱 참 뭐 왜 뭔 어떤 어느 이런 그런 저런 이렇게 그렇게 저렇게 여기 거기 저기 지금 오늘 내일 어제 이제 아까 그냥 정말 진짜 너무 많이 되게 아주 굉장히 조금 약간 항상 보통 대부분 그래서 그러면 그런데 그리고 그니까 그러니까 근데 하지만 그래도 만약 물론 사실 예를 우리 저희 여러분 여러분들 제가 저는 제 내가 나는 내 니가 네가 너 너희 얘 얘가 얘는 얘네 이거 그거 저거 이게 그게 저게 이건 그건 저건 여기서 거기서 하나 둘 셋 두 세 네 첫 번째 두번째 정도 경우 부분 얘기 말씀 이야기 생각 느낌 의미 얘기를 말 분 분들 사람 사람들 시간 오늘은 지난 다음 이번 시간은 안녕하세요 안녕하십니까 구독 좋아요 영상 채널 댓글 알림 사주 사주가 사주는 사주를 사주에 사주의 팔자 명리 명리학 일간 천간 지지 글자 오행 기운 운 운이 운을 운은 년 월 일 시 있는 없는 하는 되는 있어요 없어요 해요 돼요 있고 없고 하고 되고 있는데 없는데 하는데 되는데 있으면 없으면 하면 되면 있다 없다 하다 되다 있죠 없죠 하죠 되죠 있어 없어 해서 돼서 그래 봐요 보면 보고 보는 보시 보세요 봤을 봤는데 들어 들어요 드릴 드려 드리 말씀드 하는거 하는게 되는거 되는게 있는거 있는게 이렇 그렇 저렇 어떻게 어떻 얼마나 어디 언제 누가 누구 무슨 어떤가 같은 같아 같은데 같이 다른 모든 각 매 전 후 중 위 아래 앞 뒤 옆 속 밖 안에 위에 대해 대해서 관련 통해 위해 따라 대한 관한 하나가 하나는 하나를 이야 아니 아니라 아니고 아니면 아닌 아니에요 맞아요 맞죠 맞는 맞게 맞아 맞고 맞으면 근데요 그럼 자 네 예 음 어 아 오 응 흠 멤버십 캘린더 가입 가입하시면 구독자 링크 이벤트 참고해 참고하세요 자세한 안녕하세 안녕 반갑습니다 시작하겠습니다 말씀드리겠습니다 말씀드릴게요 시간에는 오늘도 다음에 다음시간 여러분의 공지 설명란 아래 위쪽 화면 자막 편집 촬영 업로드 홍년 캐릭터 사주인데 사주팔자 명식 원국 일관 천간지지 십성 십신 육친 지장간 신살 운세 대운 세운 월운 상반기 하반기 연도 올해 내년 작년 사이트 하나라 그러니 그러믄 이라고 라는 이라는 이런거 그런거 저런거 이거는 그거는 요런 요게 요거 그쵸 그죠 그치 맞습니다 봅시다 보자 볼게요 볼까요 그렇죠 그렇습니다 이겁니다 그겁니다 하시는 하시면 하세요 되세요 이신 이세요 계세요""".split())
HANGUL = re.compile(r"^[가-힣]{2,5}$")
WINDOW = 60


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
                docs.append({"id": r["video_id"], "title": r.get("title", ""), "channel": ch, "text": text, "chars": len(text)})
    return docs


def compile_dict(d):
    out = {}
    for key, pats in d.items():
        rx = [p if any(c in p for c in "()[]|?*+\\{") else sp(p) for p in pats]
        out[key] = re.compile("|".join(rx))
    return out


def tokens(text):
    out = []
    for w in text.split():
        w = re.sub(r"[^가-힣]", "", w)
        if not w:
            continue
        w2 = PARTICLE.sub("", PARTICLE.sub("", w))
        if HANGUL.match(w2) and w2 not in STOP:
            out.append(w2)
    return out


def analyze(key, rx, pats, docs, cats, pos_rx, neg_rx, global_tf, total_tokens, write_excerpt, claim_rx=None):
    per_doc, excerpts = [], []
    cat_counter, kw_tf, kw_df = collections.Counter(), collections.Counter(), collections.Counter()
    claim_counter, claim_docs = collections.Counter(), collections.defaultdict(set)
    kw_total = total = pos = neg = 0
    for d in docs:
        hits = [m.start() for m in rx.finditer(d["text"])]
        if not hits:
            continue
        total += len(hits)
        per_doc.append(d)
        doc_words = set()
        for h in hits[:150]:
            ctx = d["text"][max(0, h - WINDOW):h + WINDOW]
            for c, crx in cats.items():
                if crx.search(ctx):
                    cat_counter[c] += 1
            pos += len(pos_rx.findall(ctx))
            neg += len(neg_rx.findall(ctx))
            if claim_rx:
                wide = d["text"][max(0, h - 90):h + 90]
                for label, crx in claim_rx.items():
                    if crx.search(wide):
                        claim_counter[label] += 1
                        claim_docs[label].add(d["id"])
            toks = tokens(ctx)
            kw_tf.update(toks)
            doc_words.update(toks)
            kw_total += len(toks)
        kw_df.update(doc_words)
        for h in hits[:2]:
            excerpts.append((d["title"], d["text"][max(0, h - WINDOW):h + WINDOW]))
    cat_total = sum(cat_counter.values()) or 1
    categories = {c: round(cat_counter[c] / cat_total, 3) for c in CATEGORIES}
    scored = []
    for w, tf in kw_tf.items():
        if tf < 3 or kw_df[w] < 2:
            continue
        expected = global_tf[w] / total_tokens * kw_total if total_tokens else 0
        lift = tf / (expected + 1)
        if lift < 3.0:
            continue
        scored.append((lift * math.log(1 + tf), w))
    scored.sort(reverse=True)
    selfwords = set(re.sub(r"[^가-힣]", "", p) for p in pats)
    keywords = [w for _, w in scored if not any(sw and (sw in w or w in sw) for sw in selfwords if len(sw) >= 2)][:12]
    polarity = round((pos - neg) / (pos + neg), 3) if (pos + neg) else 0.0
    if write_excerpt and total:
        with io.open(os.path.join(EXC_DIR, "%s.txt" % re.sub(r'[\\/:*?"<>|+]', "_", key)), "w", encoding="utf-8") as f:
            f.write("# %s  (언급 %d회 / 영상 %d개 / 극성 %+.2f)\n키워드: %s\n\n" % (key, total, len(per_doc), polarity, ", ".join(keywords)))
            for title, ex in excerpts[:30]:
                f.write("[%s]\n  …%s…\n\n" % (title[:40], ex))
    # 주장: 2편 이상에서 등장한 것만, 문서 수 기준 정렬
    claims = [[label, c, len(claim_docs[label])] for label, c in claim_counter.items() if len(claim_docs[label]) >= 2]
    claims.sort(key=lambda x: (-x[2], -x[1]))
    return {"mentions": total, "docs": len(per_doc), "polarity": polarity, "pos": pos, "neg": neg, "categories": categories, "keywords": keywords, "claims": claims[:14]}


def main():
    docs = load_docs()
    print("문서 %d개, 총 %s자" % (len(docs), format(sum(d["chars"] for d in docs), ",")))
    os.makedirs(EXC_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    cats = {k: re.compile("|".join(map(re.escape, v))) for k, v in CATEGORIES.items()}
    pos_rx = re.compile("|".join(map(re.escape, POS_WORDS)))
    neg_rx = re.compile("|".join(map(re.escape, NEG_WORDS)))
    claim_rx = {label: re.compile("|".join(v[2])) for label, v in CLAIMS.items()}
    global_tf = collections.Counter()
    for d in docs:
        global_tf.update(tokens(d["text"]))
    total_tokens = sum(global_tf.values())

    out = {"concepts": {}, "patterns": {}}
    for name, dic in (("concepts", CONCEPTS), ("patterns", PATTERNS)):
        rxs = compile_dict(dic)
        for i, (key, rx) in enumerate(rxs.items()):
            out[name][key] = analyze(key, rx, dic[key], docs, cats, pos_rx, neg_rx, global_tf, total_tokens, write_excerpt=(name == "concepts" or "+" not in key), claim_rx=claim_rx)
            if i % 40 == 0:
                print("  %s %d/%d" % (name, i, len(rxs)))
    # 데이터 없는 패턴은 제외해 용량 절약
    out["patterns"] = {k: v for k, v in out["patterns"].items() if v["mentions"] > 0}
    meta = {"docs": len(docs), "chars": sum(d["chars"] for d in docs), "channels": sorted({(d["channel"], CHANNEL_NAME.get(d["channel"], d["channel"])) for d in docs}),
            "patterns_total": len(PATTERNS), "patterns_found": len(out["patterns"])}
    meta["claims"] = {label: [v[0], v[1]] for label, v in CLAIMS.items()}  # label -> [카테고리, 극성]
    out["meta"] = meta
    with io.open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    lines = ["# 지식 베이스 분석 리포트", "", "문서 %d개 · %s자 · 패턴 %d/%d 발견" % (meta["docs"], format(meta["chars"], ","), meta["patterns_found"], meta["patterns_total"]), ""]
    for name in ("concepts", "patterns"):
        lines += ["## %s" % name, "", "| 항목 | 언급 | 영상 | 극성 | 카테고리 | 키워드 |", "|---|---|---|---|---|---|"]
        for key, v in sorted(out[name].items(), key=lambda kv: -kv[1]["mentions"]):
            cat = " ".join("%s%d%%" % (c, round(s * 100)) for c, s in sorted(v["categories"].items(), key=lambda x: -x[1])[:3])
            cl = " / ".join("%s(%d)" % (c[0], c[2]) for c in v.get("claims", [])[:6])
            lines.append("| %s | %d | %d | %+.2f | %s | %s |" % (key, v["mentions"], v["docs"], v["polarity"], cat, cl))
        lines.append("")
    io.open(os.path.join(HERE, "report.md"), "w", encoding="utf-8").write("\n".join(lines))
    print("완료: %s (%.0f KB) 패턴 %d개" % (OUT_JSON, os.path.getsize(OUT_JSON) / 1024, len(out["patterns"])))


if __name__ == "__main__":
    main()
