import * as T from './tables.js';

/**
 * 운(대운·세운·월운)의 한 기둥이 원국과 맺는 관계
 *  - 천간: 합(화기 오행)·충
 *  - 지지: 육합·반합·삼합 완성·방합 완성·충·형(삼형/상형/자형)·파·해·원진·귀문
 *  - 지장간: 운 지지의 지장간 ↔ 원국 천간(통근·암합·암충), 운 천간 ↔ 원국 지지의 지장간(암합·암충)
 */
const POS_KO = { year: '년', month: '월', day: '일', time: '시' };
const SAMHAP_EL = { 子: '水', 卯: '木', 午: '火', 酉: '金' };
const BANGHAP_EL = { 寅卯辰: '木', 巳午未: '火', 申酉戌: '金', 亥子丑: '水' };
const pairHas = (table, a, b) => table.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
const hapResult = (a, b) => T.STEM_HAP_RESULT[[a, b].sort((x, y) => T.STEMS.indexOf(x) - T.STEMS.indexOf(y)).join('')];
const NOTE = {
  day: { 충: '일지 충 — 거처·배우자·몸에 변동이 생기는 신호', 합: '일지 합 — 인연·결합·안정의 기운', 원진: '일지 원진 — 가까운 사람과의 감정 소모', 형: '일지 형 — 수술·다툼·법적 문제 주의', 반합: '일지와 반합 — 배우자·개인 영역에 세력이 붙음', 파: '일지 파 — 관계·약속이 깨지기 쉬움', 해: '일지 해 — 가까운 사이의 오해' },
  month: { 충: '월지 충 — 직장·사회 환경이 바뀌는 신호', 합: '월지 합 — 직장·인맥에서 좋은 결합', 원진: '월지 원진 — 조직 안의 갈등', 형: '월지 형 — 직장·부모 문제의 압박', 반합: '월지와 반합 — 사회 무대에 세력이 붙음', 파: '월지 파 — 일의 틀이 흔들림', 해: '월지 해 — 동료와의 마찰' },
  year: { 충: '년지 충 — 집안·터전·윗사람 영역의 변화', 합: '년지 합 — 집안·외부 인연의 도움', 원진: '년지 원진 — 윗사람·집안과의 불화', 형: '년지 형 — 집안·법적 문제 주의', 반합: '년지와 반합 — 외부 환경이 힘을 보탬', 파: '년지 파 — 오래된 관계의 균열', 해: '년지 해 — 윗사람과의 오해' },
  time: { 충: '시지 충 — 자식·계획·말년 영역의 변동', 합: '시지 합 — 자식·미래 계획의 결실', 원진: '시지 원진 — 아랫사람과의 갈등', 형: '시지 형 — 자식·건강 문제 주의', 반합: '시지와 반합 — 미래 계획에 세력이 붙음', 파: '시지 파 — 계획 수정', 해: '시지 해 — 아랫사람과의 마찰' },
};

export function unRelations(data, g) {
  const { pillars, order } = data;
  const stems = order.filter((p) => pillars[p]).map((p) => ({ pos: p, ch: pillars[p].stem }));
  const branches = order.filter((p) => pillars[p]).map((p) => ({ pos: p, ch: pillars[p].branch }));
  const sLabel = (p) => (p === 'day' ? '일간' : `${POS_KO[p]}간`);
  const bLabel = (p) => `${POS_KO[p]}지`;
  const stem = [], branch = [], hidden = [], tags = [];
  const tag = (short, tone) => { if (!tags.some((t) => t.short === short)) tags.push({ short, tone }); };
  const add = (arr, label, tone, type, pos) => arr.push({ key: label, label, tone, type, pos });

  // 천간
  for (const s of stems) {
    if (pairHas(T.STEM_HAP, g.stem, s.ch)) { add(stem, `${g.stem} ↔ ${sLabel(s.pos)} ${s.ch} 합(${hapResult(g.stem, s.ch)})`, 'good', '합', s.pos); tag(`${POS_KO[s.pos]}간합`, 'good'); }
    if (pairHas(T.STEM_CHUNG, g.stem, s.ch)) { add(stem, `${g.stem} ↔ ${sLabel(s.pos)} ${s.ch} 충`, 'bad', '충', s.pos); tag(`${POS_KO[s.pos]}간충`, 'bad'); }
  }

  // 지지 (원국 각 지지와 1:1)
  for (const b of branches) {
    const L = `${g.branch} ↔ ${bLabel(b.pos)} ${b.ch}`;
    const isChung = pairHas(T.BRANCH_CHUNG, g.branch, b.ch);
    if (isChung) { add(branch, `${L} 충`, 'bad', '충', b.pos); tag(`${POS_KO[b.pos]}충`, 'bad'); }
    if (pairHas(T.BRANCH_YUKHAP, g.branch, b.ch)) { add(branch, `${L} 육합`, 'good', '합', b.pos); tag(`${POS_KO[b.pos]}합`, 'good'); }
    const tri = T.BRANCH_SAMHAP.find((t) => t.includes(g.branch) && t.includes(b.ch) && g.branch !== b.ch);
    if (tri) { add(branch, `${L} 반합(${tri.join('')} ${SAMHAP_EL[tri[1]]})`, 'good', '반합', b.pos); tag(`${POS_KO[b.pos]}반합`, 'good'); }
    if (!isChung && pairHas(T.BRANCH_HYEONG_PAIRS, g.branch, b.ch)) { add(branch, `${L} 형`, 'bad', '형', b.pos); tag(`${POS_KO[b.pos]}형`, 'bad'); }
    if (pairHas(T.BRANCH_SANGHYEONG, g.branch, b.ch)) { add(branch, `${L} 상형`, 'bad', '형', b.pos); tag(`${POS_KO[b.pos]}형`, 'bad'); }
    if (g.branch === b.ch && T.BRANCH_JAHYEONG.includes(g.branch)) { add(branch, `${L} 자형`, 'bad', '형', b.pos); tag(`${POS_KO[b.pos]}형`, 'bad'); }
    if (pairHas(T.BRANCH_PA, g.branch, b.ch)) { add(branch, `${L} 파`, 'bad', '파', b.pos); tag(`${POS_KO[b.pos]}파`, 'bad'); }
    if (pairHas(T.BRANCH_HAE, g.branch, b.ch)) { add(branch, `${L} 해`, 'bad', '해', b.pos); tag(`${POS_KO[b.pos]}해`, 'bad'); }
    if (pairHas(T.BRANCH_WONJIN, g.branch, b.ch)) { add(branch, `${L} 원진`, 'bad', '원진', b.pos); tag(`${POS_KO[b.pos]}원진`, 'bad'); }
    if (pairHas(T.BRANCH_GWIMUN, g.branch, b.ch)) { add(branch, `${L} 귀문`, 'bad', '귀문', b.pos); tag(`${POS_KO[b.pos]}귀문`, 'bad'); }
  }
  // 세력 완성 (원국 두 글자 + 운 한 글자)
  for (const tri of T.BRANCH_SAMHAP) if (tri.includes(g.branch)) {
    const others = tri.filter((t) => t !== g.branch);
    if (others.every((o) => branches.some((b) => b.ch === o))) { add(branch, `${g.branch} + 원국 ${others.join('·')} 삼합 완성(${SAMHAP_EL[tri[1]]})`, 'good', '삼합'); tag('삼합', 'good'); }
  }
  for (const tri of T.BRANCH_BANGHAP) if (tri.includes(g.branch)) {
    const others = tri.filter((t) => t !== g.branch);
    if (others.every((o) => branches.some((b) => b.ch === o))) { add(branch, `${g.branch} + 원국 ${others.join('·')} 방합 완성(${BANGHAP_EL[tri.join('')]})`, 'good', '방합'); tag('방합', 'good'); }
  }
  for (const tri of T.BRANCH_SAMHYEONG) if (tri.includes(g.branch)) {
    const others = tri.filter((t) => t !== g.branch);
    if (others.every((o) => branches.some((b) => b.ch === o))) { add(branch, `${g.branch} + 원국 ${others.join('·')} 삼형 완성`, 'bad', '삼형'); tag('삼형', 'bad'); }
  }

  // 지장간: 운 지지 속 글자 ↔ 원국 천간
  for (const h of T.HIDDEN_STEMS[g.branch]) for (const s of stems) {
    if (h === s.ch) add(hidden, `${g.branch}中 ${h} = ${sLabel(s.pos)} ${s.ch} 통근`, 'good', '통근', s.pos);
    else if (pairHas(T.STEM_HAP, h, s.ch)) add(hidden, `${g.branch}中 ${h} ↔ ${sLabel(s.pos)} ${s.ch} 암합(${hapResult(h, s.ch)})`, 'mid', '암합', s.pos);
    else if (pairHas(T.STEM_CHUNG, h, s.ch)) add(hidden, `${g.branch}中 ${h} ↔ ${sLabel(s.pos)} ${s.ch} 암충`, 'bad', '암충', s.pos);
  }
  // 지장간: 운 천간 ↔ 원국 지지 속 글자
  for (const b of branches) for (const h of T.HIDDEN_STEMS[b.ch]) {
    if (pairHas(T.STEM_HAP, g.stem, h)) add(hidden, `${g.stem} ↔ ${bLabel(b.pos)} ${b.ch}中 ${h} 암합(${hapResult(g.stem, h)})`, 'mid', '암합', b.pos);
    else if (pairHas(T.STEM_CHUNG, g.stem, h)) add(hidden, `${g.stem} ↔ ${bLabel(b.pos)} ${b.ch}中 ${h} 암충`, 'bad', '암충', b.pos);
  }

  // 한 줄 풀이: 지지 관계 중 의미가 큰 것 2개
  const prio = { 충: 5, 삼합: 5, 삼형: 5, 형: 4, 원진: 4, 합: 3, 반합: 3, 방합: 3, 파: 2, 해: 2, 귀문: 2 };
  const notes = [...branch].sort((a, b) => (prio[b.type] || 0) - (prio[a.type] || 0)).map((x) => (x.pos ? NOTE[x.pos]?.[x.type] : x.type === '삼합' || x.type === '방합' ? `${x.type} 완성 — 그 오행의 일이 한 판 크게 움직임` : x.type === '삼형' ? '삼형 완성 — 다툼·수술·법적 문제를 특히 조심' : null)).filter(Boolean);
  const note = [...new Set(notes)].slice(0, 2).join(' / ');

  const badness = tags.filter((t) => t.tone === 'bad').length, goodness = tags.filter((t) => t.tone === 'good').length;
  return { stem, branch, hidden, tags: tags.slice(0, 4), note, badness, goodness };
}
