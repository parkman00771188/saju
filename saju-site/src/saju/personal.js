import * as K from '../data/knowledge.js';
import * as D from '../data/deep.js';
import * as P from '../data/patterns.js';
import { ELEMENT_KO, STEM_KO, BRANCH_KO, STEM_ELEMENT } from './tables.js';
import { expertStory } from './expert.js';

/**
 * 영역별 "개인 맞춤" 섹션 — 실제 글자·자리·개수·관계에서 계산하되, 명리 용어는 처음 나올 때 쉬운 말로 풀어 쓴다.
 * 반환: { [cat]: { headline, sections: [{ title, paras }] } }
 */
const first = (s) => (s?.match(/^[^.!?]*[.!?]/) || [s || ''])[0];
const uniq = (a) => [...new Set(a.filter(Boolean))];
const POS_KO = { year: '년', month: '월', day: '일', time: '시' };
const POS_ROLE = { year: '집안·초년·윗사람', month: '직장·사회', day: '나·배우자·몸', time: '자식·말년·계획' };
const grp = (g) => K.TEN_GOD_GROUP[g] || '';
const GEN = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const CTRL = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const JAEGO = { 木: '未', 火: '戌', 金: '丑', 水: '辰' };
const READ = { ...STEM_KO, ...BRANCH_KO };
const hasBatchim = (ch) => { const r = READ[ch] || ch; const c = r.charCodeAt(r.length - 1); return c >= 0xac00 && c <= 0xd7a3 ? (c - 0xac00) % 28 !== 0 : false; };
const GA = (ch) => (hasBatchim(ch) ? '이' : '가');
const WA = (ch) => (hasBatchim(ch) ? '과' : '와');
const EUL = (w) => (hasBatchim(w.slice(-1)) ? '을' : '를');
const IRA = (w) => (hasBatchim(w.slice(-1)) ? '이라' : '라');
const REL_KO = { chung: '충', wonjin: '원진', hyeong: '형', pa: '파', hae: '해', gwimun: '귀문', yukhap: '합', samhap: '삼합', banghap: '방합', stemHap: '천간합' };
// 쉬운 말 풀이
const REL_EASY = { 충: '서로 부딪혀 움직이는 힘(변화·이동)', 원진: '이유 없는 미움과 오해가 쌓이는 관계', 형: '서로 조정하느라 생기는 마찰(다툼·수술·법 문제 주의)', 파: '약속이나 틀이 깨지기 쉬운 관계', 해: '은근한 방해가 끼는 관계', 귀문: '예민한 직관과 날카로운 신경', 합: '서로 끌어당겨 묶이는 인연', 삼합: '여러 글자가 한 팀으로 뭉치는 큰 힘', 방합: '같은 계절 글자가 뭉쳐 그 기운이 세지는 힘', 천간합: '겉으로 드러난 마음이 한쪽으로 묶이는 힘' };
const STAGE_EASY = {
  장생: '막 태어나 자라는 단계 — 새로 배우고 성장하는 환경이 맞아요', 목욕: '멋을 내고 흔들리는 청춘 단계 — 자유로운 분위기와 변화가 잦은 일이 어울려요',
  관대: '옷을 갖춰 입고 사회에 나가는 단계 — 자격·직함·체계가 있는 자리에서 빛나요', 건록: '제 힘으로 벌어 서는 단계 — 실력으로 자리 잡고 독립적으로 일해요',
  제왕: '가장 힘이 센 단계 — 책임과 권한이 큰 자리, 이끄는 역할이 맞아요', 쇠지: '무르익어 조금 기우는 단계 — 경험을 나누는 자문·관리형이 맞아요',
  병지: '기운이 느슨해지는 단계 — 사람을 돌보는 일, 완급 있는 일이 맞아요', 사지: '멈춰서 깊이 생각하는 단계 — 연구·기획·전문 기술처럼 파고드는 일이 맞아요',
  묘지: '거둬서 저장하는 단계 — 관리·재무·기록처럼 모으고 지키는 일이 맞아요', 절지: '끊고 다시 시작하는 단계 — 전환이 잦고 새 판을 짜는 일에 강해요',
  태지: '씨앗이 맺히는 단계 — 준비·기획 같은 초기 단계에서 힘이 나요', 양지: '보호받으며 길러지는 단계 — 교육·보호·서비스처럼 키우는 일이 맞아요',
};
const GOD_EASY = { 관성: '회사·직함·책임을 뜻하는 글자', 인성: '배움·자격·문서를 뜻하는 글자', 재성: '돈과 현실 감각을 뜻하는 글자', 식상: '표현·재능·만드는 힘을 뜻하는 글자', 비겁: '나와 같은 편(동료·형제·경쟁자)을 뜻하는 글자' };

export function buildPersonal({ data, prof, gyeok, yong, needEl, evidenceByCat, evidence, daeunAll, spouseGroup, st, gongmangSet }) {
  const { pillars, detail, order, dayStem, relations = {}, sinsal = {}, elements = {}, missing = [], strongest } = data;
  const ko = ELEMENT_KO;
  const present = order.filter((k) => pillars[k]);
  const dayEl = STEM_ELEMENT[dayStem];
  const gz = (k) => `${pillars[k].stem}${pillars[k].branch}`;
  const lv = (g) => prof.level(g);

  const seats = (group) => {
    const out = [];
    for (const k of present) {
      const d = detail[k];
      if (k !== 'day' && grp(d.stemGod) === group) out.push({ pos: k, where: '간', god: d.stemGod, ch: pillars[k].stem });
      if (grp(d.branchGod) === group) out.push({ pos: k, where: '지', god: d.branchGod, ch: pillars[k].branch });
    }
    return out;
  };
  const hiddenSeats = (group) => present.flatMap((k) => detail[k].hidden.slice(0, -1).filter((h) => grp(h.god) === group).map((h) => ({ pos: k, ch: h.stem, god: h.god })));
  const seatText = (list) => list.map((x) => `${POS_KO[x.pos]}${x.where} ${x.ch}(${x.god})`).join(', ');
  const hasGod = (g) => present.some((k) => detail[k].branchGod === g || (k !== 'day' && detail[k].stemGod === g));
  const rel = (name) => relations[name] || [];
  const relsAt = (pos, names) => names.flatMap((n) => rel(n).filter((r) => r.chars.some((c) => c.pos === pos)).map((r) => ({ kind: REL_KO[n], other: r.chars.find((c) => c.pos !== pos) })));
  const BAD = ['chung', 'wonjin', 'hyeong', 'pa', 'hae', 'gwimun'], GOOD = ['yukhap', 'samhap', 'banghap'];
  const salAt = (pos) => (sinsal[pos] || []).map((x) => x.name);
  const hasSal = (n) => present.some((k) => salAt(k).includes(n));
  const salWhere = (n) => present.filter((k) => salAt(k).includes(n)).map((k) => `${POS_KO[k]}주`).join('·');
  const posNames = (pos) => `${POS_KO[pos]}주(${POS_ROLE[pos]})`;

  /** 자리의 합·충·형·파·해를 쉬운 말로 */
  const meetings = (pos, area, none) => {
    const br = pillars[pos].branch;
    const bad = relsAt(pos, BAD), good = relsAt(pos, GOOD);
    const s = [];
    for (const b of bad) {
      if (!b.other) continue;
      s.push(`${POS_KO[pos]}지 ${br}${WA(br)} ${POS_KO[b.other.pos]}지 ${b.other.ch}${GA(b.other.ch)} 만나 ${b.kind}${EUL(b.kind)} 이뤄요. ${b.kind}${hasBatchim(b.kind.slice(-1)) ? '은' : '는'} ${REL_EASY[b.kind]}${IRA(REL_EASY[b.kind])}, ${area}${WA(area.slice(-1))} ${POS_ROLE[b.other.pos]} 사이에서 ${b.kind === '충' ? '변화와 이동이 잦고 한자리에 오래 머물기 어려워요' : b.kind === '원진' ? '이유 없이 서운해지는 일이 생겨요 — 감정보다 사실로 대화하세요' : b.kind === '형' ? '조정하느라 마찰이 생기니 서류·건강·법적인 것을 미리 챙기세요' : b.kind === '귀문' ? '감이 예민하게 작동해요 — 잠과 운동으로 신경을 풀어 주세요' : '약속이 틀어지거나 은근한 방해가 끼기 쉬우니 기대를 조금 낮추고 문서로 남기세요'}.`);
    }
    const goodByOther = uniq(good.filter((g) => g.other).map((g) => `${POS_KO[g.other.pos]}지 ${g.other.ch}`));
    if (goodByOther.length) s.push(`반대로 ${POS_KO[pos]}지 ${br}${GA(br)} ${goodByOther.join('·')}${WA(goodByOther[goodByOther.length - 1].slice(-1))} ${uniq(good.map((g) => g.kind)).join('·')}으로 묶여 있어요. ${REL_EASY[good[0].kind]}${IRA(REL_EASY[good[0].kind])} ${area}에서 사람과 인연이 자연스럽게 따라붙고, 혼자보다 함께할 때 일이 풀려요.`);
    if (!s.length) s.push(none);
    return s;
  };
  const ganyeo = (area) => {
    const where = present.filter((k) => salAt(k).includes('간여지동'));
    if (!where.length) return null;
    return `${where.map((k) => `${POS_KO[k]}주 ${gz(k)}`).join('·')}는 위아래 글자가 같은 기운인 간여지동이에요. 쉽게 말해 "내 뜻이 분명하고 잘 꺾이지 않는 기둥"이라, ${area}에서는 주도권을 쥐려는 힘이 세요. 역할과 권한이 분명한 자리에서는 강점이지만, 맞춰 주기만 해야 하는 자리에서는 답답함이 커요.`;
  };
  const stageEasy = (pos, label) => `${label} 자리인 ${POS_KO[pos]}지 ${pillars[pos].branch}의 기운 단계(12운성)는 '${detail[pos].stage}'예요. ${STAGE_EASY[detail[pos].stage] || ''}.`;
  const salEasy = (pos, area) => { const names = salAt(pos).filter((n) => K.SINSAL[n] && n !== '간여지동'); return names.length ? `${POS_KO[pos]}주에는 ${names.slice(0, 3).map((n) => K.SINSAL[n].title).join('·')}이라는 별이 붙어 있어요. ${area}에서는 ${names.slice(0, 2).map((n) => first(K.SINSAL[n].text)).join(' ')}` : null; };
  const gongEasy = (pos, area) => (gongmangSet?.has(pillars[pos].branch) ? `${POS_KO[pos]}주 ${gz(pos)}는 공망, 곧 '비어 있는 자리'예요. ${area}에서 기대만큼 손에 잡히지 않는 허전함이 있을 수 있는데, 그 빈자리는 물질보다 배움·의미 같은 정신적인 가치로 채워질 때 편해져요.` : null);
  const yongEasy = (group, area) => yong.group === group ? `${group}(${GOD_EASY[group]})은 이 사주에 가장 필요한 기운(용신)이에요. 그래서 ${area}에 힘을 쓰는 것이 곧 나를 살리는 방향이에요.` : yong.groups?.gi === group ? `${group}(${GOD_EASY[group]})은 이 사주의 균형을 깨는 기운(기신)이에요. ${area}에 너무 매달리면 소모가 커지니 결과가 따라오게 가볍게 두세요.` : yong.groups?.hee === group ? `${group}(${GOD_EASY[group]})은 용신을 돕는 기운(희신)이라 ${area}에서 힘을 받을 수 있어요.` : null;
  const kbEasy = (cat) => {
    const rows = (evidenceByCat?.[cat] || []).slice(0, 4);
    if (!rows.length) return null;
    const from = uniq(rows.flatMap((r) => r.from)).slice(0, 3).join(', ');
    const pos = rows.filter((r) => r.pol > 0), neg = rows.filter((r) => r.pol < 0), neu = rows.filter((r) => r.pol === 0);
    const tell = (r) => `'${r.label}'(${r.n || r.docs}회)`;
    return [
      `이 사주에 들어 있는 ${from} 같은 조합을 사주 전문가들이 다룰 때, ${cat}과 관련해 가장 자주 나오는 이야기는 ${rows.slice(0, 3).map(tell).join(', ')}이에요.`,
      pos.length ? `좋게 보는 쪽은 ${pos.map((r) => r.label).join('·')}예요. ${first(P.CLAIM_TEXT[pos[0].label] || '')}` : null,
      neg.length ? `조심하라는 쪽은 ${neg.map((r) => r.label).join('·')}예요. ${first(P.CLAIM_TEXT[neg[0].label] || '')}` : null,
      !pos.length && !neg.length && neu.length ? first(P.CLAIM_TEXT[neu[0].label] || '') : null,
    ].filter(Boolean);
  };
  const placeEasy = (list, pos, texts) => (list.some((x) => x.pos === pos) ? texts[pos] : null);
  // 이 사주의 구조 사실들 — 전문가 이야기와 연결하는 근거
  const sp = seats(spouseGroup);
  const facts = {
    mixedGwan: hasGod('정관') && hasGod('편관'), sanggwanGyeon: hasGod('상관') && hasGod('정관'),
    gwanIn: seats('관성').length > 0 && seats('인성').length > 0, jaeSaengGwan: seats('재성').length > 0 && seats('관성').length > 0, siksangJae: seats('식상').length > 0 && seats('재성').length > 0,
    jaengjae: lv('비겁') === '강' && lv('재성') !== '무', jaedaSinyak: st.label === '신약' && lv('재성') === '강', sinyak: st.label === '신약',
    dayChung: relsAt('day', ['chung']).length > 0, monthChung: relsAt('month', ['chung']).length > 0, dayWonjin: relsAt('day', ['wonjin']).length > 0, dayHap: relsAt('day', GOOD).length > 0,
    hasYeokma: hasSal('역마'), hasDohwa: hasSal('도화'), hasHongyeom: hasSal('홍염'), hasBaekho: hasSal('백호대살'), hasYangin: hasSal('양인'), hasGwimun: hasSal('귀문관살'), hasGoegang: hasSal('괴강'), hasHyeonchim: hasSal('현침살'), hasGoran: hasSal('고란살'), hasHwagae: hasSal('화개'), hasMunchang: hasSal('문창귀인') || hasSal('학당귀인'), hasTaegeuk: hasSal('태극귀인'), hasGuiin: ['천을귀인', '천덕귀인', '월덕귀인', '복성귀인'].some(hasSal), ganyeo: hasSal('간여지동'),
    hasJeonggwan: hasGod('정관'), hasPyeongwan: hasGod('편관'), hasPyeonjae: hasGod('편재'), hasPyeonin: hasGod('편인'), hasSanggwan: hasGod('상관'),
    noGwan: lv('관성') === '무', noJae: lv('재성') === '무', noIn: lv('인성') === '무',
    strongIn: lv('인성') === '강', strongGwan: lv('관성') === '강', strongJae: lv('재성') === '강', strongSik: lv('식상') === '강', strongBi: lv('비겁') === '강',
    gwanMonth: seats('관성').some((x) => x.pos === 'month'), jaeMonth: seats('재성').some((x) => x.pos === 'month'), jaeDay: seats('재성').some((x) => x.pos === 'day'),
    jewangMonth: ['제왕', '건록'].includes(detail.month.stage), gyeokGwan: ['정관격', '정인격'].includes(gyeok.key),
    jaego: !!JAEGO[GEN[GEN[dayEl]]] && present.some((k) => pillars[k].branch === JAEGO[GEN[GEN[dayEl]]]),
    noSpouse: sp.length === 0, spouseMany: sp.length >= 3, spouseDay: sp.some((x) => x.pos === 'day'), spouseTime: sp.some((x) => x.pos === 'time'), spouseMixed: uniq(sp.map((x) => x.god)).length > 1,
    gongDay: !!gongmangSet?.has(pillars.day.branch), strongSu: (elements['水'] || 0) >= 3, strongHwa: (elements['火'] || 0) >= 3,
  };
  const expert = (cat) => expertStory(cat, evidenceByCat?.[cat] || [], facts, evidence) || kbEasy(cat) || ['이 조합에 대한 전문가 언급이 아직 충분히 모이지 않았어요.'];

  const out = {};

  // ---------- 직장 ----------
  {
    const gw = seats('관성'), hid = hiddenSeats('관성');
    const jeong = gw.filter((x) => x.god === '정관').length, pyeon = gw.filter((x) => x.god === '편관').length;
    const s1 = [];
    if (!gw.length) {
      s1.push(`회사·직함·책임을 뜻하는 글자(관성)가 겉으로 드러난 자리에는 없어요.${hid.length ? ` 지지 속에 숨은 글자(지장간) ${hid.map((h) => `${POS_KO[h.pos]}지 ${h.ch}`).join('·')}에만 있어요.` : ''} 쉽게 말해 조직이 나를 붙잡는 힘이 약한 대신 간섭도 적은 사주예요.`);
      s1.push(`그래서 직함으로 평가받는 길보다 실력과 결과물로 평가받는 길 — ${(gyeok.career || []).slice(0, 3).join(', ')} — 이 잘 맞아요. 직장은 "오래 있을 곳"보다 "내 것을 만들 수 있는 곳"으로 고르세요.`);
    } else {
      s1.push(`회사·직함·책임을 뜻하는 글자(관성)는 ${seatText(gw)}${hid.length ? `, 그리고 지지 속에 숨은 ${hid.map((h) => h.ch).join('·')}` : ''}에 있어요. 모두 ${gw.length + hid.length}자리예요.`);
      s1.push(placeEasy(gw, 'month', { month: '그중 월주(사회 무대) 자리에 관성이 있어요. 조직 생활이 체질에 맞고, 직장 인연이 비교적 일찍 열리는 편이에요.' }) || placeEasy(gw, 'day', { day: '관성이 일지(내 자리)에 있어요. 책임감이 몸에 붙어 있고, 배우자나 가까운 동료가 직장 문제와 얽히기 쉬워요.' }) || placeEasy(gw, 'time', { time: '관성이 시주(말년·계획 자리)에 있어요. 직함과 인정이 늦게 오는 대신 오래 가요.' }) || '관성이 년주(집안·초년 자리)에 있어요. 조직형 집안 배경이 있고 윗사람의 영향이 커요.');
      if (jeong && pyeon) s1.push(`정관(정해진 규칙 안의 자리)과 편관(압박이 센 도전적인 자리)이 함께 있어요. 안정된 직장과 도전적인 일, 두 갈래 길이 동시에 열리는 구조라 두 가지를 병행하거나 직장이 바뀌는 일이 생기기 쉬워요. 하나를 주(主)로, 하나를 부(副)로 정해 두면 힘이 덜 들어요.`);
      else if (pyeon) s1.push('정관 없이 편관만 있어요. 규칙적인 사무 조직보다 성과와 압박이 분명한 자리(현장·기술·전문·영업)에서 힘이 나고, 강한 상사를 만나기 쉬워요. 압박을 견디면 그만큼 빨리 커요.');
      else s1.push('정관 위주예요. 규칙과 절차가 분명한 조직에서 신뢰를 쌓아 차근차근 올라가는 유형이에요.');
    }
    const ins = seats('인성'), sik = seats('식상'), jae = seats('재성');
    const helpers = [];
    if (gw.length && ins.length) helpers.push(`회사 글자(${gw[0].ch})가 배움 글자(${ins[0].ch})를 낳는 흐름(관인상생)이 있어요. 자격·문서·공부가 곧 자리로 이어지는 좋은 구조예요.`);
    if (gw.length && jae.length) helpers.push(`돈 글자(${jae[0].ch})가 회사 글자(${gw[0].ch})를 밀어 주는 흐름(재생관)이 있어요. 실적과 매출이 직위로 바뀌는 사람이에요.`);
    if (hasGod('상관') && hasGod('정관')) helpers.push('표현 글자(상관)가 규칙 글자(정관)와 부딪히는 구조(상관견관)가 있어요. 상사나 규정과 의견 충돌이 잦을 수 있으니 말보다 결과물로 보여 주는 편이 유리해요.');
    if (hasGod('식신') && hasGod('편관')) helpers.push('재능 글자(식신)가 압박 글자(편관)를 다스리는 구조(식신제살)가 있어요. 압박을 실력으로 눌러 가는 힘이 있어요.');
    if (!gw.length && sik.length) helpers.push(`표현·재능 글자(식상) ${sik.map((x) => x.ch).join('·')}이 살아 있어 내가 만든 것으로 평가받는 길이 열려 있어요.`);
    const s2 = [
      ...meetings('month', '직장 생활', `직장 자리인 월지 ${pillars.month.branch}는 다른 글자와 크게 부딪히지 않아요. 직장 환경이 비교적 안정적으로 유지되는 편이에요.`),
      ganyeo('직장'),
      stageEasy('month', '직장'),
      salEasy('month', '직장'), gongEasy('month', '직장'),
      yongEasy('관성', '조직과 책임') || yongEasy('식상', '표현과 생산') || yongEasy('인성', '자격과 배움'),
    ].filter(Boolean);
    out.직장 = {
      headline: !gw.length ? `회사 글자(관성)가 없어 직함보다 실력으로 평가받는 길이 맞아요.` : `회사·직함 글자(관성)가 ${gw.length}자리${gw.some((x) => x.pos === 'month') ? ', 그중 사회 무대인 월주에도' : ''} 있어 ${jeong && pyeon ? '두 갈래 길이 함께 열리는' : pyeon ? '압박 속에서 빨리 크는' : '차근차근 올라가는'} 직장운이에요.`,
      sections: [
        { title: '내 사주에서 회사·직함을 뜻하는 글자', paras: [...s1, ...helpers] },
        { title: '사주 전문가들이 자주 짚는 이야기', paras: expert('직장') },
        { title: '글자들이 만나는 모습 — 직장 자리의 합·충·형·파·해', paras: s2 },
              ],
    };
  }

  // ---------- 금전 ----------
  {
    const jae = seats('재성'), hid = hiddenSeats('재성');
    const jeong = jae.filter((x) => x.god === '정재').length, pyeon = jae.filter((x) => x.god === '편재').length;
    const s1 = [];
    if (!jae.length) {
      s1.push(`돈을 뜻하는 글자(재성)가 겉으로 드러난 자리에는 없어요.${hid.length ? ` 지지 속에 숨은 ${hid.map((h) => `${POS_KO[h.pos]}지 ${h.ch}`).join('·')}에만 있어서 돈이 "보이지 않게 쌓이는" 형태예요.` : ''} 돈이 늘 곁에 있는 사주는 아니고, 운에서 재성이 들어올 때 크게 움직여요.`);
      s1.push(seats('식상').length ? `대신 표현·재능 글자(식상) ${seats('식상').map((x) => x.ch).join('·')}이 있어 내가 만든 것(기술·콘텐츠·서비스)이 돈이 되는 길은 열려 있어요.` : '표현·재능 글자(식상)도 약해서 돈은 사람·자리(관성)나 배움(인성)을 통해 간접적으로 들어와요.');
    } else {
      s1.push(`돈을 뜻하는 글자(재성)는 ${seatText(jae)}${hid.length ? `, 그리고 지지 속에 숨은 ${hid.map((h) => h.ch).join('·')}` : ''}에 있어요.`);
      s1.push(jeong && pyeon ? '정재(꾸준히 들어오는 돈)와 편재(한 번에 크게 움직이는 돈)가 함께 있어요. 월급 같은 고정 수입과 사업·투자 같은 유동 수입이 둘 다 열려 있고, 그만큼 드나드는 폭도 커요.' : pyeon ? '편재라 한 번에 큰 단위로 움직이는 돈(사업·투자·수수료)에 강해요. 고정 수입만 붙잡으면 답답해지는 유형이에요.' : '정재라 꾸준히 쌓는 고정 수입과 알뜰한 관리가 재물의 본체예요.');
      s1.push(placeEasy(jae, 'day', { day: '재성이 일지(내 자리)에 있어 돈이 몸 가까이 붙고, 배우자·가정을 통한 재물 인연이 있어요.' }) || placeEasy(jae, 'month', { month: '재성이 월주(사회 무대)에 있어 직업 활동 자체가 돈이 되고, 돈을 다루는 자리에 앉기 쉬워요.' }) || placeEasy(jae, 'time', { time: '재성이 시주(말년 자리)에 있어 나이가 들수록 재물이 쌓이고, 자식·후배가 재물 인연이 돼요.' }) || '재성이 년주(집안 자리)에 있어 집안·초년의 재물 배경이 있고, 내 손보다 바깥에서 들어오는 돈이에요.');
    }
    const flags = [];
    if (st.label === '신약' && lv('재성') === '강') flags.push(`돈 글자(${jae.map((x) => x.ch).join('·')})에 비해 나(${dayStem})의 힘이 약한 재다신약 구조예요. 돈이 들어올 때 몸이 상하거나 남의 손을 타기 쉬우니, 나를 세워 주는 ${yong.group} 기운을 먼저 챙기세요.`);
    if (lv('비겁') === '강' && jae.length) flags.push(`나와 같은 편 글자(비겁) ${seats('비겁').map((x) => x.ch).join('·')}이 돈 글자를 나눠 가지는 구조(군겁쟁재)예요. 형제·동료·동업자와 얽힌 돈이 새는 구멍이니 보증과 동업은 피하세요.`);
    if (seats('식상').length && jae.length) flags.push(`표현·재능 글자(${seats('식상')[0].ch})가 돈 글자(${jae[0].ch})를 낳는 흐름(식상생재)이 있어요. 재능이 곧 수입으로 이어지는 좋은 통로예요.`);
    if (lv('인성') === '강' && jae.length && st.label !== '신약') flags.push('배움·명분 글자(인성)가 강해 돈을 두고 실속과 명분 사이에서 갈등(탐재괴인)이 생기기 쉬워요. 돈 결정은 원칙을 먼저 세우고 하세요.');
    const jaeEl = GEN[GEN[dayEl]], go = JAEGO[jaeEl];
    if (go && present.some((k) => pillars[k].branch === go)) flags.push(`돈 기운 ${jaeEl}(${ko[jaeEl]})을 담아 두는 창고 글자 ${go}가 ${present.filter((k) => pillars[k].branch === go).map((k) => `${POS_KO[k]}지`).join('·')}에 있어요(재고). 돈을 모아 두는 힘이 있고, 이 창고가 충으로 열리는 해에 큰 돈이 움직여요.`);
    const s2 = [
      ...meetings('day', '돈이 드나드는 가정·개인 영역', `돈이 드나드는 내 자리(일지 ${pillars.day.branch})는 다른 글자와 크게 부딪히지 않아요. 갑작스러운 지출 사건이 적은 편이에요.`),
      salEasy('day', '재물'), gongEasy('time', '말년 재물'),
      yongEasy('재성', '재물 활동') || yongEasy('식상', '재능을 파는 일'),
    ].filter(Boolean);
    out.금전 = {
      headline: !jae.length ? '돈 글자(재성)가 드러나 있지 않아 운에서 들어올 때 크게 움직이는 재물운이에요.' : `돈 글자(재성)가 ${jae.length}자리 있고 ${pyeon && !jeong ? '큰 단위로 움직이는' : jeong && pyeon ? '고정·유동 수입이 함께 열린' : '꾸준히 쌓는'} 재물운이에요.`,
      sections: [
        { title: '내 사주에서 돈을 뜻하는 글자', paras: [...s1, ...flags] },
        { title: '사주 전문가들이 자주 짚는 이야기', paras: expert('금전') },
        { title: '글자들이 만나는 모습 — 돈이 드나드는 자리', paras: s2 },
              ],
    };
  }

  // ---------- 연애 ----------
  {
    const sp = seats(spouseGroup), hid = hiddenSeats(spouseGroup);
    const kinds = uniq(sp.map((x) => x.god));
    const word = spouseGroup === '재성' ? '아내·연인을 뜻하는 글자(재성)' : '남편·연인을 뜻하는 글자(관성)';
    const s1 = [];
    if (!sp.length) s1.push(`${word}가 겉으로 드러난 자리에는 없어요.${hid.length ? ` 지지 속에 숨은 ${hid.map((h) => `${POS_KO[h.pos]}지 ${h.ch}`).join('·')}에 있어서 인연이 "속으로는 있는데 겉으로는 잘 안 보이는" 형태예요.` : ''} 만남은 운에서 이 글자가 들어오는 해와 달에 뚜렷해지니, 이 사주는 시기를 잘 타는 것이 곧 연애운이에요.`);
    else {
      s1.push(`${word}는 ${seatText(sp)}${hid.length ? `, 그리고 지지 속에 숨은 ${hid.map((h) => h.ch).join('·')}` : ''}에 있어요.`);
      s1.push(kinds.length > 1 ? `${kinds.join('과 ')}이 섞여 있어요(${spouseGroup === '재성' ? '재성혼잡' : '관살혼잡'}). 인연이 둘 이상 겹치거나 마음이 나뉘는 시기가 오기 쉬우니, 고르고 정리하는 것이 이 사주의 연애 과제예요.` : sp.length >= 3 ? `${kinds[0]}이 ${sp.length}자리나 있어 인연은 많지만 한 사람에게 오래 집중하기 어려운 구조예요.` : `${kinds[0]} 하나라 인연을 깊고 오래 이어 가는 편이에요.`);
      s1.push(placeEasy(sp, 'day', { day: '이 글자가 배우자 자리(일지)에 앉아 있어 결혼 인연이 뚜렷하고, 배우자가 내 삶의 중심이 돼요.' }) || placeEasy(sp, 'month', { month: '이 글자가 월주(사회 무대)에 있어 직장·사회 활동 속에서 인연을 만나고, 연애가 사회생활과 얽혀요.' }) || placeEasy(sp, 'time', { time: '이 글자가 시주(말년·자식 자리)에 있어 인연이 늦게 오거나 연하·후배와 얽히고, 결혼 뒤에는 자식 문제와 함께 움직여요.' }) || '이 글자가 년주(집안·바깥 자리)에 있어 소개로 오는 인연, 혹은 연상이나 일찍 만난 인연이에요.');
    }
    const loveSal = ['도화', '홍염', '고란살', '원진살', '귀문관살', '괴강', '양인'].filter((n) => hasSal(n));
    const s2 = [
      ...meetings('day', '부부·연인 관계', `배우자 자리인 일지 ${pillars.day.branch}는 다른 글자와 크게 부딪히지 않아요. 관계가 비교적 안정적으로 유지되는 편이에요.`),
      ganyeo('부부·연인 관계'),
      loveSal.length ? `${loveSal.slice(0, 3).map((n) => `${salWhere(n)}의 ${K.SINSAL[n].title}`).join(', ')}이 연애에 영향을 줘요. ${loveSal.slice(0, 2).map((n) => first(K.SINSAL[n].text)).join(' ')}` : null,
      yongEasy(spouseGroup, '연애와 배우자 인연') || `이 사주에 가장 필요한 기운(용신)은 ${yong.el}(${ko[yong.el]})이에요. ${['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'].filter((s) => STEM_ELEMENT[s] === yong.el).map((s) => `${s}(${STEM_KO[s]})`).join('·')} 일간처럼 그 기운을 지닌 사람 곁에서 내 균형이 잡히니, 조건보다 "함께 있을 때 편한지"를 기준으로 고르세요.`,
    ].filter(Boolean);
    out.연애 = {
      headline: !sp.length ? '연인 글자가 드러나 있지 않아 시기를 잘 타는 것이 곧 연애운이에요.' : `연인 글자가 ${sp.length}자리 있고 ${kinds.length > 1 ? '인연이 겹치기 쉬운' : sp.some((x) => x.pos === 'day') ? '결혼 인연이 뚜렷한' : '깊고 오래 가는'} 연애운이에요.`,
      sections: [
        { title: '내 사주에서 연인·배우자를 뜻하는 글자', paras: s1 },
        { title: '사주 전문가들이 자주 짚는 이야기', paras: expert('연애') },
        { title: '배우자 자리에서 만나는 글자들 — 합·충·형·원진', paras: s2 },
              ],
    };
  }

  // ---------- 건강 ----------
  {
    const healthSal = ['백호대살', '양인', '현침살', '귀문관살', '괴강'].filter((n) => hasSal(n));
    const s1 = [
      ...meetings('day', '몸과 컨디션', `몸을 뜻하는 내 자리(일지 ${pillars.day.branch})는 다른 글자와 크게 부딪히지 않아요. 급한 사고나 과로형 소모보다 생활 습관이 건강을 좌우해요.`),
      pillars.time && relsAt('time', BAD).length ? `말년과 하체를 뜻하는 시지 ${pillars.time.branch}에도 ${uniq(relsAt('time', BAD).map((b) => b.kind)).join('·')}이 걸려 있어요. 다리·허리 쪽과 나이 든 뒤의 건강을 미리 챙기세요.` : null,
      healthSal.length ? `${healthSal.slice(0, 2).map((n) => `${salWhere(n)}의 ${K.SINSAL[n].title}`).join(', ')}이 있어요. ${healthSal.slice(0, 2).map((n) => first(K.SINSAL[n].text)).join(' ')}` : null,
      `몸 자리인 일지 ${pillars.day.branch}의 기운 단계(12운성)는 '${detail.day.stage}'예요. ${['병지', '사지', '묘지', '절지'].includes(detail.day.stage) ? '타고난 체력보다 회복력이 관건이라, 무리한 뒤에는 하루를 꼭 쉬어야 해요.' : ['장생', '관대', '건록', '제왕'].includes(detail.day.stage) ? '기운이 살아 있는 단계라 회복이 빠른 편이지만, 그만큼 과로를 눈치채기 어려우니 정기 검진을 습관으로.' : '기운이 오르내리는 단계라 컨디션의 파도를 인정하고 리듬을 지키는 것이 최고의 관리법이에요.'}`,
      `이 사주의 균형을 깨는 기운(기신)은 ${yong.gi}(${ko[yong.gi]})이고, 그 장부는 ${K.ELEMENTS[yong.gi].organ}이에요. ${yong.gi} 기운이 들어오는 해와 달에 특히 살피고, 가장 필요한 기운(용신) ${yong.el}(${ko[yong.el]})의 습관 — ${D.YONG[yong.el].habit} — 이 회복 루틴이에요.`,
    ].filter(Boolean);
    out.건강 = {
      headline: `${st.label} 사주로 ${first(P.HEALTH_TYPE[st.label] || '')}`,
      sections: [
        { title: '사주 전문가들이 자주 짚는 이야기', paras: expert('건강') },
        { title: '몸을 뜻하는 자리에서 만나는 글자들', paras: s1 },
      ],
    };
  }

  // ---------- 학업 ----------
  {
    const ins = seats('인성'), hid = hiddenSeats('인성');
    const s1 = [];
    if (!ins.length) s1.push(`배움·자격·문서를 뜻하는 글자(인성)가 겉으로 드러난 자리에는 없어요.${hid.length ? ` 지지 속에 숨은 ${hid.map((h) => `${POS_KO[h.pos]}지 ${h.ch}`).join('·')}에 있어서 배움은 "필요할 때 스스로 찾아 익히는" 형태예요.` : ''} 책상 공부보다 몸으로 부딪혀 배우는 유형이니, 자격과 시험은 짧고 실전적인 것부터 쌓고 멘토를 두면 속도가 두 배가 돼요.`);
    else {
      s1.push(`배움·자격·문서를 뜻하는 글자(인성)는 ${seatText(ins)}${hid.length ? `, 그리고 지지 속에 숨은 ${hid.map((h) => h.ch).join('·')}` : ''}에 있어요.`);
      s1.push(ins.some((x) => x.god === '편인') && ins.some((x) => x.god === '정인') ? '정인(정통 학문·자격)과 편인(특수한 재능·직관)이 함께 있어요. 정통 학문과 특수 분야(IT·의학·역학·심리·예술)를 오갈 수 있고, 관심이 넓은 대신 한 분야에 오래 머무는 훈련이 필요해요.' : ins.some((x) => x.god === '편인') ? '편인 위주라 직관과 몰입으로 배우는 특수 학문·기술·예술형이에요. 남이 정해 준 커리큘럼보다 스스로 파고드는 공부가 맞아요.' : '정인 위주라 체계적으로 쌓아 가는 정통 학문·자격·행정형 공부에 강해요.');
      s1.push(placeEasy(ins, 'month', { month: '인성이 월주(사회 무대)에 있어 공부 환경이 좋고, 배운 것이 직업으로 이어져요.' }) || placeEasy(ins, 'time', { time: '인성이 시주(말년 자리)에 있어 늦게 시작한 공부가 더 값진 평생 학습형이에요.' }) || placeEasy(ins, 'day', { day: '인성이 일지(내 자리)에 있어 배우자·가정이 공부를 돕고 책과 가까운 생활을 해요.' }) || '인성이 년주(집안 자리)에 있어 집안·어머니의 영향으로 초년 학업 기반이 만들어져요.');
    }
    const schol = ['문창귀인', '학당귀인', '천을귀인', '태극귀인', '화개'].filter((n) => hasSal(n));
    const helpers = [];
    if (schol.length) helpers.push(`${schol.slice(0, 2).map((n) => `${salWhere(n)}의 ${K.SINSAL[n].title}`).join(', ')}은 공부와 인연이 깊은 별이에요. ${schol.slice(0, 2).map((n) => first(K.SINSAL[n].text)).join(' ')}`);
    if (ins.length && seats('관성').length) helpers.push(`회사 글자(${seats('관성')[0].ch})가 배움 글자(${ins[0].ch})를 낳는 흐름(관인상생)이 있어 시험·자격이 곧 자리로 이어져요.`);
    if (seats('식상').length) helpers.push(`표현 글자(식상) ${seats('식상').map((x) => x.ch).join('·')}이 있어 배운 것을 말과 글로 꺼내는 발표·논술·실기에 강해요.`);
    if (lv('재성') === '강') helpers.push('돈·현실 글자(재성)가 강해 이론 공부는 목표(돈·자격)가 분명할 때만 집중이 돼요. 공부의 쓸모를 먼저 정하세요.');
    const s2 = [
      ...meetings('month', '공부 환경', `공부 환경을 뜻하는 월지 ${pillars.month.branch}는 다른 글자와 크게 부딪히지 않아 학업 환경이 안정적인 편이에요.`),
      stageEasy('month', '공부 환경'),
      yongEasy('인성', '배움과 자격') || `가장 필요한 기운(용신) ${yong.el}(${ko[yong.el]})의 요일과 시간대 — ${D.YONG_DETAIL[yong.el].weekday}, ${D.YONG_DETAIL[yong.el].time} — 에 공부하면 집중이 오래 가요.`,
    ].filter(Boolean);
    out.학업 = {
      headline: !ins.length ? '배움 글자(인성)가 드러나 있지 않아 실전에서 익히는 공부가 맞아요.' : `배움 글자(인성)가 ${ins.length}자리 있는 ${ins.some((x) => x.god === '편인') ? '직관·몰입형' : '체계·정통형'} 학업운이에요.`,
      sections: [
        { title: '내 사주에서 배움·자격을 뜻하는 글자', paras: [...s1, ...helpers] },
        { title: '사주 전문가들이 자주 짚는 이야기', paras: expert('학업') },
        { title: '글자들이 만나는 모습 — 공부 자리', paras: s2 },
              ],
    };
  }

  return out;
}
