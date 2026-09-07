import { useState } from 'react';
import { motion } from 'framer-motion';
import { CITIES } from '../saju/calc.js';

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] },
});

function Seg({ value, onChange, options }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button type="button" key={o.value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

function Num({ value, onChange, min, max, unit, disabled, label }) {
  return (
    <label className={`num ${disabled ? 'off' : ''}`}>
      <input
        inputMode="numeric" value={value} disabled={disabled} aria-label={label}
        onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
        onBlur={() => { if (value === '') return; const n = Math.min(max, Math.max(min, Number(value))); onChange(String(n)); }}
      />
      <span>{unit}</span>
    </label>
  );
}

export default function Landing({ onSubmit, error, busy }) {
  const [f, setF] = useState({
    name: '', gender: '남', calendar: 'solar',
    year: '', month: '', day: '', hour: '', minute: '',
    unknownTime: false, city: '서울', koreaTime: true, yajasi: true, jeolgi: 'ipchun',
  });
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const valid = f.year.length === 4 && f.month && f.day && (f.unknownTime || (f.hour !== '' && f.minute !== ''));

  const submit = (e) => {
    e.preventDefault();
    if (!valid || busy) return;
    const city = CITIES.find((c) => c.name === f.city) || CITIES[0];
    onSubmit({
      name: f.name.trim(), gender: f.gender, calendar: f.calendar,
      year: +f.year, month: +f.month, day: +f.day,
      hour: f.unknownTime ? 12 : +f.hour, minute: f.unknownTime ? 0 : +f.minute,
      unknownTime: f.unknownTime, koreaTime: f.koreaTime, lon: city.lon, yajasi: f.yajasi, jeolgi: f.jeolgi,
    });
  };

  return (
    <div className="landing-inner">
      <motion.header className="hero" {...fade(0.1)}>
        <p className="eyebrow">天機錄 · 별이 새긴 나의 사주</p>
        <h1><span className="hanja">命</span>태어난 순간의 하늘을<br />다시 그립니다</h1>
        <p className="sub">생년월일시를 입력하면 그 시각 하늘의 천간과 지지가 여덟 글자로 내려앉습니다.<br className="pc" />만세력 · 대운 · 세운 · 월운 · 오행 · 신살을 한 장의 성반에 담았습니다.</p>
      </motion.header>

      <motion.div className="features" {...fade(0.25)}>
        {[['命', '사주팔자', '천간·지지 여덟 글자'], ['運', '대운·세운·월운', '10년·1년·1달의 흐름'], ['五', '오행도', '다섯 기운의 균형'], ['解', '사주 해석', '강의 1,700편 종합']].map(([h, t, d]) => (
          <div className="feat" key={t}><span className="hanja">{h}</span><b>{t}</b><small>{d}</small></div>
        ))}
      </motion.div>

      <motion.form className="card form" onSubmit={submit} {...fade(0.35)}>
        <div className="fhead"><h3>생년월일시 입력</h3><p>태어난 날과 시각, 출생지를 넣어 주세요. 시간을 모르면 시주 없이 봅니다.</p></div>
        <svg className="fdeco" viewBox="0 0 400 400" aria-hidden="true">
          <circle cx="200" cy="200" r="190" fill="none" stroke="currentColor" strokeWidth="0.8" />
          <circle cx="200" cy="200" r="150" fill="none" stroke="currentColor" strokeWidth="0.6" strokeDasharray="2 6" />
          {'子丑寅卯辰巳午未申酉戌亥'.split('').map((ch, i) => { const a = (i / 12) * Math.PI * 2 - Math.PI / 2; return <text key={ch} x={200 + Math.cos(a) * 172} y={200 + Math.sin(a) * 172 + 7} textAnchor="middle" fontSize="20" fill="currentColor">{ch}</text>; })}
        </svg>
        <div className="frow segs">
          <Seg value={f.gender} onChange={set('gender')} options={[{ value: '남', label: '♂ 남자' }, { value: '여', label: '♀ 여자' }]} />
          <Seg value={f.calendar} onChange={set('calendar')} options={[{ value: 'solar', label: '양력' }, { value: 'lunar', label: '음력' }, { value: 'leap', label: '윤달' }]} />
        </div>
        <div className="frow">
          <input className="text" placeholder="이름 (선택)" value={f.name} onChange={(e) => set('name')(e.target.value)} maxLength={12} />
        </div>
        <div className="frow date3">
          <Num value={f.year} onChange={set('year')} min={1900} max={2100} unit="년" label="년" />
          <Num value={f.month} onChange={set('month')} min={1} max={12} unit="월" label="월" />
          <Num value={f.day} onChange={set('day')} min={1} max={31} unit="일" label="일" />
        </div>
        <div className="frow time">
          <Num value={f.hour} onChange={set('hour')} min={0} max={23} unit="시" label="시" disabled={f.unknownTime} />
          <Num value={f.minute} onChange={set('minute')} min={0} max={59} unit="분" label="분" disabled={f.unknownTime} />
          <label className="check">
            <input type="checkbox" checked={f.unknownTime} onChange={(e) => set('unknownTime')(e.target.checked)} />
            <span>시간 모름</span>
          </label>
        </div>
        <div className="frow">
          <label className="select full">
            <span>출생지</span>
            <select value={f.city} onChange={(e) => set('city')(e.target.value)}>
              {CITIES.map((c) => <option key={c.name} value={c.name}>{c.name} (동경 {c.lon}°)</option>)}
            </select>
          </label>
        </div>
        <div className="frow opts">
          <label className="check" title="한국 표준시(동경 135°)와 출생지 경도 차이를 보정해 진태양시로 계산합니다.">
            <input type="checkbox" checked={f.koreaTime} onChange={(e) => set('koreaTime')(e.target.checked)} /><span>한국시 적용</span>
          </label>
          <label className="check" title="밤 11시 이후 출생 시 일주는 당일, 시주는 다음날 子시로 계산합니다.">
            <input type="checkbox" checked={f.yajasi} onChange={(e) => set('yajasi')(e.target.checked)} /><span>야자시 / 조자시</span>
          </label>
          <div className="radio">
            <span>절기</span>
            <button type="button" className={f.jeolgi === 'ipchun' ? 'on' : ''} onClick={() => set('jeolgi')('ipchun')}>입춘</button>
            <button type="button" className={f.jeolgi === 'dongji' ? 'on' : ''} onClick={() => set('jeolgi')('dongji')}>동지</button>
          </div>
        </div>

        {error && <p className="error">{error}</p>}

        <div className="frow actions">
          <button type="submit" className={`primary ${valid && !busy ? '' : 'disabled'}`} disabled={!valid || busy}>
            {busy ? '하늘을 여는 중…' : '천기 열어보기'}<i />
          </button>
        </div>
      </motion.form>

    </div>
  );
}
