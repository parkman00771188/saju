import { useState } from 'react';
import { CITIES } from '../saju/calc.js';

function Seg({ label, value, onChange, options }) {
  return <div className="seg" role="group" aria-label={label}>{options.map(([v, text]) => <button type="button" key={v} aria-pressed={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{text}</button>)}</div>;
}
export default function Landing({ onSubmit, error, initialInput }) {
  const [f, setF] = useState(() => ({ name: '', gender: '남', calendar: 'solar', year: '', month: '', day: '', hour: '', minute: '0', unknownTime: false, city: '서울', koreaTime: true, yajasi: true, jeolgi: 'ipchun', ...initialInput }));
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  const numeric = (key, label, placeholder, min, max) => <label className="birth-field with-unit"><span>{label}</span><input type="number" inputMode="numeric" aria-label={label} placeholder={placeholder} min={min} max={max} required disabled={['hour','minute'].includes(key) && f.unknownTime} value={f[key]} onChange={e => set(key, e.target.value)} /><i className="birth-unit" aria-hidden="true">{ {year:'년',month:'월',day:'일',hour:'시',minute:'분'}[key]}</i></label>;
  const submit = e => {
    e.preventDefault();
    onSubmit({ ...f, year: +f.year, month: +f.month, day: +f.day, hour: f.unknownTime ? 12 : +f.hour, minute: f.unknownTime ? 0 : +f.minute, lon: (CITIES.find(c => c.name === f.city) || CITIES[0]).lon });
  };
  return <div className="entry-shell">
    <header className="entry-brand"><a href="#" aria-label="천기록 홈">天機錄 <span>천기록</span></a><span>나를 이해하는 또 하나의 시선</span></header>
    <div className="entry-layout">
      <section className="entry-story"><div className="entry-orbit" aria-hidden="true"><i/><i/><span>命</span><b>나의 결을 읽다</b></div><p className="eyebrow">YOUR OWN SEASON</p><h1>나에게도,<br/>나의 계절이 있다.</h1><p className="entry-copy">타고난 나의 모습부터 앞으로의 흐름까지.<br/>어려운 사주를, 내 일상의 언어로 만나보세요.</p><span className="entry-index">01 — 태어난 순간에서 시작합니다</span></section>
      <form className="birth-form" onSubmit={submit}>
        <div className="birth-heading"><span className="eyebrow">나의 사주 시작하기</span><h2>언제 태어나셨나요?</h2><p>태어난 날짜와 시간을 알려주세요.</p></div>
        <div className="birth-line"><label className="birth-field"><span>이름 <small>선택</small></span><input aria-label="이름" placeholder="어떻게 불러드릴까요?" maxLength={12} value={f.name} onChange={e => set('name',e.target.value)} /></label><div className="birth-field"><span>성별</span><Seg label="성별" value={f.gender} onChange={v=>set('gender',v)} options={ [['남','남성'],['여','여성']] }/></div></div>
        <div className="birth-label"><span>생년월일</span><Seg label="달력 종류" value={f.calendar} onChange={v=>set('calendar',v)} options={ [['solar','양력'],['lunar','음력'],['leap','음력 윤달']] }/></div>
        <div className="birth-date">{numeric('year','태어난 연도','1995',1900,new Date().getFullYear())}{numeric('month','월','월',1,12)}{numeric('day','일','일',1,31)}</div>
        <div className="birth-label"><span>태어난 시간 <small>24시간 기준</small></span><label className="check"><input type="checkbox" checked={f.unknownTime} onChange={e=>set('unknownTime',e.target.checked)}/><span>시간을 몰라요</span></label></div>
        <div className="birth-time">{numeric('hour','시','14',0,23)}{numeric('minute','분','00',0,59)}</div>
        {f.unknownTime && <p className="field-help">시간을 제외한 여섯 글자로 풀이해요.</p>}
        <details className="birth-options"><summary>출생지·계산 설정 <span>{f.city}</span></summary>
          <label className="birth-field"><span>출생지</span><select aria-label="출생지" value={f.city} onChange={e=>set('city',e.target.value)}>{CITIES.map(c=><option key={c.name}>{c.name}</option>)}</select></label>
          <label className="check"><input type="checkbox" checked={f.koreaTime} onChange={e=>set('koreaTime',e.target.checked)}/><span>출생지에 맞춰 시간 보정</span></label>
          <label className="check"><input type="checkbox" checked={f.yajasi} onChange={e=>set('yajasi',e.target.checked)}/><span>밤 11시 이후도 당일로 계산</span></label>
          <label className="birth-field"><span>해가 바뀌는 기준</span><select value={f.jeolgi} onChange={e=>set('jeolgi',e.target.value)}><option value="ipchun">입춘 (기본)</option><option value="dongji">동지</option></select></label>
        </details>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" className="birth-submit">나의 사주 풀어보기 <span>↗</span></button>
        <p className="entry-privacy">입력한 정보는 이 브라우저 안에서만 계산해요.</p>
      </form>
    </div>
    <footer className="entry-footer"><span>天機錄 · 나의 계절을 읽는 시간</span><span>정해진 답보다, 나를 이해하는 힌트.</span></footer>
  </div>;
}
