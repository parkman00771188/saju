# 사주 전문가 강의 지식 베이스 (analysis/knowledge/)

크롤링·교정된 유튜브 강의 자막(`data/<채널>/{videos,shorts}/*.txt`) 한 편마다, Gemini 3.8 Flash(thinking high)가 읽고
"어떤 조건(글자·조합·시기)이면 어떤 결과·행동·특징이 나온다"를 구조화한 JSON 이 여기에 쌓입니다.
앞으로 사주 해석에 참고하는 기반 자료이며, 파일은 원문 파일과 1:1 로 대응합니다.

```
analysis/knowledge/<채널>/<videos|shorts>/<원문 파일명>.json
```

## 파일 구조

| 필드 | 뜻 |
|---|---|
| `source` `channel` `tab` `video_id` `title` `url` `upload` `duration_sec` `views` | 원문 메타데이터 |
| `summary` | 영상 내용 3~5문장 요약 |
| `topics` | 다루는 영역 (직장 / 금전 / 연애·결혼 / 건강·수명 / 학업·시험 / 가족·자식 / 성격·기질 / 운세 흐름 / 궁합·인간관계 / 개운·조언 / 명리 이론 / 기타) |
| `scope` | 일반 원리 / 특정 연도 운세 / 특정 월 운세 / 특정 대운·시기 / 사례·상담 / 기타 |
| `years` | 영상이 다루는 연도 |
| `claims[]` | **조건 → 결과** 목록 (아래) |
| `insights[]` | 조건으로 쓰기 어려운 해석 원리·통찰 |
| `keywords[]` | 핵심어 |

### claims[] 항목

| 필드 | 뜻 | 예 |
|---|---|---|
| `conditions[]` | `{type, value}` 조건들. 여러 개면 모두 겹쳐야 성립 | `일간=갑`, `월지=정관`, `대운=병오 대운`, `세운=2026년 병오년`, `신살=귀문관살`, `오행 과다=화` |
| `outcome` | 결과·행동·특징 한 문장 | "바람을 피우기 쉽다", "40대에 큰돈을 번다", "명이 짧을 수 있다" |
| `tag` | 집계용 라벨 (build_kb.py 의 CLAIMS 라벨 + 추가 라벨) | `외도·바람기`, `큰 재물·부자`, `명이 짧음·수명 위험` |
| `category` | 영역 | `연애·결혼` |
| `polarity` | 1 좋음 / 0 중립 / -1 나쁨 | |
| `certainty` | 확언 / 경향 / 조건부 / 추측 | |
| `time` | 해당 시기 (`항상` 이 아니면 그 시기에만) | "2026년 5월", "병오 대운", "30대" |
| `advice` | 함께 제시된 조언·개운법 | |
| `quote` | 근거 원문 구절 (120자 이내) | |

조건 `type` 목록: 일간·일주·띠·년주·월주·시주·년지·월지·일지·시지·천간·지지·십성·십성 위치·십성 과다·십성 없음·신살·오행 과다·오행 부족·오행 구성·격국·신강약·구조·조합·합충형파해·12운성·공망·대운·세운·월운·연령대·성별·계절·절기·기타

## 만드는 법 / 갱신

```bash
# 1) 원문 교정 (새로 크롤링한 파일만 처리됨)
python analysis/rewrite_transcripts.py
# 2) 지식 추출 (교정 완료된 파일 중 미추출분만; 루트 .env 의 GEMINI_API_KEY 필요)
python analysis/extract_knowledge.py --workers 12
python analysis/extract_knowledge.py --status
# 3) 집계 → 앱 색인(saju-site/public/kb_claims.json) + 사람이 읽는 정리본(analysis/knowledge_digest.md)
python analysis/build_knowledge.py
```

- 진행 기록: `analysis/knowledge_manifest.json` (파일별 원문 해시·claims 수), 로그 `analysis/extract_log.txt`
- 원문이 바뀐 파일(해시 불일치)은 다음 실행 때 다시 추출됩니다.

## 해석 엔진에서 쓰는 방법 (요약)

`build_knowledge.py` 가 조건을 앱 키로 정규화해 `kb_claims.json` 의 `by_key` 에 색인합니다.
`saju-site/src/saju/interpret.js` 는 사용자의 글자(일간·일주·띠·월지/일지 지지·십성 위치·신살·오행 과다/결핍·격국·신강약·구조·대운·나이·성별·계절)로
키를 만들어 항목을 모으고, **문서 수 × 리프트(그 글자에서 유독 자주 나오는 정도) × 키 특이도**로 순위를 매깁니다.
두 조건이 함께 걸린 주장(`A&B` 짝 키)은 조합에만 해당하는 이야기라 더 무겁게 봅니다.
연도가 걸린 주장(`Y2026`, `Y2026&조건`)은 일반 성향과 섞지 않고 "올해와 이달" 페이지의 **전문가들이 말하는 올해의 나** 에만 씁니다.
정리본(`knowledge_digest.md`)은 조건별로 자주 나오는 결과·인용·조언을 사람이 훑어보기 위한 문서입니다.
