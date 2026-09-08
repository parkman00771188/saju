import { useEffect, useMemo, useRef, useState, Fragment } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { interpret } from '../saju/interpret.js';
import { buildFaq } from '../saju/faq.js';
import { buildGaeun } from '../saju/gaeun.js';
import { eventFor, makeEventCtx } from '../saju/events.js';
import { yearExpertOverview } from '../saju/yearExpert.js';
import { loadDigest, pickDigest } from '../saju/digest.js';
import { monthRange } from '../saju/faq.js';
import { READING_SOURCES } from '../saju/context.js';
import { CATS, CAT_META, STEMS as KSTEMS, ELEMENTS as KEL, SINSAL as KSINSAL, TEN_GOD_GROUP } from '../data/knowledge.js';
import { GLOSSARY } from '../data/glossary.js';
import * as D from '../data/deep.js';
import { ELEMENT_COLOR, ELEMENT_KO, STEM_KO, BRANCH_KO, ELEMENTS, HIDDEN_STEMS, STEM_ELEMENT } from '../saju/tables.js';
import { Trend, MonthBars } from './Charts.jsx';
import Tile from './Tile.jsx';
import { Score, GZ, Evidence, PatternCard, polClass, cleanKw } from './ReadingParts.jsx';

const STEM_KEYS = { 甲: ['추진력', '책임감', '정직함'], 乙: ['적응력', '사교성', '실속'], 丙: ['열정', '솔직함', '표현력'], 丁: ['집중력', '헌신', '직관'], 戊: ['신뢰', '포용', '안정'], 己: ['실속', '꼼꼼함', '돌봄'], 庚: ['결단', '의리', '실행'], 辛: ['섬세함', '분석력', '심미안'], 壬: ['지혜', '포용', '기획력'], 癸: ['감성', '통찰', '인내'] };
const EL_HEX = { 木: '#5f9a2c', 火: '#c8442f', 土: '#d69a2c', 金: '#8c8c8c', 水: '#3b3f47' };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const first = (s) => (s?.match(/^[^.!?]*[.!?]/) || [s])[0];
const PAIR_MEAN = { 충: '서로 부딪혀 움직이는 힘 — 변화·이동·갈등이 생겨요', 육합: '서로 끌어당겨 묶이는 인연 — 협력이 잘돼요', 합: '서로 끌어당겨 묶이는 인연 — 협력이 잘돼요', 삼합: '여러 글자가 한 팀으로 뭉치는 큰 힘 — 그 방향으로 크게 움직여요', 방합: '같은 계절 글자가 뭉쳐 기운이 세져요', 천간합: '겉으로 드러난 마음이 한쪽으로 묶여요', 천간충: '생각과 태도가 흔들리기 쉬워요', 형: '서로 조정하느라 마찰이 생겨요 — 다툼·수술·법 문제 주의', 파: '약속이나 틀이 깨지기 쉬워요', 해: '은근한 방해가 끼기 쉬워요', 원진: '이유 없는 미움·오해가 쌓여요 — 감정보다 사실로', 귀문: '예민한 직관, 날카로운 신경 — 잠과 운동으로 풀어요' };
const PAIR_ROLE = { 년: '집안·초년·윗사람', 월: '직장·사회', 일: '나·배우자·몸', 시: '자식·말년·계획' };
const pairMeaning = (r) => { const k = Object.keys(PAIR_MEAN).sort((a, b) => b.length - a.length).find((x) => r.kind.includes(x)); const roles = [...new Set(r.chars.map((c) => PAIR_ROLE[c.posKo]).filter(Boolean))]; return `${k ? PAIR_MEAN[k] : ''}${roles.length > 1 ? ` · ${roles.join('과 ')} 영역 사이에서` : roles.length === 1 ? ` · ${roles[0]} 영역에서` : ''}`; };
const GLYPHS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸', '子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인', '관성', '재성', '인성', '식상', '비겁', '용신', '기신', '희신', '무관', '무재', '무인성', '관살혼잡', '재다신약', '군겁쟁재', '식상생재', '관인상생', '재생관', '상관견관', '식신제살', '재고', '공망', '원진'];

/** 핵심 단어 강조 */
function Hl({ text, words = [] }) {
  const ws = [...new Set(words.filter((w) => w && text?.includes(w)))];
  if (!ws.length || !text) return text || null;
  const rx = new RegExp(`(${ws.map(esc).join('|')})`, 'g');
  return text.split(rx).map((part, i) => (ws.includes(part) ? <b key={i} className="hl">{part}</b> : <Fragment key={i}>{part}</Fragment>));
}
const P = ({ children, words }) => <p className="bp">{typeof children === 'string' ? <Hl text={children} words={words} /> : children}</p>;
const Sub = ({ children }) => <h3 className="bsub">{children}</h3>;
const Callout = ({ children, tone = 'green' }) => <div className={`callout ${tone}`}>{children}</div>;
const Chips = ({ items, tone }) => <div className="bchips">{items.filter(Boolean).map((c, i) => <span key={i} className={`bchip ${tone || ''} ${typeof c === 'object' ? c.tone || '' : ''}`}>{typeof c === 'object' ? c.label : c}</span>)}</div>;
const Divider = () => <hr className="bdiv" />;
const More = ({ title = '더 자세히 보기', children }) => <details className="bmore" open><summary>{title}</summary><div>{children}</div></details>;

function PillarsRow({ data, labels = {} }) {
  const keys = ['time', 'day', 'month', 'year'];
  const names = { time: '시', day: '일', month: '월', year: '년' };
  return (
    <div className="prow">
      {keys.map((k) => {
        const p = data.pillars[k];
        return (
          <div key={k} className={`pcol2 ${k === 'day' ? 'me' : ''}`}>
            <span className="pname">{names[k]}</span>
            <span className="plabel">{labels[k] || ' '}</span>
            {p ? <><Tile ch={p.stem} ko={p.stemKo} el={p.stemEl} size="md" flip={false} /><Tile ch={p.branch} ko={p.branchKo} el={p.branchEl} size="md" flip={false} /></> : <><Tile ghost size="md" flip={false} /><Tile ghost size="md" flip={false} /></>}
          </div>
        );
      })}
    </div>
  );
}
function BarChart({ rows, unit = '%' }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="bars2">
      {rows.map((r) => (
        <div key={r.label} className="bar2c">
          <b style={{ color: r.color }}>{r.value}{unit}</b>
          <div className="bar2t"><motion.i style={{ background: r.color }} initial={{ height: 0 }} animate={{ height: `${(r.value / max) * 100}%` }} transition={{ duration: 0.8 }} /></div>
          <span style={{ color: r.color }}>{r.label}</span>
        </div>
      ))}
    </div>
  );
}
function Gauge2({ pct, left, right, color }) {
  return <div className="gauge2"><div className="g2l"><span>{left}</span><span>{right}</span></div><div className="g2t"><motion.i style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9 }} /><em style={{ left: `${pct}%` }}>{pct}%</em></div></div>;
}

/* ---------------- 페이지 구성 ---------------- */
/** 전문가들이 실제로 말한 문장(정제·요약) */
function Digest({ digest, keys, cat = null, n = 5, title = '전문가들이 실제로 이렇게 말해요', note }) {
  if (digest === null) return <p className="dg-loading">전문가 발언을 불러오는 중…</p>;
  const items = pickDigest(digest, keys, cat, n);
  if (!items.length) return null;
  return (
    <div className="digest">
      <b className="dg-title">{title}</b>
      <ul>{items.map((it, i) => <li key={i}><span className="dg-from">{it.from}</span><span className="dg-t">{it.t}</span></li>)}</ul>
      <small>{note || '강의에서 반복된 말을 짧게 정리한 문장이에요. 내 사주의 글자·조합에 해당하는 것만 골랐어요.'}</small>
    </div>
  );
}

function buildPages(R, data, digest) {
  const S = KSTEMS[data.dayStem];
  const dayEl = data.pillars.day.stemEl;
  const ko = ELEMENT_KO;
  const name = data.meta.name ? `${data.meta.name}님` : '나';
  const present = data.order.filter((k) => data.pillars[k]);
  // 오행 % (자리 가중치: 월지 2, 일지 1.5, 월간 1.2, 나머지 1)
  const w = { year: [1, 1], month: [1.2, 2], day: [1, 1.5], time: [1, 1] };
  const acc = Object.fromEntries(ELEMENTS.map((e) => [e, 0]));
  for (const k of present) { acc[data.pillars[k].stemEl] += w[k][0]; acc[data.pillars[k].branchEl] += w[k][1]; }
  const tot = Object.values(acc).reduce((a, b) => a + b, 0);
  const elRows = ELEMENTS.map((e) => ({ label: `${ko[e]} ${e}`, value: Math.round((acc[e] / tot) * 1000) / 10, color: EL_HEX[e] }));
  const groups = ['비겁', '식상', '재성', '관성', '인성'];
  const gtot = Object.values(R.profile.groups).reduce((a, b) => a + b, 0) || 1;
  const gRows = groups.map((g) => ({ label: g, value: Math.round(((R.profile.groups[g] || 0) / gtot) * 100), color: ['#7a6a5a', '#5f9a2c', '#d69a2c', '#4f6fd8', '#8a63c9'][groups.indexOf(g)] }));
  const gy = R.gyeok, y = R.yong;
  const elWords = [...ELEMENTS.flatMap((e) => [`${e}(${ko[e]})`, e]), '용신', '희신', '기신', '구신'];
  const sumGroup = (title) => R.summary.find((g) => g.title === title);
  const seun = R.years.find((yy) => yy.year === data.current.nowYear);
  const monthsNow = R.monthsOf(data.current.nowYear);
  const monthNow = monthsNow.find((m) => m.monthNo === data.current.nowMonth);
  const evAll = Object.values(R.evidenceByCat).flat().sort((a, b) => b.weight - a.weight).slice(0, 7);

  const pages = [];
  pages.push({ id: 'cover', title: `${name}의 사주풀이`, cover: true, terms: ['사주팔자', '일간', '형국'], body: (
    <>
      <PillarsRow data={data} labels={{ day: '일간(나)' }} />
      <Callout><b>"{R.climate.image}"</b><br />{R.climate.season}에 태어난 {ko[dayEl]} 일간 · {gy.key} · {R.strength.label}</Callout>
      <Chips items={[`일간 ${data.dayStem} ${ko[dayEl]}`, gy.key, `용신 ${y.el}(${ko[y.el]})`, `필요한 기운 ${R.needEl}(${ko[R.needEl]})`]} />
      <P>아래 화살표나 좌우 스와이프로 한 장씩 넘겨 보세요. 각 장은 <b className="hl">쉬운 한 줄 요약</b>과 핵심 설명, 그리고 "더 자세히 보기"로 이루어져 있어요. 모르는 말이 나오면 아래 <b className="hl">용어해석</b>을 누르세요.</P>
      <P>이 풀이는 만세력 계산 + 명리 규칙(격국·용신·자리·신살·대운) + 사주 전문가 강의 {R.meta.docs.toLocaleString()}편에서 정리한 의견 통계를 합쳐 만든 참고 자료예요. 점수와 그래프는 비교를 돕는 지수이고, 정해진 답이 아니라 나를 이해하는 힌트로 읽어 주세요.</P>
    </>
  ) });

  const dayText = data.pillars.day.text, nowYr = data.current.nowYear, yearBr = data.pillars.year.branch;
  const evKeys = (R.evidence || []).map((e) => e.key);
  pages.push({ id: 'ilgan', title: '나를 나타내는 글자 (일간)', terms: ['일간', '천간·지지', '오행'], body: (
    <>
      <Digest digest={digest} keys={[data.dayStem]} cat={null} n={5} title={`전문가들이 ${STEM_KO[data.dayStem]} 일간을 이렇게 말해요`} />
      <div className="hero-tile"><Tile ch={data.dayStem} ko={STEM_KO[data.dayStem]} el={dayEl} size="lg" flip={false} /><div><b>{S.title}</b><span>{S.sub}</span></div></div>
      <Callout>{S.sub}. <b>{first(S.nature)}</b></Callout>
      <Chips items={STEM_KEYS[data.dayStem]} />
      <Sub>성격</Sub><P words={STEM_KEYS[data.dayStem]}>{S.nature}</P>
      <Divider /><Sub>강점</Sub><P words={STEM_KEYS[data.dayStem]}>{S.strengths}</P>
      <Divider /><Sub>주의할 점</Sub><P>{S.cautions}</P>
      <Divider /><Sub>사람을 대할 때</Sub><P>{S.love}</P>
      <More><Sub>일하는 방식</Sub><P>{S.work}</P><Sub>돈을 다루는 방식</Sub><P>{S.money}</P></More>
    </>
  ) });

  pages.push({ id: 'climate', title: '태어난 계절과 형국', terms: ['조후', '형국', '오행'], body: (
    <>
      <div className="hero-quote"><span>“</span>{R.climate.image}<span>”</span></div>
      <Callout>{R.climate.season}에 태어난 {ko[dayEl]} 일간이라 <b>{R.needEl}({ko[R.needEl]}) 기운</b>이 가장 필요해요 — {R.climate.needWhy}.</Callout>
      <Chips items={[`${R.climate.season}생`, `필요한 기운 ${R.needEl}`, R.climate.needCount ? `원국에 ${R.climate.needCount}개` : '원국에 없음', R.climate.inNeedDaeun ? '지금 대운에 들어옴' : null]} />
      {R.climate.paras.map((p, i) => <P key={i} words={[`${R.needEl}(${ko[R.needEl]})`, R.needEl, '투출']}>{p}</P>)}
      {R.climate.timing.years.length > 0 && <><Sub>{R.needEl} 기운이 들어오는 해</Sub><Chips items={R.climate.timing.years.map((yy) => `${yy.year} ${yy.text}`)} /></>}
      {R.climate.timing.daeun.length > 0 && <><Sub>{R.needEl} 기운이 들어오는 대운</Sub><Chips items={R.climate.timing.daeun.map((d) => `${d.age}세~ ${d.text}`)} /></>}
    </>
  ) });

  const iljuPat = R.patterns.find((p) => p.kind === '일주');
  pages.push({ id: 'ilju', title: '나의 일주 이야기', terms: ['일주', '십이운성', '지장간'], body: (
    <>
      <Digest digest={digest} keys={[dayText]} cat={null} n={6} title={`전문가들이 ${dayText} 일주를 이렇게 말해요`} />
      <div className="hero-ilju"><span className="hj" style={{ color: EL_HEX[dayEl] }}>{data.pillars.day.text}</span><b>{STEM_KO[data.dayStem]}{BRANCH_KO[data.pillars.day.branch]}일주</b></div>
      {iljuPat && <div className="hero-quote small"><span>“</span>{iljuPat.img}<span>”</span></div>}
      <Callout>{iljuPat ? first(iljuPat.pos) : first(D.POS_BRANCH.day[data.detail.day.branchGod])}</Callout>
      <Chips items={[data.detail.day.branchGod, data.detail.day.stage, data.detail.day.salDay, ...(iljuPat?.stats?.keywords ? cleanKw(iljuPat.stats.keywords).filter((k) => !/일주|일간/.test(k)).slice(0, 2) : [])]} />
      <Sub>성격</Sub>
      {iljuPat && <><P words={['자립', '독립', '추진력', '명예', '매력', '총명', '인내', '예술']}>{iljuPat.pos}</P><P words={['고독', '갈등', '마찰', '주의', '조심']}>다만 {iljuPat.neg}</P></>}
      <P>{D.POS_BRANCH.day[data.detail.day.branchGod]}</P>
      <Divider /><Sub>배우자 자리</Sub>
      <P words={['배우자']}>{`배우자상은 "${D.SPOUSE[data.pillars.day.branch]}"`}</P>
      <P>일지의 십이운성이 {data.detail.day.stage}이라 결혼 생활은 {D.STAGE_LIFE[data.detail.day.stage]}.</P>
      <Divider /><Sub>대인관계</Sub><P>{require_(data)}</P>
      <More><P>지장간 {data.detail.day.hidden.map((h) => `${h.ko}(${h.god})`).join('·')}이 숨어 있어 배우자와 가정 안에 이 기운들이 함께 작용해요.</P>{iljuPat?.stats && <P>사주 전문가들의 강의 {iljuPat.stats.docs}편에서 {data.pillars.day.text} 일주가 다뤄졌고, 어조는 {iljuPat.stats.polarity > 0.15 ? '긍정 쪽' : iljuPat.stats.polarity < -0.15 ? '부정 쪽' : '중립'}이에요.</P>}</More>
    </>
  ) });

  pages.push({ id: 'elements', title: '나의 에너지는 어떤 모습 (오행)', terms: ['오행', '지장간'], body: (
    <>
      <BarChart rows={elRows} />
      <p className="legend"><i style={{ background: EL_HEX[R.climate.dayEl] }} />타고난 오행 (자리 가중치 반영 %)</p>
      <Callout><b>{data.elements[R.profile.dominant] !== undefined ? '' : ''}{ELEMENTS.reduce((a, b) => (acc[b] > acc[a] ? b : a))}({ko[ELEMENTS.reduce((a, b) => (acc[b] > acc[a] ? b : a))]}) 기운</b>이 가장 강하고{data.missing.length ? <>, <b>{data.missing.map((m) => `${m}(${ko[m]})`).join('·')}</b> 기운은 비어 있어요.</> : ', 다섯 기운이 모두 있어요.'}</Callout>
      <Sub>겉으로 드러나는 힘</Sub>
      <P words={elWords}>{KEL[ELEMENTS.reduce((a, b) => (acc[b] > acc[a] ? b : a))].excess}</P>
      {data.missing.length > 0 && <><Divider /><Sub>비어 있는 기운</Sub>{data.missing.map((m) => <P key={m} words={elWords}>{`${KEL[m].lack} ${m}(${ko[m]})은 ${KEL[m].organ} 계통과 "${D.YONG[m].mean}"의 영역을 뜻해요. ${KEL[m].remedy} 같은 것으로 채우고, ${m} 운(${KEL[m].luckBranches.join('·')} 해·달)에 그 영역이 움직이는 것을 기회로 삼으세요.`}</P>)}</>}
      <More>{(sumGroup('오행과 십성의 구조')?.paras || []).slice(0, 1).map((p, i) => <P key={i}>{p}</P>)}</More>
    </>
  ) });

  pages.push({ id: 'gyeok', title: '관계 속에서의 내 스타일 (격국으로 보는 나)', terms: ['격국', '십성(십신)'], body: (
    <>
      <Digest digest={digest} keys={[R.gyeok.key, `월지+${data.detail.month.branchGod}`, data.detail.month.branchGod]} cat={null} n={4} title={`전문가들이 ${R.gyeok.key}·월지 ${data.detail.month.branchGod}을 이렇게 말해요`} />
      <PillarsRow data={data} labels={{ month: gy.key, day: '일간(나)' }} />
      <Callout><b>{gy.tag}</b>. {first(gy.desc)}</Callout>
      <Chips items={gy.career} />
      <Sub>관계 속에서 만나는 나</Sub><P words={[gy.key, '명예', '책임', '표현', '재물', '배움', '자립']}>{gy.desc}</P>
      <Divider /><Sub>나를 이끄는 기운의 틀</Sub><P>{gy.strength}</P>
      <Divider /><Sub>조심할 점</Sub><P>{gy.weakness}</P>
      <Divider /><Sub>이렇게 쓰면 좋아요</Sub><P>{gy.advice}</P>
      <More title="격은 어떻게 정했나요?">
        <P words={[gy.key, '투출', '정기', '중기', '여기', '왕지', '삼합']}>{gy.how.reason}</P>
        <div className="pairlist">{gy.how.hidden.map((h) => <div key={h.stem} className={`pairrow ${h === gy.how.pick ? 'pick' : ''}`}><span className="pk">{h.role}</span><b>{h.stem}({h.ko})</b><span>{h.god}</span>{h.transparent && <span className="pt">{h.at.join('·')} 투출</span>}{h === gy.how.pick && <span className="pt on">격</span>}</div>)}</div>
        {gy.how.altNote && <P words={[gy.how.alt]}>{gy.how.altNote}</P>}
        <P>{`격국은 태어난 달(월지 ${data.pillars.month.branch})의 지장간 가운데 천간에 드러난(투출) 글자로 정해요. 월지는 부모·사회·직장 환경을 뜻하는 자리라, 격국은 "내가 세상과 만나는 방식"을 보여 줍니다.`}</P>
        <P>{D.POS_BRANCH.month[data.detail.month.branchGod]}</P>
      </More>
    </>
  ) });

  pages.push({ id: 'yong', title: '힘의 균형과 나를 돕는 기운 (용신)', terms: ['신강·신약', '용신', '희신·기신·구신', '통근·투출'], body: (
    <>
      <Gauge2 pct={R.strength.pct} left="신약 (나를 채워야 함)" right="신강 (밖으로 써야 함)" color="#d69a2c" />
      <Callout>{name}은 <b>{R.strength.label}</b> 사주예요. 힘이 되는 기운은 <b>{y.el}({ko[y.el]})</b>과 {y.hee}({ko[y.hee]}), 조심할 기운은 <b>{y.gi}({ko[y.gi]})</b>이에요.</Callout>
      <Chips items={[{ label: `용신 ${y.el} ${ko[y.el]}`, tone: 'good' }, { label: `희신 ${y.hee} ${ko[y.hee]}`, tone: 'good' }, { label: `기신 ${y.gi} ${ko[y.gi]}`, tone: 'bad' }, { label: `구신 ${y.gu} ${ko[y.gu]}`, tone: 'gray' }, { label: `한신 ${y.han} ${ko[y.han]}`, tone: 'gray' }, { label: `조후 ${R.needEl} ${ko[R.needEl]}`, tone: 'good' }]} />
      <Digest digest={digest} keys={[R.strength.label, R.yong.el + '과다', ...data.missing.map((m) => m + '결핍')]} cat={null} n={4} title={`전문가들이 ${R.strength.label}·오행 구성을 이렇게 말해요`} />
      <Sub>나의 힘 — {R.strengthProfile.label} 사주는 보통 이래요</Sub>
      <Callout tone="orange"><b>{R.strengthProfile.headline}</b></Callout>
      <P words={['신강', '신약', '중화', '비겁', '인성', '관성', '재성', '식상']}>{R.strengthProfile.traits}</P>
      <P words={GLYPHS}>{R.strengthProfile.personal}</P>
      <div className="catrows">
        <div className="catrow"><b style={{ color: '#2f8a4b' }}>강점</b><p>{R.strengthProfile.strengths}</p></div>
        <div className="catrow"><b style={{ color: '#d6453d' }}>조심</b><p>{R.strengthProfile.cautions}</p></div>
        {CATS.filter((c) => R.strengthProfile.life[c]).map((c) => <div className="catrow" key={c}><b style={{ color: CAT_META[c].color }}>{c}</b><p>{R.strengthProfile.life[c]}</p></div>)}
      </div>
      <P>{R.strengthProfile.tips}</P>
      <Divider /><Sub>용신이란 — 내게 가장 필요한 기운</Sub><P words={elWords}>{y.text}</P>
      <More title="용신·희신·기신은 어떻게 정했나요?">
        <div className="pairlist">{[['용신', y.el, y.group, y.why], ['희신', y.hee, y.groups.hee, y.how.hee], ['기신', y.gi, y.groups.gi, y.how.gi], ['구신', y.gu, y.groups.gu, y.how.gu], ['한신', y.han, y.groups.han, y.how.han]].map(([r, e, g, d]) => <div key={r} className={`pairrow wrap ${r === '용신' ? 'pick' : ''}`}><span className="pk">{r}</span><b>{e}({ko[e]})</b><span>{g}</span><span className="pt">{d}</span></div>)}</div>
        <P>{R.strength.label === '신강' ? '신강한 사주는 힘을 눌러 주는 식상·재성·관성이 좋은 편(용신·희신)이고, 힘을 더 보태는 비겁·인성이 조심할 편(기신·구신)이에요. 그중 균형을 깨뜨린 원인이 되는 기운을 기신으로 봅니다.' : R.strength.label === '신약' ? '신약한 사주는 힘을 세워 주는 인성·비겁이 좋은 편(용신·희신)이고, 힘을 빼앗는 식상·재성·관성이 조심할 편(기신·구신·한신)이에요. 그중 약하게 만든 원인(병)이 되는 기운을 기신으로 봅니다.' : '강약이 균형에 가까운 중화 사주는 계절(조후)이 필요로 하는 기운을 용신으로 삼고, 용신을 낳는 기운을 희신, 용신을 치는 기운을 기신으로 봅니다.'}</P>
      </More>
      <Divider /><Sub>이렇게 채워요 (개운법)</Sub>
      <Chips items={[`색 ${y.open.color}`, `방향 ${y.open.dir}`, `숫자 ${y.open.num}`, `계절·시간 ${y.open.season}`, `음식 ${y.open.food}`]} tone="soft" />
      <P>{y.open.habit}. 어울리는 일은 {y.open.job}. {y.open.avoid}</P>
      <More><Sub>뿌리와 투출</Sub><P words={['통근', '투출']}>{R.roots.text}</P></More>
    </>
  ) });

  pages.push({ id: 'issues', title: '타고난 약한 고리와 그것을 채워 주는 운', terms: ['조후', '신강·신약', '용신', '합', '충', '공망'], body: (
    <>
      <Callout>{name}의 사주에는 <b>{R.issues.length}가지 약한 고리</b>가 있어요. 약점은 고정된 것이 아니라, 운이 들어올 때마다 <b>채워지거나 더 도드라져요</b>. 어떤 운이 무엇을 채워 주는지 아래에 정리했어요.</Callout>
      <div className="issuelist">
        {R.issues.map((it) => {
          const helpsD = R.daeunAll.filter((d) => !d.past && d.dyn.helps.some((h) => h.id === it.id));
          const hurtsD = R.daeunAll.filter((d) => !d.past && d.dyn.hurts.some((h) => h.id === it.id));
          const helpsY = R.years.filter((y) => y.year >= data.current.nowYear && y.dyn.helps.some((h) => h.id === it.id)).slice(0, 4);
          const hurtsY = R.years.filter((y) => y.year >= data.current.nowYear && y.dyn.hurts.some((h) => h.id === it.id)).slice(0, 3);
          return (
            <div key={it.id} className={`issue sev${it.severity}`}>
              <div className="issue-head"><span className="ik">{it.kind}</span><b>{it.title}</b></div>
              <P words={GLYPHS}>{it.easy}</P>
              <div className="issue-when">
                <div className="iw good"><span>채워 주는 때</span>{helpsD.length || helpsY.length ? <p>{[...helpsD.map((d) => `${d.age}~${d.age + 9}세 ${d.stem}${d.branch} 대운(${d.startYear}~)`), ...helpsY.map((y) => `${y.year}년 ${y.text}`)].join(' · ')}</p> : <p>가까운 대운·해에는 뚜렷하게 채워 주는 운이 없어요 — 생활 속 개운법으로 보완하세요.</p>}</div>
                {it.worseText && <div className="iw bad"><span>더 도드라지는 때</span>{hurtsD.length || hurtsY.length ? <p>{[...hurtsD.map((d) => `${d.age}~${d.age + 9}세 ${d.stem}${d.branch} 대운(${d.startYear}~)`), ...hurtsY.map((y) => `${y.year}년 ${y.text}`)].join(' · ')}</p> : <p>가까운 대운·해에는 크게 건드리는 운이 없어요.</p>}</div>}
              </div>
            </div>
          );
        })}
      </div>
      <P>읽는 법: 사주는 여덟 글자와 운이 서로 밀고 당기며 움직여요. 예를 들어 원국에 부족한 기운이 운으로 들어오면 그동안 안 풀리던 일이 풀리고, 두 글자가 부딪히는 자리(충)에 합이 되는 글자가 오면 그 부딪힘이 잦아들어요. 각 운 페이지의 "지금 흐르는 운"과 질문 답의 연도 카드에도 이 관계를 함께 적어 두었어요.</P>
    </>
  ) });

  pages.push({ id: 'structure', title: '십성으로 본 나의 구조', terms: ['십성(십신)', '비견', '식신', '편재', '편관', '정인'], body: (
    <>
      <BarChart rows={gRows} />
      <p className="legend"><i style={{ background: '#7a6a5a' }} />비겁=나 · 식상=표현 · 재성=재물 · 관성=책임 · 인성=배움</p>
      <Callout><b>{R.profile.dominant}</b> 중심의 구조예요{R.profile.missing.length ? <> — <b>{R.profile.missing.join('·')}</b>은 비어 있어요.</> : '.'}</Callout>
      {(sumGroup('오행과 십성의 구조')?.paras || []).slice(1).map((p, i) => <P key={i} words={['비겁', '식상', '재성', '관성', '인성', '비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인']}>{p}</P>)}
    </>
  ) });

  pages.push({ id: 'pillars', title: '네 기둥, 인생의 네 시기', terms: ['천간·지지', '십이운성', '십이신살', '공망'], body: (
    <>
      <Callout>년주는 <b>초년·조상</b>, 월주는 <b>청년·사회</b>, 일주는 <b>중년·나와 배우자</b>, 시주는 <b>말년·자식</b>을 보여 줘요.</Callout>
      <div className="posgrid book">
        {R.positions.map((p) => (
          <article key={p.pos} className={`poscard ${p.pos === 'day' ? 'me' : ''}`}>
            <header><GZ g={p.gz} /><div><b>{p.ko} · {p.root}</b><small>{p.period}<br />{p.who}</small></div></header>
            <div className="posmeta"><span>{p.pos !== 'day' ? `천간 ${p.stemGod}` : '일간(나)'}</span><span>지지 {p.branchGod}</span><span>{p.stage}</span><span>{p.sal}</span>{p.gongmang && <span className="gm">공망</span>}</div>
            {p.texts.slice(0, 2).map((t, i) => <p key={i}>{t}</p>)}
            <details className="bmore tiny" open><summary>더 보기</summary>{p.texts.slice(2).map((t, i) => <p key={i}>{t}</p>)}</details>
          </article>
        ))}
      </div>
      <More title="인생 4단계 한눈에">{R.lifeStages.map((l, i) => <P key={i}>{l.text}</P>)}</More>
    </>
  ) });

  const rel = data.relations;
  const pairs = [...rel.stemHap.map((r) => ({ ...r, kind: '천간합' })), ...rel.stemChung.map((r) => ({ ...r, kind: '천간충' })), ...rel.yukhap.map((r) => ({ ...r, kind: '육합' })), ...rel.samhap.filter((r) => r.full).map((r) => ({ ...r, kind: '삼합' })), ...rel.chung.map((r) => ({ ...r, kind: '충' })), ...rel.hyeong.map((r) => ({ ...r, kind: r.label })), ...rel.pa.map((r) => ({ ...r, kind: '파' })), ...rel.hae.map((r) => ({ ...r, kind: '해' })), ...rel.wonjin.map((r) => ({ ...r, kind: '원진' })), ...rel.gwimun.map((r) => ({ ...r, kind: '귀문' }))];
  pages.push({ id: 'relations', title: '글자들의 만남 (합·충)', terms: ['합', '충', '형·파·해', '원진', '귀문관살', '공망'], body: (
    <>
      <Callout>여덟 글자 사이에 <b>{pairs.length}개</b>의 특별한 만남이 있어요. 합은 묶임·인연, 충은 변화·움직임이에요.</Callout>
      <div className="pairlist">{pairs.length ? pairs.map((r, i) => <div key={i} className={`pairrow wrap ${/충|원진|형|파|해|귀문/.test(r.kind) ? 'bad' : 'good'}`}><span className="pk">{r.kind}</span><b>{r.chars.map((c) => `${c.posKo}주 ${c.ch}`).join(' + ')}</b><span className="pt">{pairMeaning(r)}</span></div>) : <p className="bp">뚜렷한 합·충이 없어요.</p>}</div>
      {pairs.length > 0 && <P>합과 충은 좋고 나쁨이 아니라 "묶이는 힘"과 "움직이는 힘"이에요. 위 자리들 사이에서 그 힘이 어떻게 나타나는지는 직장·금전·연애·건강 페이지의 "글자들이 만나는 모습"에서 영역별로 풀어 드려요.</P>}
      {(sumGroup('글자들의 관계와 신살')?.paras || []).filter((p) => !/있어 /.test(p) || /충|합|원진|귀문|형|해/.test(p)).slice(0, pairs.length ? pairs.length + 1 : 1).map((p, i) => <P key={i} words={['충(沖)', '합', '원진(怨嗔)', '귀문관살', '해(害)', '형(刑)']}>{p}</P>)}
    </>
  ) });

  const sinsalList = [...new Set(present.flatMap((k) => (data.sinsal[k] || []).map((s) => s.name)))];
  pages.push({ id: 'sinsal', title: '나를 따르는 별 (신살)', terms: ['십이신살', '도화살', '역마살', '화개살', '천을귀인', '백호대살·괴강', '양인·홍염'], body: (
    <>
      <Callout>{sinsalList.length ? <>{name}에게는 <b>{sinsalList.slice(0, 4).join('·')}</b>{sinsalList.length > 4 ? ` 등 ${sinsalList.length}개` : ''}의 별이 있어요.</> : '두드러지는 신살이 없어 오행과 십성의 구조가 삶을 이끌어요.'}</Callout>
      <Digest digest={digest} keys={sinsalList} cat={null} n={6} title="전문가들이 내 신살을 이렇게 말해요" />
      <div className="sinsalgrid">
        {sinsalList.map((n) => { const s = KSINSAL[n]; const where = present.filter((k) => (data.sinsal[k] || []).some((x) => x.name === n)).map((k) => ({ year: '년주', month: '월주', day: '일주', time: '시주' }[k])).join('·'); return s ? <article key={n} className="sinsalcard"><header><b>{s.title}</b><small>{where}</small></header><p>{s.text}</p></article> : null; })}
      </div>
    </>
  ) });

  pages.push({ id: 'daeun', title: '인생의 큰 흐름 (대운)', terms: ['대운', '십이운성', '십이신살'], body: (
    <>
      <div className="dstrip">
        {R.daeunAll.map((d) => <div key={d.index} className={`dcard ${d.isNow ? 'now' : ''} ${d.past ? 'past' : ''}`}><span className="dage">{d.age}<small>세</small></span><span className="dyear">{d.startYear}</span><GZ g={d} /><span className="dgod">{d.stemGod}<br />{d.branchGod}</span><Score n={d.luck.overall} />{d.isNow && <em>지금</em>}</div>)}
      </div>
      {R.daeunFlow[0] && <Callout>지금은 <b>{R.daeunFlow[0].age}세부터의 {R.daeunFlow[0].stem}{R.daeunFlow[0].branch} 대운</b> — {R.daeunFlow[0].luck.head}이 10년의 주제예요.</Callout>}
      {R.daeunFlow.map((d) => <P key={d.index} words={['투출', '용신', '기신', '충', '공망']}>{d.text}</P>)}
      <More title="지나온 대운과 인생 4단계"><Sub>지나온 대운</Sub>{R.daeunAll.filter((d) => d.past).map((d) => <P key={d.index}>{d.text}</P>)}<Sub>인생 4단계</Sub>{R.lifeStages.map((l, i) => <P key={i}>{l.text}</P>)}</More>
    </>
  ) });

  for (const cat of CATS) {
    const c = R.cats[cat], m = CAT_META[cat];
    pages.push({ id: `cat-${cat}`, title: `${cat}운 — ${m.desc}`, terms: cat === '직장' ? ['격국', '정관', '편관(칠살)'] : cat === '금전' ? ['편재', '정재', '식신'] : cat === '연애' ? ['일주', '합', '충', '도화살'] : cat === '건강' ? ['오행', '편관(칠살)', '충'] : ['정인', '편인', '정관'], cat, color: m.color, body: <CategoryPage R={R} data={data} digest={digest} cat={cat} /> });
  }

  pages.push({ id: 'thisyear', title: `올해와 이달 (${data.current.nowYear}년 ${data.current.nowMonth}월)`, terms: ['세운', '월운', '삼재'], body: (
    <>
      {seun && <>
        <div className="hero-tile"><GZ g={seun} size="lg" /><div><b>{data.current.nowYear}년 {seun.text}년</b><span>{seun.age}세 · {seun.luck.head}</span></div></div>
        <Callout><b>{seun.luck.head}</b>이 올해의 중심이에요. {seun.luck.summary[1] ? first(seun.luck.summary[1]) : ''}</Callout>
        <div className="ytags">{seun.luck.hasNeed && <em className="ytag need">{R.needEl} 투출</em>}{seun.luck.hasYong && <em className="ytag hap">용신</em>}{seun.luck.hasGi && <em className="ytag chung">기신</em>}{seun.samjae && <em className="ytag">삼재</em>}{seun.luck.flags.map((f, i) => <em key={i} className={`ytag ${f.type === '충' ? 'chung' : f.type === '합' || f.type === '삼합' ? 'hap' : ''}`}>{f.ch} {f.type}</em>)}</div>
        {seun.luck.summary.map((s, i) => <P key={i} words={['투출', '용신', '기신', '삼재']}>{s}</P>)}
        <Sub>올해의 다섯 가지 운</Sub>
        <div className="catrows">{CATS.map((k) => <div key={k} className="catrow"><b style={{ color: CAT_META[k].color }}>{k}</b><Score n={seun.luck.scores[k]} color={CAT_META[k].color} /><p>{first(seun.luck.texts[k])}</p></div>)}</div>
      </>}
      {R.yearExpert?.now && (() => { const ov = yearExpertOverview(R.yearExpert.now); return (
        <>
          <Divider /><Sub>사주 전문가들이 말하는 {data.current.nowYear}년 — {R.yearExpert.now.personalSources.join('·') || '전체'}</Sub>
          {ov.paras.map((p, i) => <P key={i} words={['좋게 보는 쪽', '조심하라는 쪽']}>{p}</P>)}
          {ov.months.length > 0 && <div className="ymonths">{ov.months.map((m) => <div key={m.mk} className={`ym ${m.polarity > 0.15 ? 'good' : m.polarity < -0.15 ? 'bad' : ''}`}><b>{m.mk}</b><span>{m.labels.map((l) => l.label).join(' · ') || '언급만 있음'}</span></div>)}</div>}
          <Digest digest={digest} keys={[`${data.dayStem}+Y${nowYr}`, `${dayText}+Y${nowYr}`, `${yearBr}+Y${nowYr}`, `Y${nowYr}`]} cat={null} n={6} title={`전문가들이 ${nowYr}년을 이렇게 말해요`} note="신년운세 강의에서 내 일간·띠에 해당하는 대목을 정리한 문장이에요." />
          <p className="faq-note">{R.yearExpert.now.monthsScope === 'personal' ? `${R.yearExpert.now.personalSources.join('·')} 신년운세에서 짚은 달과 주제예요.` : '그해 전체 신년운세에서 짚은 달과 주제예요(내 일간·띠 콘텐츠에는 달 언급이 적어요).'} 아래 열두 달 그래프(내 사주 계산)와 함께 보면 시기를 고르기 쉬워요.</p>
        </>
      ); })()}
      <Divider /><Sub>{data.current.nowYear}년 열두 달 흐름</Sub>
      <MonthBars months={monthsNow} nowMonth={data.current.nowMonth} />
      {monthNow && <><Callout tone="orange">이달({data.current.nowMonth}월 {monthNow.text}) — <b>{monthNow.luck.head}</b></Callout>{monthNow.luck.summary.map((s, i) => <P key={i}>{s}</P>)}<div className="catrows">{CATS.map((k) => <div key={k} className="catrow"><b style={{ color: CAT_META[k].color }}>{k}</b><Score n={monthNow.luck.scores[k]} color={CAT_META[k].color} /><p>{monthNow.luck.texts[k]}</p></div>)}</div></>}
    </>
  ) });

  pages.push({ id: 'years', title: '앞으로 10년의 흐름', terms: ['세운', '대운', '삼재'], body: (
    <>
      <div className="flow-chart-scroll"><Trend points={R.years.map((yy) => ({ key: yy.year, label: String(yy.year).slice(2), value: yy.luck.overall, now: yy.year === data.current.nowYear, mark: yy.luck.hasNeed ? R.needEl : yy.samjae ? '삼재' : null }))} height={170} /></div>
      <Callout>가장 좋은 해는 <b>{[...R.years].sort((a, b) => b.luck.overall - a.luck.overall)[0].year}년</b>, 조심할 해는 <b>{[...R.years].sort((a, b) => a.luck.overall - b.luck.overall)[0].year}년</b>이에요. {R.needEl} 표시는 필요한 기운이 들어오는 해예요.</Callout>
      <div className="ylist book">
        {R.years.map((yy) => (
          <details key={yy.year} className={`ycard ${yy.year === data.current.nowYear ? 'now' : ''}`} open={yy.year === data.current.nowYear}>
            <summary className="yhead"><span className="yyear">{yy.year}<small>{yy.age}세</small></span><GZ g={yy} /><span className="ygod"><span>{yy.stemGod}·{yy.branchGod}</span><small>{yy.luck.head}</small></span><Score n={yy.luck.overall} /><i className="chev" /></summary>
            <div className="ybody">{yy.luck.summary.map((s, i) => <p key={i}>{s}</p>)}<div className="catrows">{CATS.map((k) => <div key={k} className="catrow"><b style={{ color: CAT_META[k].color }}>{k}</b><Score n={yy.luck.scores[k]} color={CAT_META[k].color} /><p>{first(yy.luck.texts[k])}</p></div>)}</div></div>
          </details>
        ))}
      </div>
    </>
  ) });

  pages.push({ id: 'evidence', title: '사주 전문가들이 말하는 나', terms: ['십성(십신)', '격국', '십이신살'], body: (
    <>
      <Callout>{name}의 글자와 조합에 대해 사주 전문가들이 <b>실제로 반복해서 말하는 이야기</b>를 좋은 것·조심할 것 가리지 않고 모았어요.</Callout>
      <div className="evsum"><div className="col p"><h5>吉 · 좋게 보는 점</h5>{R.evidenceSummary.pos.map((r) => <span key={r.label}>{r.label} <small>{r.n || r.docs}회</small></span>)}</div><div className="col n"><h5>凶 · 조심하라는 점</h5>{R.evidenceSummary.neg.map((r) => <span key={r.label}>{r.label} <small>{r.n || r.docs}회</small></span>)}</div></div>
      <Evidence rows={evAll} />
      {R.keywords.length > 0 && <><Sub>함께 자주 나오는 말</Sub><div className="kws">{R.keywords.map((k) => <i key={k}>#{k}</i>)}</div></>}
      <More title={`이 사주의 조합 ${R.patterns.length}개 (吉/凶·전문가들의 어조)`}><div className="plist">{R.patterns.map((p, i) => <PatternCard key={p.key} p={p} i={i} claimMeta={R.meta.claims || {}} />)}</div></More>
    </>
  ) });

  pages.push({ id: 'advice', title: '조언과 개운법 — 생활에서 운을 바꾸는 법', terms: ['용신', '희신·기신·구신·한신', '조후', '신살'], body: (
    <>
      <Callout><b>{R.advice[0]}</b></Callout>
      <Chips items={[{ label: `용신 ${y.el} — ${y.open.color}`, tone: 'good' }, { label: `${y.open.dir} 방향`, tone: 'good' }, { label: `숫자 ${y.open.num}`, tone: 'good' }, { label: `기신 ${y.gi} 환경 주의`, tone: 'bad' }]} />
      {R.advice.slice(1).map((p, i) => <P key={i} words={elWords}>{p}</P>)}
      {buildGaeun(R, data).map((sec) => (
        <Fragment key={sec.title}>
          <Divider /><Sub>{sec.icon} {sec.title}</Sub>
          {sec.chips?.length ? <Chips items={sec.chips} /> : null}
          {sec.paras.map((p, i) => <P key={i} words={[...elWords, '조후', '한신', '요일', '일진']}>{p}</P>)}
        </Fragment>
      ))}
      <Divider /><Sub>이 풀이를 읽는 법</Sub>
      <P>사주는 정해진 운명이 아니라 타고난 기질과 흐름의 지도예요. 좋은 시기에는 과감하게, 낮은 시기에는 지키면서 가면 같은 길도 덜 헤매며 갈 수 있어요. 점수·그래프는 참고 지수이고 건강 문구는 진단이 아닌 생활 관리의 힌트예요.</P>
      <details className="bmore"><summary>참고 자료</summary>{READING_SOURCES.map((s) => <a key={s.url} className="srclink" href={s.url} target="_blank" rel="noreferrer">{s.title} ↗<small>{s.note}</small></a>)}<a className="srclink" href="https://doc.8-codes.com/docs/lecture/16/" target="_blank" rel="noreferrer">정해 만세력 · 격국 ↗</a><a className="srclink" href="https://www.sajuforum.com/01forum/nm/05_youngsin.php" target="_blank" rel="noreferrer">사주포럼 · 용신 ↗</a><a className="srclink" href="https://giunsa.com/blog/four-pillars-guide" target="_blank" rel="noreferrer">기운사 · 네 기둥 ↗</a></details>
    </>
  ) });

  pages.push({ id: 'faq', title: '자주 묻는 질문 — 내 사주로 답하기', terms: ['대운·세운·월운', '용신', '삼재', '역마살', '도화살'], body: (
    <>
      <Callout>궁금한 질문을 누르면 <b>{name}의 사주와 올해·앞으로의 운</b>을 바탕으로 답을 보여 드려요. 시기 질문은 추천 연도마다 <b>좋은 달과 그 이유</b>를 함께 적었어요.</Callout>
      <FaqList items={buildFaq(R, data)} data={data} />
      <p className="faq-note">답변은 위 풀이의 점수·흐름을 질문별로 다시 정리한 것이에요. 점수는 참고 지수이고 건강 문구는 진단이 아닌 생활 관리의 힌트예요.</p>
    </>
  ) });

  return pages.map((p, i) => ({ ...p, num: p.cover ? 0 : i }));
}

function FaqList({ items, data }) {
  const [open, setOpen] = useState(null); // 기본은 모두 접힘, 한 번에 하나만
  const toggle = (id) => setOpen((prev) => (prev === id ? null : id));
  return (
    <div className="faq">
      {items.map((it) => {
        const on = open === it.id;
        const color = (it.cat && CAT_META[it.cat]?.color) || '#c9962e';
        return (
          <div key={it.id} className={`faq-item ${on ? 'open' : ''}`}>
            <button type="button" className="faq-q" aria-expanded={on} onClick={() => toggle(it.id)}><span className="ic">{it.icon}</span><span>{it.q}</span><span className="chev">⌄</span></button>
            {on && (
              <div className="faq-a">
                <Callout>{it.lead}</Callout>
                {it.chips?.length ? <Chips items={it.chips} /> : null}
                {it.paras.map((p, i) => <P key={i} words={['용신', '기신', '희신', '삼재', '충', '원진', '도화', '역마', '지살', '관성', '재성', '인성', '식상', '비겁', '공망', '편관']}>{p}</P>)}
                {it.timeline?.length ? (
                  <div className="faq-years">
                    {it.timeline.map((yc) => (
                      <div key={yc.year} className="fy">
                        <div className="fy-head"><b>{yc.year}년 {yc.text}</b><span className="fy-age">{yc.age}세</span><Score n={yc.score} color={color} />{yc.far && <span className="fy-far">가까운 3년 밖</span>}{yc.note && <span className="fy-note">{yc.note}</span>}</div>
                        <p className="fy-why">{yc.why}</p>
                        {yc.story && <p className="fy-story">{yc.story}</p>}
                        {yc.dyn && (yc.dyn.helps.length || yc.dyn.hurts.length) ? <p className="fy-dyn">{yc.dyn.helps.length ? <span className="good">채워 줘요: {yc.dyn.helps.join(' / ')}</span> : null}{yc.dyn.hurts.length ? <span className="bad">도드라져요: {yc.dyn.hurts.join(' / ')}</span> : null}</p> : null}
                        {yc.months.length ? <ul className="fy-months">{yc.months.map((m) => <li key={m.no}><b>{m.no}월 {m.text}</b> <em>{m.score}/5</em> — {m.why}{m.event && <span className="fy-event">{m.event}</span>}</li>)}</ul> : <p className="fy-why">특별히 두드러진 달은 없어 해 전체 흐름을 보세요.</p>}
                        {yc.avoid.length ? <p className="fy-avoid">피할 달: {yc.avoid.join(', ')}</p> : null}
                        {yc.cautions.length ? <p className="fy-avoid">이 해 주의: {yc.cautions.join(' · ')}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
function require_(data) { return KELBRANCH[data.pillars.day.branch]; }
import { BRANCHES as KELBRANCH } from '../data/knowledge.js';

/* 카테고리 페이지 (내부 상태: 선택 연도) */
function CategoryPage({ R, data, cat, digest }) {
  const c = R.cats[cat], m = CAT_META[cat];
  const [year, setYear] = useState(data.current.nowYear);
  const yy = R.years.find((y) => y.year === year);
  const months = useMemo(() => R.monthsOf(year), [R, year]);
  const ectx = useMemo(() => makeEventCtx(R, data), [R, data]);
  const topMs = useMemo(() => [...months].filter((mm) => year !== data.current.nowYear || mm.monthNo >= data.current.nowMonth).sort((a, b) => b.luck.scores[cat] - a.luck.scores[cat] || a.monthNo - b.monthNo).slice(0, 2).sort((a, b) => a.monthNo - b.monthNo), [months, cat, year, data]);
  const key = cat === '직장' ? ['격국', '관성', '명예', '승진', '독립'] : cat === '금전' ? ['재성', '재물', '식상', '용신'] : cat === '연애' ? ['배우자', '인연', '일지', '합', '충'] : cat === '건강' ? ['체질', '오행', '검진', '수면'] : ['인성', '자격', '시험', '배움'];
  return (
    <>
      <div className="catstats">
        <div><small>{cat}운 종합</small><Score n={c.score} color={m.color} /></div>
        <div><small>가장 좋은 해</small><b style={{ color: '#2f8a4b' }}>{c.best?.year}</b><span>{c.best?.text}</span></div>
        <div><small>조심할 해</small><b style={{ color: '#d6453d' }}>{c.worst?.year}</b><span>{c.worst?.text}</span></div>
      </div>
      <Callout><b>{cat}운 {c.score}/5</b>. {c.headline || first(c.sections[0].paras[0])}</Callout>
      {c.gauge && <Gauge2 pct={c.gauge.value} left={c.gauge.left} right={c.gauge.right} color={m.color} />}
      <Sub>{c.sections[0].title}</Sub>{c.sections[0].paras.slice(0, 2).map((p, i) => <P key={i} words={key}>{p}</P>)}
      {(c.personal || []).map((sec, si) => <Fragment key={si}><Divider /><Sub>{sec.title}</Sub>{sec.paras.map((p, i) => <P key={i} words={GLYPHS}>{p}</P>)}{/사주 전문가들이 자주 짚는/.test(sec.title) && <Digest digest={digest} keys={[data.pillars.day.text, data.dayStem, `${data.dayStem}+Y${data.current.nowYear}`, ...(R.evidence || []).map((e) => e.key)]} cat={cat} n={6} title={`전문가들이 내 사주의 ${cat}을 실제로 이렇게 말해요`} />}</Fragment>)}
      <Divider /><Sub>{c.sections[1].title}</Sub>{c.sections[1].paras.slice(0, 2).map((p, i) => <P key={i} words={key}>{p}</P>)}
      <Divider /><Sub>앞으로 10년 {cat}운</Sub>
      <p className="chart-hint">👆 그래프의 <b>연도를 누르면</b> 그 해 열두 달 {cat}운이 아래에 열려요 · 지금 <b>{year}년</b></p>
      <div className="flow-chart-scroll"><Trend points={c.series} color={m.color} height={160} selected={year} onPick={(p) => setYear(p.key)} /></div>
      {yy && <div className="yearnote"><b>{year}년 {yy.text}</b><Score n={yy.luck.scores[cat]} color={m.color} /><p>{yy.luck.texts[cat]}</p><MonthBars months={months} color={m.color} nowMonth={year === data.current.nowYear ? data.current.nowMonth : null} getValue={(mm) => mm.luck.scores[cat]} /><small>{year}년 열두 달 {cat}운 — 막대가 높을수록 그 달에 유리해요.</small>
        <div className="evlist"><b className="evtitle">사건의 형태로 보면</b>{topMs.map((mm) => <p key={mm.monthNo} className="fy-event block"><b>{mm.monthNo}월 {mm.text}</b> — {eventFor({ g: mm, cat, ctx: ectx, range: monthRange(year, mm.monthNo) })}</p>)}</div></div>}
      <Divider /><Sub>기운이 들어오는 때</Sub>{(c.sections.find((s) => /때/.test(s.title))?.paras || []).slice(0, 3).map((p, i) => <P key={i} words={[R.needEl, `${R.needEl}(${ELEMENT_KO[R.needEl]})`]}>{p}</P>)}
      <Divider /><Sub>지금 흐르는 운</Sub><div className="nowlist">{c.now.map((n, i) => <div className="nowitem" key={i}><div className="nowlabel"><span>{n.label}</span><Score n={n.score} color={m.color} /></div><p>{n.text}</p></div>)}</div>
      <More title="더 자세히 보기 (전체 설명 · 조합 · 전문가 의견)">
        {c.sections.slice(2).map((s, i) => <div key={i}><Sub>{s.title}</Sub>{s.paras.map((p, j) => <P key={j}>{p}</P>)}</div>)}
        {c.evidence?.length > 0 && <><Sub>사주 전문가들이 말하는 이 사주의 {cat}</Sub><Evidence rows={c.evidence} /></>}
      </More>
    </>
  );
}

/* ---------------- 책 뷰어 ---------------- */
export default function Reading({ data, onBack }) {
  const R = useMemo(() => interpret(data), [data]);
  const [digest, setDigest] = useState(null);
  useEffect(() => { let alive = true; loadDigest().then((d) => { if (alive) setDigest(d || {}); }); return () => { alive = false; }; }, []);
  const pages = useMemo(() => buildPages(R, data, digest), [R, data, digest]);
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const [gloss, setGloss] = useState(false);
  const [toc, setToc] = useState(false);
  const top = useRef(null);
  // 책이 열려 있는 동안 스크롤바 폭 고정 + 즉시 스크롤(페이지 전환 시 좌우 흔들림 방지)
  useEffect(() => { document.documentElement.classList.add('book-open'); return () => document.documentElement.classList.remove('book-open'); }, []);
  const go = (i) => { const n = Math.max(0, Math.min(pages.length - 1, i)); if (n === idx) return; setDir(n > idx ? 1 : -1); setIdx(n); window.scrollTo({ top: 0, behavior: 'instant' }); };
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); const t = setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' }), 320); return () => clearTimeout(t); }, [idx]);
  useEffect(() => { const onKey = (e) => { if (e.key === 'ArrowRight') go(idx + 1); if (e.key === 'ArrowLeft') go(idx - 1); if (e.key === 'Escape') { setGloss(false); setToc(false); } }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); });
  const page = pages[idx];
  const terms = page.terms || [];
  const glossSorted = [...GLOSSARY].sort((a, b) => Number(terms.includes(b.t)) - Number(terms.includes(a.t)));

  return (
    <div className="book" ref={top}>
      <header className="book-top"><button className="icon" onClick={onBack} aria-label="만세력으로">☰</button><b>사주풀이</b><button className="icon" onClick={onBack} aria-label="닫기">✕</button></header>
      <AnimatePresence mode="wait" custom={dir}>
        <motion.section key={page.id} className="book-page"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
          <div className={`page-head ${page.cover ? 'cover' : ''}`} style={page.color ? { '--c': page.color } : undefined}>{!page.cover && <span className="pnum">{page.num}</span>}<h2>{page.title}</h2></div>
          <div className="page-body">{page.body}</div>
          <div className="page-foot"><button type="button" disabled={idx === 0} onClick={() => go(idx - 1)}>‹ 이전</button><span>{idx + 1} / {pages.length}</span><button type="button" disabled={idx === pages.length - 1} onClick={() => go(idx + 1)}>다음 ›</button></div>
        </motion.section>
      </AnimatePresence>

      <nav className="book-bar" aria-label="풀이 이동">
        <button type="button" className="gloss" onClick={() => setGloss(true)}>📖 용어해석</button>
        <button type="button" className="tocbtn" onClick={() => setToc(true)} aria-label="목차">⊟</button>
        <button type="button" className="book-prev" disabled={idx === 0} onClick={() => go(idx - 1)} aria-label="이전">‹</button>
        <span className="pagenum">{idx + 1} / {pages.length}</span>
        <button type="button" className="book-next" disabled={idx === pages.length - 1} onClick={() => go(idx + 1)} aria-label="다음">›</button>
      </nav>

      <AnimatePresence>
        {gloss && (
          <motion.div className="sheet-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setGloss(false)}>
            <motion.div className="sheet" initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} onClick={(e) => e.stopPropagation()}>
              <header><b>📖 용어해석</b><button type="button" onClick={() => setGloss(false)}>✕</button></header>
              <p className="sheet-note">이 페이지와 관련된 용어가 먼저 나와요.</p>
              <div className="gloss-list">{glossSorted.map((g) => <div key={g.t} className={`gitem ${terms.includes(g.t) ? 'rel' : ''}`}><span className="gg">{g.g}</span><b>{g.t}</b><p>{g.d}</p></div>)}</div>
            </motion.div>
          </motion.div>
        )}
        {toc && (
          <motion.div className="sheet-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setToc(false)}>
            <motion.div className="sheet" initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} onClick={(e) => e.stopPropagation()}>
              <header><b>목차</b><button type="button" onClick={() => setToc(false)}>✕</button></header>
              <div className="toc-list">{pages.map((p, i) => <button type="button" key={p.id} className={i === idx ? 'on' : ''} onClick={() => { go(i); setToc(false); }}><span>{p.cover ? '표지' : p.num}</span>{p.title}</button>)}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
