# dohwador

```
dohwador/
├── crawler/            유튜브 채널 자막 크롤러
│   └── crawl.py
├── data/               크롤링 결과 (채널별 폴더)
│   └── dohwadore_saju/
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
