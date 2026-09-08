# dohwador

```
dohwador/
├── crawler/            유튜브 채널 자막 크롤러
│   └── crawl.py
├── data/               크롤링 결과 (채널별 폴더)
│   ├── dohwadore_saju/   도화도르 (videos 181 · shorts 246)
│   ├── stan4pillars/     스탠사주 (videos 1,283)
│   └── ohsaju/           오사주 (videos 246 · shorts 252)
│       ├── videos/           롱폼 자막 txt
│       ├── shorts/           쇼츠 자막 txt
│       ├── videos_index.json 전체 메타데이터
│       └── shorts_index.json
└── saju-site/          사주 사이트 (Vite + React + Three.js + lunar-javascript)
```

## 크롤러

```bash
cd crawler
python crawl.py @dohwadore_saju            # videos + shorts 전부
python crawl.py @다른채널핸들 videos        # 롱폼만
python crawl.py https://www.youtube.com/@핸들 shorts
```

- 결과는 `data/<핸들>/` 에 저장되고, 다시 실행하면 이미 받은 항목은 건너뛰고 실패분·신규분만 처리합니다.
- 멤버십 전용 영상은 로그인 없이 받을 수 없어 `members_only` 로 기록됩니다.
- 유튜브 봇 차단 우회를 위해 `web_safari → ios → web → mweb` 클라이언트를 순차 시도합니다.

## 해석 지식 베이스 (analysis/)

```bash
cd analysis
python build_kb.py     # data/ 의 자막 원문 전체를 분석
```

- **단일 개념**(일간·지지·십성·십이운성·신살·오행 과다/결핍·운·신강약)과 **조합 패턴**(60일주, 천간충/합, 지지충/육합/삼합/형/원진/귀문,
  식신제살·상관견관·관살혼잡·재다신약·군겁쟁재 등 구조, 일간×십성) 약 300개를 원문에서 찾아
  **언급 빈도 · 극성(긍정어/부정어 비율) · 운세 카테고리 비중(직장/금전/연애/건강/학업/가족) · 대표 키워드**를 계산해
  `saju-site/src/data/kb_stats.json` 으로 내보냅니다. 새 채널을 크롤링한 뒤 다시 실행하면 자동 갱신됩니다.
- `analysis/excerpts/` 는 집필 참고용 문맥 조각(사이트·git 미포함), `analysis/report.md` 는 요약 리포트입니다.
- 해석 문장은 `saju-site/src/data/knowledge.js`(일간·십성·운·신살·오행)와 `patterns.js`(조후·형국·60일주·구조·충합 조합, 吉/凶 병기)에 있고,
  `saju-site/src/saju/interpret.js` 가 사주에 해당하는 항목만 골라 **종합(형국+레이더) · 형국·조합(조후, 필요한 기운이 들어오는 대운/세운 시점, 조합 카드+원문 극성)
  · 성격 · 직장/금전/연애/건강/학업(항목별 고유 섹션 + 10년 추세 그래프) · 연도별 · 월별**로 구성합니다.

## 해석 엔진 구성

- `saju-site/src/saju/interpret.js` — 심층 해석: 형국·조후, 격국, 억부용신/희신/기신, 자리별 풀이, 통근·투출, 합충·신살, 대운 전 생애, 5대 운 점수(연·월), 원문 주장 결합
- `saju-site/src/saju/context.js` — 연·월의 합충 맥락, 절기 구간, 생활 제안
- `saju-site/src/data/knowledge.js` · `patterns.js` · `deep.js` — 해석 문장(일간·십성·운·신살·오행 / 조후·형국·60일주·구조·충합 / 격국·용신·자리·배우자상·개운)
- `saju-site/src/components/Reading.jsx` — 심층 해석 페이지

## 사주 사이트

```bash
cd saju-site
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ 정적 빌드
```

- 만세력 엔진: [lunar-javascript](https://github.com/6tail/lunar-javascript) (음양력·절기·팔자·대운·세운)
- 한국식 규칙(한국시 경도 보정, 야자시/조자시, 입춘/동지 기준, 십성·십이운성·십이신살·신살·육친·합충형파해·원진·귀문·공망·태월)은 `src/saju/tables.js`, `src/saju/calc.js` 에 구현
- 인트로 3D 성반: `src/three/CosmosScene.js`
- 배포: GitHub `main` 푸시 → Cloudflare Pages(`saju-palja.pages.dev`) 자동 빌드 (root `saju-site`, `npm run build`, 출력 `dist`)

## ?? ??? ?? ??

?? ? ? ?? ? ???(??????????????????????) ? ?? ?? ? ? ?? ? ?? ????10?/?? ??? ?? ??. ???? ? ???? ????, ???? ???? ?? ??? ?????.

- ??: `saju-site/src/components/Result.jsx`, `Reading.jsx`, `Passage.jsx`
- ?? ?? ??: `src/saju/context.js` (?? `interpret.js` ?? ??)
- ???: `src/theme.css` (????????? ??)
- ??: `cd saju-site && npm test && npm run build`
- ??? ??: [?? ??](saju-site/REVIEW.md)
