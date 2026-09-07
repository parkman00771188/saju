import { useEffect, useMemo, useRef, useState } from 'react';
import { contextualReading, flowValue, yearFlow, READING_SOURCES } from '../saju/context.js';
import { Radar, Trend } from './Charts.jsx';

const TOPICS = [ ['직장','일과 커리어','職'], ['금전','재물과 생활','財'], ['연애','연애와 관계','緣'], ['학업','공부와 성장','學'], ['생활','일상의 리듬','休'] ];
const AXES = ['목','화','토','금','수'];
const META = {목:{color:'#457459'},화:{color:'#b3473c'},토:{color:'#987021'},금:{color:'#6c647b'},수:{color:'#416b9a'}};
function Connection({r}) {
  return <div className={`reading-connection ${r.kind.includes('충')?'is-change':''}`}><div><span>{r.kind}</span><b>{r.members.map(m=>`${m.ch}(${m.label})`).join(' + ')}</b></div><p>{r.effect}</p>{r.caveat && <small>{r.caveat}</small>}</div>;
}
function PeriodReading({context, title, subtitle}) {
  const important = [...context.rels].sort((a,b)=>Number(b.members.some(m=>m.pos==='month'))-Number(a.members.some(m=>m.pos==='month')));
  return <article className="period-reading"><header><span className="kicker">{subtitle}</span><h3>{title}</h3></header><p className="period-lead">{context.balance}</p><div className="reading-reasons"><div><span className="reason-label">내 생활과의 연결</span><p>{context.role}</p>{context.reinforcement && <p className="reinforcement">{context.reinforcement}</p>}</div>{important[0] && <div><span className="reason-label">함께 살펴볼 글자</span><Connection r={important[0]}/></div>}<div className="action-box"><span className="reason-label">이렇게 활용해 보세요</span><h4>{context.actionTitle}</h4><p>{context.action}</p></div></div><details className="reading-detail"><summary>합·충과 10년 흐름을 더 자세히</summary><p>{context.background}</p>{important.slice(1).map(r=><Connection key={r.key} r={r}/>)}{!important.length&&<p>이 시기 글자가 만드는 뚜렷한 합·충은 확인되지 않았어요.</p>}</details></article>;
}
export default function Reading({data,onBack}) {
  const heading = useRef(null);
  const [cat,setCat] = useState('직장');
  const [year,setYear] = useState(data.current.nowYear);
  const [month,setMonth] = useState(data.current.nowMonth);
  const R = useMemo(()=>contextualReading(data,year,cat),[data,year,cat]);
  const flow = useMemo(()=>yearFlow(data,cat),[data,cat]);
  const selected = R.months.find(m=>m.month===month);
  const elements = Object.fromEntries(Object.values(data.elements).map((n,i)=>[AXES[i],n]));
  const pickYear = y => { setYear(y); setMonth(y===data.current.nowYear ? data.current.nowMonth : 1); };
  useEffect(()=>{heading.current?.focus({preventScroll:true});},[]);
  const hint = R.climate.need==='火'?'온기를 더하는 불':R.climate.need==='水'?'열기를 식히는 물':'한쪽으로 치우치지 않는 균형';
  return <div className="analysis-page">
    <header className="report-top"><span className="report-brand">天機錄 <small>사주 해석</small></span><button className="text-button" onClick={onBack}>← 만세력으로 돌아가기</button></header>
    <div className="analysis-heading"><p className="kicker">여덟 글자, 하나의 이야기</p><h1 tabIndex={-1} ref={heading}>{data.meta.name ? `${data.meta.name} 님을` : '나를'} 읽는 시간</h1><p>내가 가진 기운과 다가오는 흐름을 함께 살펴보세요.</p></div>
    <nav className="section-links" aria-label="해석 빠른 이동"><a href="#reading-overview">나의 바탕</a><a href="#reading-flow">10년 흐름</a><a href="#reading-months">월별 흐름</a><a href="#reading-character">성향과 조합</a><button onClick={onBack}>만세력 보기 ↗</button></nav>
    {!data.pillars.time&&<p className="gentle-note">시간을 제외한 여섯 글자로 풀었어요. 태어난 시간에 따라 세부 해석은 달라질 수 있어요.</p>}
    <section id="reading-overview" className="reading-overview paper"><div className="overview-copy"><p className="kicker">내 사주의 핵심</p><h2>{R.character[0]}</h2><p>{R.climate.text}</p><div className="summary-facts"><div><span>태어난 계절</span><strong>{R.climate.season}</strong></div><div><span>균형의 힌트</span><strong>{hint}</strong></div></div></div><div className="overview-radar"><Radar values={elements} axes={AXES} meta={META} max={Math.max(4,...Object.values(elements))} unit="개" size={240}/><p>타고난 오행 분포</p><small>겉에 드러난 {data.pillars.time?'여덟':'여섯'} 글자 기준</small></div></section>
    <section id="reading-flow" className="reading-flow-section"><div className="section-heading"><div><span>01</span><h2>앞으로의 흐름</h2></div><p>궁금한 주제와 연도를 선택하세요</p></div>
      <div className="topic-picker" role="group" aria-label="해석 주제">{TOPICS.map(([key,label,glyph])=><button key={key} aria-pressed={cat===key} className={cat===key?'on':''} onClick={()=>setCat(key)}><span aria-hidden="true">{glyph}</span>{label}</button>)}</div>
      <div className="paper graph-paper"><div className="graph-title"><div><h3>10년의 {TOPICS.find(t=>t[0]===cat)[1]} 흐름</h3><p>그래프의 연도를 누르면 아래 풀이가 바뀌어요.</p></div><label className="year-control"><span className="sr-only">해석 연도</span><select value={year} onChange={e=>pickYear(+e.target.value)}>{flow.map(y=><option key={y.year} value={y.year}>{y.year}년</option>)}</select></label></div><div className="graph-legend"><span><i/>활용할 기회</span><span>낮은 구간은 준비·조정을 살펴볼 때</span></div><div className="flow-chart-scroll"><Trend points={flow} color="#b58b42" height={195} selected={year} onPick={p=>pickYear(p.year)}/></div><p className="graph-note">기운의 보완과 합·충을 비교한 참고 흐름이며, 성공 확률을 뜻하지 않아요.</p></div>
      <PeriodReading context={R.annual} title={R.annual.title} subtitle={`${year}년 · ${R.annual.annual.text}년의 ${cat==='생활'?'생활 흐름':cat+'운'}`}/>
    </section>
    <section id="reading-months" className="reading-flow-section"><div className="section-heading"><div><span>02</span><h2>{year}년, 눈여겨볼 달</h2></div><p>막대를 누르면 해당 월의 풀이를 볼 수 있어요</p></div>
      <div className="paper graph-paper"><div className="month-recommendations">{R.picks.length?R.picks.map(m=><button key={m.month} className={month===m.month?'picked':''} onClick={()=>setMonth(m.month)}><span>{String(m.month).padStart(2,'0')}<small>월</small></span><div><b>{m.actionTitle}</b><p>{m.mixed?'기회와 변화가 함께 오는 때':m.bringsNeed?'내 기운에 균형을 보태는 때':'관심 주제가 드러나는 때'}</p></div><i>↗</i></button>):<p className="gentle-note">뚜렷하게 앞서는 달은 없어요. 일정에 맞는 달을 눌러 준비할 점을 살펴보세요.</p>}</div><div className="flow-month-bars" role="group" aria-label="월별 흐름 그래프">{R.months.map(m=><button key={m.month} aria-label={`${m.month}월 풀이`} aria-pressed={month===m.month} className={month===m.month?'on':''} onClick={()=>setMonth(m.month)}><span className="bar-track"><i style={{height:`${flowValue(m.priority)*20}%`}}/>{R.picks.some(p=>p.month===m.month)&&<em>•</em>}</span><span>{m.month}<small>월</small></span></button>)}</div><p className="graph-note">{year===data.current.nowYear?'추천 달은 이달부터 비교했어요. ':''}사주의 한 달은 달력의 1일이 아닌 절기에 시작해요.</p></div>
      <div className="selected-month" aria-live="polite"><div className="month-date-line"><b>{year}년 {month}월 <span>{selected.text}</span></b><span>{selected.term} · {selected.start.slice(5,10).replace('-','.')} ~ {selected.end.slice(5,10).replace('-','.')}</span></div><PeriodReading context={selected} title={selected.title} subtitle={`${cat==='생활'?'생활 흐름':cat+'운'} · 이달의 변화`}/><details className="reading-detail exact-dates"><summary>이달의 정확한 절기 시각</summary><p>한국 표준시 {selected.start}부터 {selected.end} 직전까지예요.</p></details></div>
    </section>
    <section id="reading-character" className="reading-flow-section"><div className="section-heading"><div><span>03</span><h2>성향은 글자들이 만나며 달라져요</h2></div></div><div className="paper character-paper"><div className="character-intro"><span className="character-glyph">{data.dayStem}</span><div><h3>{R.character[0]}</h3><p>{R.character[1]}을 상징해요. 주변 글자와 연결될 때는 아래와 같은 면을 함께 살펴요.</p></div></div>{R.natal.slice(0,2).map(r=><Connection key={r.key} r={r}/>)}{R.natal.length>2&&<details className="reading-detail"><summary>다른 글자의 관계 {R.natal.length-2}개 더 보기</summary>{R.natal.slice(2).map(r=><Connection key={r.key} r={r}/>)}</details>}{!R.natal.length&&<p>뚜렷한 합·충·삼합·방합은 없어, 계절과 전체 기운의 분포를 중심으로 읽어요.</p>}</div></section>
    <details className="reading-detail source-detail"><summary>참고 자료와 풀이 방식</summary><p>수집한 강의 자막과 공개 해설을 검토한 규칙 기반 풀이예요. 계절, 글자의 자리, 합·충, 대운과 연·월을 함께 확인해요. 그래프는 기운의 보완·변화·주제 연결을 비교한 참고 지수이며 실제 사건을 보장하지 않아요.</p>{READING_SOURCES.map(s=><a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.title} ↗<small>{s.note}</small></a>)}<p>합화와 모든 학파의 격국·용신 조건을 완전히 재현한 것은 아니에요.</p></details>
    <footer className="report-footer"><button className="gold-button" onClick={onBack}>만세력으로 돌아가기</button><p>나를 이해하는 힌트로 읽고, 선택은 나의 현실에 맞게.</p></footer>
  </div>;
}
