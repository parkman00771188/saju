import * as K from '../data/knowledge.js';
import * as D from '../data/deep.js';
import * as P from '../data/patterns.js';
import { ELEMENT_KO, STEM_KO, BRANCH_KO, STEM_ELEMENT } from './tables.js';

/**
 * "이 사주만의 포인트" — 영역(직장·금전·연애·건강·학업)마다 실제 글자·자리·개수·관계에서 계산한 문장을 만든다.
 * 같은 격국이라도 글자 배치가 다르면 다른 글이 나오도록, 모든 문장이 원국의 구체적인 글자를 인용한다.
 */
const first = (s) => (s?.match(/^[^.!?]*[.!?]/) || [s || ''])[0];
const uniq = (a) => [...new Set(a.filter(Boolean))];
const POS_KO = { year: '년', month: '월', day: '일', time: '시' };
const POS_ROLE = { year: '초년·집안·바깥 환경', month: '사회·직장 무대', day: '나와 배우자', time: '말년·자식·계획' };
const grp = (g) => K.TEN_GOD_GROUP[g] || '';
const GEN = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const CTRL = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const JAEGO = { 木: '未', 火: '戌', 金: '丑', 水: '辰' }; // 재성 오행의 고지
const READ = { ...STEM_KO, ...BRANCH_KO };
const hasBatchim = (ch) => { const r = READ[ch] || ch; const c = r.charCodeAt(r.length - 1); return c >= 0xac00 && c <= 0xd7a3 ? (c - 0xac00) % 28 !== 0 : false; };
const GA = (ch) => (hasBatchim(ch) ? '이' : '가');
const WA = (ch) => (hasBatchim(ch) ? '과' : '와');
const STAGE_WORK = {
  장생: '새롭게 자라나는 기운이라 배우며 성장하는 조직·초기 단계의 일이 맞아요', 목욕: '변덕과 멋이 섞인 기운이라 자유로운 분위기와 변화가 잦은 일에 어울려요',
  관대: '옷을 갖춰 입는 기운이라 자격·직함·체계가 있는 자리에서 빛나요', 건록: '스스로 벌어 서는 기운이라 실력으로 자리 잡고 독립적으로 일해요',
  제왕: '정점의 기운이라 책임과 권한이 큰 자리, 이끄는 역할이 맞아요', 쇠지: '무르익어 기울기 시작하는 기운이라 경험을 파는 자문·관리형이 맞아요',
  병지: '느슨해지는 기운이라 사람을 돌보는 일, 완급이 있는 일이 맞아요', 사지: '멈춰 생각하는 기운이라 연구·기획·전문 기술처럼 깊이 파는 일이 맞아요',
  묘지: '저장하는 기운이라 관리·재무·기록처럼 모으고 지키는 일이 맞아요', 절지: '끊고 다시 시작하는 기운이라 전환이 잦고 새 판을 짜는 일에 강해요',
  태지: '잉태의 기운이라 준비·기획·초기 단계에서 힘이 나요', 양지: '길러지는 기운이라 교육·보호·서비스처럼 키우는 일이 맞아요',
};

export function buildPersonal({ data, prof, gyeok, yong, needEl, evidenceByCat, daeunAll, spouseGroup, st, gongmangSet, currentDaeun }) {
  const { pillars, detail, order, dayStem, relations = {}, sinsal = {}, elements = {}, missing = [], strongest } = data;
  const ko = ELEMENT_KO;
  const present = order.filter((k) => pillars[k]);
  const dayEl = STEM_ELEMENT[dayStem];
  const gz = (k) => `${pillars[k].stem}${pillars[k].branch}`;
  const lv = (g) => prof.level(g);

  // 십성이 놓인 자리 목록: [{pos, where, god, ch}]
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
  const seatText = (list) => list.map((x) => `${POS_KO[x.pos]}${x.where} ${x.ch}(${x.god})`).join('·');
  const hasGod = (g) => present.some((k) => detail[k].branchGod === g || (k !== 'day' && detail[k].stemGod === g));
  const rel = (name) => relations[name] || [];
  const relsAt = (pos, names = ['chung', 'wonjin', 'hyeong', 'pa', 'hae', 'gwimun']) => names.flatMap((n) => rel(n).filter((r) => r.chars.some((c) => c.pos === pos)).map((r) => ({ kind: n, label: r.label || n, other: r.chars.find((c) => c.pos !== pos) })));
  const hapsAt = (pos) => ['yukhap', 'samhap', 'banghap', 'stemHap'].flatMap((n) => rel(n).filter((r) => r.chars.some((c) => c.pos === pos)).map((r) => ({ kind: n, label: r.label || n, other: r.chars.find((c) => c.pos !== pos) })));
  const salAt = (pos) => (sinsal[pos] || []).map((x) => x.name);
  const REL_KO = { chung: '충', wonjin: '원진', hyeong: '형', pa: '파', hae: '해', gwimun: '귀문', yukhap: '육합', samhap: '삼합', banghap: '방합', stemHap: '천간합' };
  const groupByOther = (list, kindOf) => { const m = new Map(); for (const b of list) { const key = b.other ? `${POS_KO[b.other.pos]}${b.kind === 'stemHap' ? '간' : '지'} ${b.other.ch}` : '다른 글자'; m.set(key, uniq([...(m.get(key) || []), kindOf(b)])); } return [...m.entries()].map(([k, kinds]) => `${k}${WA(k.slice(-1))} ${kinds.join('·')}`); };
  const relSentence = (pos, area) => {
    const bad = relsAt(pos), good = hapsAt(pos);
    const br = pillars[pos].branch;
    const s = [];
    if (bad.length) s.push(`${POS_KO[pos]}지 ${br}${GA(br)} ${groupByOther(bad, (b) => REL_KO[b.kind] || b.kind).join(', ')} 관계라 ${area}에 변동·마찰이 잦은 구조예요`);
    if (good.length) s.push(`${POS_KO[pos]}${good.every((b) => b.kind === 'stemHap') ? `간 ${pillars[pos].stem}${GA(pillars[pos].stem)}` : `지 ${br}${GA(br)}`} ${groupByOther(good, (b) => REL_KO[b.kind]).join(', ')}으로 묶여 ${area}에 사람·인연이 얽혀 들어와요`);
    return s.join('. ') + (s.length ? '.' : '');
  };
  const stageLine = (pos) => `${POS_KO[pos]}지 ${pillars[pos].branch}의 12운성은 ${detail[pos].stage} — ${STAGE_WORK[detail[pos].stage] || ''}.`;
  const salLine = (pos, area) => { const names = salAt(pos).filter((n) => K.SINSAL[n]); return names.length ? `${POS_KO[pos]}주에 ${names.slice(0, 3).map((n) => K.SINSAL[n].title).join('·')}이 있어 ${area}에서는 ${names.slice(0, 2).map((n) => first(K.SINSAL[n].text)).join(' ')}` : null; };
  const gongLine = (pos, area) => (gongmangSet?.has(pillars[pos].branch) ? `${POS_KO[pos]}주 ${gz(pos)}가 공망이라 ${area}에서는 기대만큼 손에 잡히지 않는 허전함이 있고, 그만큼 정신적인 가치로 채우게 돼요.` : null);
  const yongLine = (group, area) => yong.group === group ? `${group}이 이 사주의 용신이라 ${area}은(는) 나를 살리는 방향이에요 — 여기에 힘을 쓰면 균형이 잡혀요.` : yong.groups?.gi === group ? `${group}이 이 사주의 기신이라 ${area}에 매달릴수록 소모가 커요. 가볍게, 결과가 따라오게 두세요.` : yong.groups?.hee === group ? `${group}은 희신이라 ${area}에서 용신을 돕는 힘이 나와요.` : null;
  const dNow = daeunAll.find((d) => d.isNow) || null;
  const dNext = daeunAll.find((d) => !d.past && !d.isNow) || null;
  const daeunLine = (cat, area) => {
    if (!dNow) return null;
    const sc = dNow.luck.scores[cat];
    return `지금 ${dNow.age}~${dNow.age + 9}세 ${dNow.stem}${dNow.branch} 대운은 천간 ${dNow.stemGod}·지지 ${dNow.branchGod} 흐름이라 ${area} 점수 ${sc}/5 — ${first(dNow.luck.texts[cat])}${dNext ? ` 다음 ${dNext.stem}${dNext.branch} 대운(${dNext.startYear}~)은 ${dNext.branchGod} 중심으로 ${dNext.luck.scores[cat]}/5예요.` : ''}`;
  };
  const kbLine = (cat) => {
    const rows = (evidenceByCat?.[cat] || []).slice(0, 4);
    if (!rows.length) return null;
    const from = uniq(rows.flatMap((r) => r.from)).slice(0, 3).join('·');
    const pos = rows.filter((r) => r.pol > 0), neg = rows.filter((r) => r.pol < 0), neu = rows.filter((r) => r.pol === 0);
    const tell = (r) => `'${r.label}'(${r.docs}편)`;
    return `사주 전문가들이 ${from} 조합을 다룰 때 ${cat} 관련으로 가장 자주 짚는 것은 ${rows.slice(0, 3).map(tell).join(', ')}이에요.${pos.length ? ` 좋게 보는 쪽은 ${pos.map((r) => r.label).join('·')} — ${first(P.CLAIM_TEXT[pos[0].label] || '')}` : ''}${neg.length ? ` 조심하라는 쪽은 ${neg.map((r) => r.label).join('·')} — ${first(P.CLAIM_TEXT[neg[0].label] || '')}` : ''}${!pos.length && !neg.length && neu.length ? ` ${first(P.CLAIM_TEXT[neu[0].label] || '')}` : ''}`;
  };

  const out = {};

  // ---------- 직장 ----------
  {
    const gw = seats('관성'), hid = hiddenSeats('관성');
    const jeong = gw.filter((x) => x.god === '정관').length, pyeon = gw.filter((x) => x.god === '편관').length;
    const p = [];
    if (!gw.length) p.push(`관성(자리·조직의 별)이 천간·지지 어디에도 없어요(무관).${hid.length ? ` 지장간 ${hid.map((h) => `${POS_KO[h.pos]}지 ${h.ch}`).join('·')} 속에만 숨어 있어` : ''} 조직이 나를 붙잡는 힘이 약한 대신 간섭도 적어, 직함보다 실력과 결과물로 평가받는 길(${(gyeok.career || []).slice(0, 2).join('·')})이 맞아요. 직장은 "오래 있는 곳"보다 "내 것을 만드는 곳"으로 고르세요.`);
    else {
      p.push(`관성은 ${seatText(gw)}${hid.length ? `, 지장간에도 ${hid.map((h) => h.ch).join('·')}` : ''}에 있어요. ${jeong && pyeon ? `정관과 편관이 함께 있어(관살혼잡) 두 가지 일을 병행하거나 직장이 바뀌는 일이 생기기 쉬우니, 하나를 주(主)로 정하고 나머지는 부(副)로 두세요.` : pyeon ? `정관 없이 편관만 있어 규범적인 조직보다 압박과 성과가 분명한 자리(현장·기술·전문·군경·영업)에서 힘이 나고, 강한 상사를 만나기 쉬워요.` : `정관 위주라 규범과 절차가 분명한 조직에서 신뢰를 쌓아 올라가는 유형이에요.`} ${gw.some((x) => x.pos === 'month') ? `특히 월주(사회 무대)에 관성이 있어 조직 생활이 체질에 맞고 직장 인연이 일찍 열려요.` : gw.some((x) => x.pos === 'time') ? `관성이 시주(말년)에 있어 직함과 인정은 늦게, 대신 오래 가요.` : gw.some((x) => x.pos === 'year') ? `관성이 년주에 있어 집안·초년 환경이 조직형이고 윗사람의 영향이 커요.` : `관성이 일지(내 자리)에 있어 책임감이 몸에 붙어 있고 배우자·동료가 직장 문제에 얽혀요.`}`);
    }
    const insung = seats('인성'), siksang = seats('식상'), jae = seats('재성');
    const structs = [];
    if (gw.length && insung.length) structs.push(`관성(${gw[0].ch})이 인성(${insung[0].ch})을 낳는 관인상생 구조라 자격·문서·배움이 곧 자리로 이어져요`);
    if (gw.length && jae.length) structs.push(`재성(${jae[0].ch})이 관성(${gw[0].ch})을 살리는 재생관이라 실적과 돈이 직위로 바뀌어요`);
    if (hasGod('상관') && hasGod('정관')) structs.push(`상관이 정관을 치는 상관견관이 있어 상사·규범과 부딪히기 쉬우니 말보다 결과물로 보여 주세요`);
    if (hasGod('식신') && hasGod('편관')) structs.push(`식신이 편관을 다스리는 식신제살이라 압박을 실력으로 눌러 가는 힘이 있어요`);
    if (!gw.length && siksang.length) structs.push(`식상(${siksang.map((x) => x.ch).join('·')})이 살아 있어 내가 만든 것으로 평가받는 길이 열려 있어요`);
    if (structs.length) p.push(structs.join('. ') + '.');
    p.push(`${stageLine('month')} ${relSentence('month', '직장·사회 환경')}`.trim());
    const extra = [salLine('month', '직장'), gongLine('month', '직장'), yongLine('관성', '조직·책임') || yongLine('식상', '표현·생산') || yongLine('인성', '자격·배움')].filter(Boolean);
    if (extra.length) p.push(extra.join(' '));
    p.push(`${gyeok.key}(${gyeok.how?.pick?.stem}${gyeok.how?.pick?.god ? `·${gyeok.how.pick.god}` : ''} 기준)의 사람은 "${gyeok.tag}" — ${first(gyeok.desc)} 어울리는 분야는 ${(gyeok.career || []).join(', ')}.`);
    const kb = kbLine('직장'); if (kb) p.push(kb);
    const dl = daeunLine('직장', '직장운'); if (dl) p.push(dl);
    out.직장 = p;
  }

  // ---------- 금전 ----------
  {
    const jae = seats('재성'), hid = hiddenSeats('재성');
    const jeong = jae.filter((x) => x.god === '정재').length, pyeon = jae.filter((x) => x.god === '편재').length;
    const p = [];
    if (!jae.length) p.push(`재성(재물의 별)이 겉으로 드러난 자리에 없어요(무재).${hid.length ? ` 지장간 ${hid.map((h) => `${POS_KO[h.pos]}지 ${h.ch}`).join('·')} 속에 숨어 있어 돈은 "보이지 않게 쌓이는" 형태이고,` : ''} 돈이 늘 곁에 있는 사주는 아니라 운에서 재성이 들어올 때 크게 움직여요. ${seats('식상').length ? `식상(${seats('식상').map((x) => x.ch).join('·')})이 있어 내가 만든 것이 돈이 되는 길은 열려 있어요.` : '식상도 약해 돈은 사람·자리(관성)나 배움(인성)을 통해 간접적으로 들어와요.'}`);
    else {
      p.push(`재성은 ${seatText(jae)}${hid.length ? `, 지장간에도 ${hid.map((h) => h.ch).join('·')}` : ''}에 있어요. ${jeong && pyeon ? '정재와 편재가 함께 있어 월급 같은 고정 수입과 사업·투자 같은 유동 수입이 둘 다 열려 있고, 그만큼 돈이 들어오고 나가는 폭도 커요.' : pyeon ? '편재라 한 번에 큰 단위로 움직이는 돈(사업·투자·수수료)에 강하고, 고정 수입만 붙잡으면 답답해져요.' : '정재라 꾸준히 쌓는 고정 수입과 알뜰한 관리가 재물의 본체예요.'} ${jae.some((x) => x.pos === 'day') ? '재성이 일지(내 자리)에 있어 돈이 몸 가까이 붙고 배우자·가정을 통한 재물 인연이 있어요.' : jae.some((x) => x.pos === 'month') ? '재성이 월주에 있어 직업 활동 자체가 돈이 되고 사회에서 재물을 다루는 자리에 앉기 쉬워요.' : jae.some((x) => x.pos === 'time') ? '재성이 시주에 있어 말년으로 갈수록 재물이 쌓이고 자식·후배가 재물 인연이 돼요.' : '재성이 년주에 있어 집안·초년 환경의 재물 배경이 있고, 내 손보다 바깥에서 들어오는 돈이에요.'}`);
    }
    const flags = [];
    if (st.label === '신약' && lv('재성') === '강') flags.push(`재다신약 — 재성 ${jae.map((x) => x.ch).join('·')}에 비해 일간 ${dayStem}의 힘이 약해, 돈이 들어올 때 몸이 상하거나 남의 손을 타기 쉬워요. 나를 세워 주는 ${yong.group}(${yong.el})이 먼저예요`);
    if (lv('비겁') === '강' && jae.length) flags.push(`비겁 ${seats('비겁').map((x) => x.ch).join('·')}이 재성을 다투는 군겁쟁재라 형제·동료·동업자와 나누는 돈이 새는 구멍이에요`);
    if (seats('식상').length && jae.length) flags.push(`식상 ${seats('식상')[0].ch}이 재성 ${jae[0].ch}을 낳는 식상생재라 재능·생산이 곧 수입으로 이어지는 좋은 통로예요`);
    if (lv('인성') === '강' && jae.length && st.label !== '신약') flags.push('인성이 강해 재성을 두고 배움·명분과 실속 사이에서 갈등(탐재괴인)이 생기기 쉬우니 돈 결정은 원칙을 먼저 세우세요');
    const jaeEl = GEN[GEN[dayEl]], go = JAEGO[jaeEl];
    if (go && present.some((k) => pillars[k].branch === go)) flags.push(`재성 오행 ${jaeEl}(${ko[jaeEl]})의 창고인 ${go}가 ${present.filter((k) => pillars[k].branch === go).map((k) => `${POS_KO[k]}지`).join('·')}에 있어(재고) 돈을 모아 두는 힘이 있고, 이 창고가 충으로 열리는 해에 큰 돈이 움직여요`);
    if (flags.length) p.push(flags.join('. ') + '.');
    p.push(`${relSentence('day', '돈이 드나드는 가정·개인 영역')} ${yongLine('재성', '재물 활동') || (yong.groups?.gi === '재성' ? '' : '')}`.trim() || `일지 ${pillars.day.branch}는 충·원진 없이 안정되어 돈이 새는 사건이 적은 편이에요.`);
    const extra = [salLine('day', '재물'), gongLine('time', '말년 재물')].filter(Boolean); if (extra.length) p.push(extra.join(' '));
    const kb = kbLine('금전'); if (kb) p.push(kb);
    const dl = daeunLine('금전', '재물운'); if (dl) p.push(dl);
    out.금전 = p;
  }

  // ---------- 연애 ----------
  {
    const sp = seats(spouseGroup), hid = hiddenSeats(spouseGroup);
    const kinds = uniq(sp.map((x) => x.god));
    const word = spouseGroup === '재성' ? '재성(아내·연인의 별)' : '관성(남편·연인의 별)';
    const p = [];
    if (!sp.length) p.push(`${word}이 드러난 자리에 없어요.${hid.length ? ` 지장간 ${hid.map((h) => `${POS_KO[h.pos]}지 ${h.ch}`).join('·')}에 숨어 있어 인연이 "속으로는 있는데 겉으로 잘 안 보이는" 형태고,` : ''} 만남은 운에서 배우자 별이 들어오는 해·달에 뚜렷해져요. 그래서 이 사주는 시기를 잘 타는 것이 곧 연애운이에요.`);
    else p.push(`${word}은 ${seatText(sp)}${hid.length ? `, 지장간에도 ${hid.map((h) => h.ch).join('·')}` : ''}에 있어요. ${kinds.length > 1 ? `${kinds.join('과 ')}이 섞여(${spouseGroup === '재성' ? '재성혼잡' : '관살혼잡'}) 인연이 둘 이상 겹치거나 마음이 나뉘는 시기가 있으니 선택과 정리가 과제예요.` : sp.length >= 3 ? `${kinds[0]}이 ${sp.length}자리나 있어 인연은 많지만 한 사람에 집중하기 어려운 구조예요.` : `${kinds[0]} 하나라 인연을 깊고 오래 이어 가는 편이에요.`} ${sp.some((x) => x.pos === 'day') ? '배우자 별이 일지(배우자궁)에 앉아 있어 결혼 인연이 뚜렷하고 배우자가 내 삶의 중심이 돼요.' : sp.some((x) => x.pos === 'month') ? '배우자 별이 월주에 있어 직장·사회 활동 속에서 인연을 만나고, 연애가 사회생활과 얽혀요.' : sp.some((x) => x.pos === 'time') ? '배우자 별이 시주에 있어 인연이 늦게 오거나 연하·후배와 얽히고, 결혼 후 자식 문제와 함께 움직여요.' : '배우자 별이 년주에 있어 집안·바깥에서 소개로 오는 인연, 혹은 연상·일찍 만난 인연이에요.'}`);
    const d = detail.day;
    p.push(`배우자궁 일지 ${pillars.day.branch}(${BRANCH_KO[pillars.day.branch]})는 ${d.branchGod}이고 12운성 ${d.stage} — 배우자상은 "${first(D.SPOUSE[pillars.day.branch] || '')}" 지장간 ${d.hidden.map((h) => `${h.stem}(${h.god})`).join('·')}은 배우자의 속마음과 가정 안의 숨은 기운이에요. ${relSentence('day', '부부·연인 사이')}`.trim());
    const loveSal = ['도화', '홍염', '고란살', '원진살', '귀문관살', '간여지동', '괴강', '양인'].filter((n) => Object.values(sinsal).some((l) => l.some((x) => x.name === n)));
    if (loveSal.length) p.push(loveSal.slice(0, 3).map((n) => { const where = present.filter((k) => salAt(k).includes(n)).map((k) => `${POS_KO[k]}주`).join('·'); return `${where}의 ${K.SINSAL[n].title}: ${first(K.SINSAL[n].text)}`; }).join(' '));
    const yl = yongLine(spouseGroup, '연애·배우자 인연'); if (yl) p.push(yl);
    else p.push(`용신 ${yong.el}(${ko[yong.el]}) 기운을 지닌 사람 — ${['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'].filter((s) => STEM_ELEMENT[s] === yong.el).map((s) => `${s}(${STEM_KO[s]})`).join('·')} 일간 — 곁에서 내 균형이 잡히니, 조건보다 "함께 있을 때 편한지"를 기준으로 고르세요.`);
    const kb = kbLine('연애'); if (kb) p.push(kb);
    const dl = daeunLine('연애', '연애운'); if (dl) p.push(dl);
    out.연애 = p;
  }

  // ---------- 건강 ----------
  {
    const p = [];
    const counts = ['木', '火', '土', '金', '水'].map((e) => `${e}${elements[e] || 0}`).join(' ');
    p.push(`오행 분포는 ${counts}. ${missing.length ? `없는 ${missing.map((m) => `${m}(${ko[m]})`).join('·')}이 가리키는 ${missing.map((m) => K.ELEMENTS[m].organ).join(' / ')} 계통이 약점이 되기 쉽고,` : '다섯 오행이 모두 있어 특정 장부가 비어 있지는 않지만,'} 가장 강한 ${strongest}(${ko[strongest]})이 과하면 ${K.ELEMENTS[strongest].organ}과 그것이 극하는 ${CTRL[strongest]}(${ko[CTRL[strongest]]})의 ${K.ELEMENTS[CTRL[strongest]].organ}에 부담이 가요. 일간 ${dayStem}(${ko[dayEl]})의 장부인 ${K.ELEMENTS[dayEl].organ}은 평생 관리 대상이에요.`);
    const bodyRel = relsAt('day'), timeRel = relsAt('time');
    const healthSal = ['백호대살', '양인', '현침살', '귀문관살', '괴강'].filter((n) => Object.values(sinsal).some((l) => l.some((x) => x.name === n)));
    const s2 = [];
    if (bodyRel.length) s2.push(`일지 ${pillars.day.branch}(몸·중심)가 ${uniq(bodyRel.map((b) => REL_KO[b.kind])).join('·')}을 맞고 있어 급한 사고·수술·과로형 소모를 조심해야 해요`);
    if (pillars.time && timeRel.length) s2.push(`시지 ${pillars.time.branch}(하체·말년)도 ${uniq(timeRel.map((b) => REL_KO[b.kind])).join('·')}이 걸려 말년 건강과 다리·허리 쪽을 미리 챙기세요`);
    if (healthSal.length) s2.push(healthSal.slice(0, 2).map((n) => `${present.filter((k) => salAt(k).includes(n)).map((k) => `${POS_KO[k]}주`).join('·')}의 ${K.SINSAL[n].title}은 ${first(K.SINSAL[n].text)}`).join(' '));
    if (['병지', '사지', '묘지', '절지'].includes(detail.day.stage)) s2.push(`일지 12운성이 ${detail.day.stage}라 타고난 체력보다 회복력이 관건이에요 — 무리한 뒤 하루는 반드시 쉬어야 해요`);
    if (s2.length) p.push(s2.join('. ') + '.');
    p.push(`${st.label} 사주라 ${first(P.HEALTH_TYPE[st.label] || '')} 기신 ${yong.gi}(${ko[yong.gi]})의 장부 ${K.ELEMENTS[yong.gi].organ}은 ${yong.gi} 운이 오는 해·달에 특히 살피고, 용신 ${yong.el}(${ko[yong.el]})의 ${D.YONG[yong.el].habit}이 회복 루틴이에요.`);
    const kb = kbLine('건강'); if (kb) p.push(kb);
    const dl = daeunLine('건강', '건강운'); if (dl) p.push(dl);
    out.건강 = p;
  }

  // ---------- 학업 ----------
  {
    const ins = seats('인성'), hid = hiddenSeats('인성');
    const p = [];
    if (!ins.length) p.push(`인성(배움·자격의 별)이 드러난 자리에 없어요(무인성).${hid.length ? ` 지장간 ${hid.map((h) => `${POS_KO[h.pos]}지 ${h.ch}`).join('·')}에 숨어 있어 배움은 "필요할 때 스스로 찾아 익히는" 형태고,` : ''} 책상 공부보다 몸으로 부딪혀 배우는 유형이라 자격·시험은 짧고 실전적인 것부터 쌓으세요. 멘토가 있으면 속도가 두 배가 돼요.`);
    else p.push(`인성은 ${seatText(ins)}${hid.length ? `, 지장간에도 ${hid.map((h) => h.ch).join('·')}` : ''}에 있어요. ${ins.some((x) => x.god === '편인') && ins.some((x) => x.god === '정인') ? '정인과 편인이 함께 있어 정통 학문과 특수 분야(IT·의학·역학·심리·예술)를 오갈 수 있고, 관심이 넓은 대신 한 분야에 오래 머무는 훈련이 필요해요.' : ins.some((x) => x.god === '편인') ? '편인 위주라 직관과 몰입으로 배우는 특수 학문·기술·예술형이에요. 남이 정해 준 커리큘럼보다 스스로 파고드는 공부가 맞아요.' : '정인 위주라 체계적으로 쌓아 가는 정통 학문·자격·행정형 공부에 강해요.'} ${ins.some((x) => x.pos === 'month') ? '인성이 월주에 있어 학업 환경이 좋고 배움이 직업으로 이어져요.' : ins.some((x) => x.pos === 'time') ? '인성이 시주에 있어 늦공부·평생 학습형이고 나이 들어 배운 것이 더 값져요.' : ins.some((x) => x.pos === 'day') ? '인성이 일지에 있어 배우자·가정이 공부를 돕고 책과 가까운 생활을 해요.' : '인성이 년주에 있어 집안·어머니의 영향으로 초년 학업 기반이 생겨요.'}`);
    const schol = ['문창귀인', '학당귀인', '천을귀인', '태극귀인', '화개'].filter((n) => Object.values(sinsal).some((l) => l.some((x) => x.name === n)));
    const s2 = [];
    if (schol.length) s2.push(schol.slice(0, 2).map((n) => `${present.filter((k) => salAt(k).includes(n)).map((k) => `${POS_KO[k]}주`).join('·')}의 ${K.SINSAL[n].title}: ${first(K.SINSAL[n].text)}`).join(' '));
    if (ins.length && seats('관성').length) s2.push(`관성 ${seats('관성')[0].ch}이 인성 ${ins[0].ch}을 낳는 관인상생이라 시험·자격이 곧 자리로 이어지는 구조예요`);
    if (seats('식상').length) s2.push(`식상 ${seats('식상').map((x) => x.ch).join('·')}이 있어 배운 것을 말과 글로 꺼내는 발표·논술·실기에 강해요`);
    if (lv('재성') === '강') s2.push('재성이 강해 공부보다 실속·현실이 먼저 눈에 들어와 이론 공부는 목표(돈·자격)가 분명할 때만 집중돼요');
    if (s2.length) p.push(s2.join('. ') + '.');
    const yl = yongLine('인성', '배움·자격'); p.push(yl || `용신 ${yong.el}(${ko[yong.el]})의 요일·시간대(${D.YONG_DETAIL[yong.el].weekday}, ${D.YONG_DETAIL[yong.el].time})에 공부하면 집중이 오래 가요.`);
    const kb = kbLine('학업'); if (kb) p.push(kb);
    const dl = daeunLine('학업', '학업운'); if (dl) p.push(dl);
    out.학업 = p;
  }

  return out;
}
