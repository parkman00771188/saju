import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import PillarBoard from './PillarBoard.jsx';
import Ohaeng from './Ohaeng.jsx';
import Fortune from './Fortune.jsx';
import Relations from './Relations.jsx';
import Reading from './Reading.jsx';
import Passage from './Passage.jsx';
import { ELEMENT_KO } from '../saju/tables.js';

export default function Result({ data, onReset, onHome }) {
  const [view, setView] = useState('chart');
  const [opening, setOpening] = useState(false);
  const lastScroll = useRef(0);
  const chartTitle = useRef(null);
  useEffect(() => { chartTitle.current?.focus({preventScroll:true}); }, []);
  useEffect(() => {
    if (!opening) return;
    const prior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prior; };
  }, [opening]);
  const openReading = () => { lastScroll.current = window.scrollY; setOpening(true); };
  const backToChart = () => { setView('chart'); requestAnimationFrame(() => { window.scrollTo({top:lastScroll.current}); chartTitle.current?.focus({preventScroll:true}); }); };
  const rel = data.relations;
  const connections = [...rel.stemHap,...rel.yukhap,...rel.samhap.filter(r=>r.full),...rel.banghap.filter(r=>r.full)];
  const changes = [...rel.stemChung,...rel.chung];
  const relLabel = rows => rows.length ? rows.map(r => r.chars.map(c=>c.ch).join('')+ ' ' + r.label).join(' · ') : '해당 없음';
  return <>
    <div className="manse-page" hidden={view !== 'chart'}>
      <header className="report-top"><button type="button" className="report-brand brand-home" onClick={onHome || onReset} aria-label="처음 화면으로" title="처음 화면으로">天機錄 <small>천기록</small></button><button className="text-button" onClick={onReset}>← 생년월일 수정</button></header>
      <div className="manse-heading"><div><p className="kicker">나의 사주 기록</p><h1 ref={chartTitle} tabIndex={-1}>{data.meta.name ? `${data.meta.name} 님의` : '나의'} 만세력</h1><p>양력 {data.meta.solar} · {data.meta.time} · {data.meta.gender === '남' ? '남성' : '여성'}<br/><span>음력 {data.meta.lunarText} · {data.meta.zodiac}띠</span></p></div><div className="personal-seal"><span>{data.dayStem}</span><small>{ELEMENT_KO[data.pillars.day.stemEl]}의 기운</small></div></div>
      <nav className="section-links" aria-label="만세력 빠른 이동"><a href="#natal">사주팔자</a><a href="#fortune">대운·세운·월운</a><a href="#elements">오행</a><a href="#relations">합충·신살</a><button onClick={openReading}>사주 해석 보기 ↗</button></nav>
      <section id="natal" className="manse-section"><div className="section-heading"><div><span>01</span><h2>사주팔자</h2></div><p>태어난 순간을 담은 {data.pillars.time?'여덟':'여섯'} 글자</p></div>
        <div className="paper natal-paper"><PillarBoard data={data}/><div className="current-pillars"><div><span>현재 대운</span><b>{data.current.daeun?.text || '시작 전 / 범위 밖'}</b><small>{data.current.daeun ? `${data.current.daeun.startYear}~${data.current.daeun.endYear}` : '아래 대운표에서 확인'}</small></div><div><span>올해 세운</span><b>{data.current.year.text}</b><small>{data.current.nowYear}년</small></div><div><span>이번 달</span><b>{data.current.month.text}</b><small>{data.current.nowMonth}월</small></div></div><p className="calculation-note">{data.meta.options.join(' · ')}{data.meta.correctedTime ? ` · 보정 시각 ${data.meta.correctedTime}` : ''}{!data.pillars.time?' · 시간 미입력: 시주를 제외했어요.':''}</p></div>
        <div className="reading-invitation"><div><span className="invitation-mark" aria-hidden="true">解</span><div><h3>이 글자들이 나에게 어떤 뜻일까요?</h3><p>타고난 성향부터 올해와 월별 흐름까지, 쉽게 풀어드려요.</p></div></div><button className="gold-button" onClick={openReading}>사주 해석 보기 <span>↗</span></button></div>
      </section>
      <section id="fortune" className="manse-section"><div className="section-heading"><div><span>02</span><h2>시간에 따라 바뀌는 운</h2></div><p>대운·연도를 누르면 아래 표가 함께 바뀌어요</p></div><div className="paper fortune-paper"><Fortune data={data}/></div></section>
      <section id="elements" className="manse-section"><div className="section-heading"><div><span>03</span><h2>다섯 기운의 균형</h2></div><p>목 · 화 · 토 · 금 · 수</p></div><div className="paper"><Ohaeng data={data}/></div></section>
      <section id="relations" className="manse-section"><div className="section-heading"><div><span>04</span><h2>글자의 관계와 신살</h2></div><p>이어지는 기운과 부딪히는 기운</p></div><div className="relation-summary"><p><b>합 · 연결</b>{relLabel(connections)}</p><p><b>충 · 변화</b>{relLabel(changes)}</p></div><div className="paper"><Relations data={data}/></div></section>
      <div className="closing-invitation"><p>만세력의 글자들을 일상의 언어로.</p><button className="gold-button" onClick={openReading}>나의 사주 해석 보기 ↗</button></div>
      <footer className="report-footer"><button type="button" className="brand-home" onClick={onHome || onReset} aria-label="처음 화면으로">天機錄</button><p>나를 이해하는 힌트, 천기록</p></footer>
    </div>
    {view === 'reading' && <Reading data={data} onBack={backToChart}/>}
    <AnimatePresence>{opening && <Passage key="reading-passage" kind="reading" data={data} onDone={() => { setOpening(false); setView('reading'); window.scrollTo({top:0, behavior:'instant'}); }}/>}</AnimatePresence>
  </>;
}
