import { motion } from 'framer-motion';
import { ELEMENTS, ELEMENT_KO } from '../saju/tables.js';

// 12시 방향부터 시계 방향으로 木 → 火 → 土 → 金 → 水
const ORDER = ['木', '火', '土', '金', '水'];
const HEX = { 木: '#5a9a3c', 火: '#c2452f', 土: '#c9962e', 金: '#8a8f96', 水: '#3a4152' };
const SOFT = { 木: '#e8f3df', 火: '#fbe6e2', 土: '#f7ecd2', 金: '#ecedef', 水: '#e2e6ee' };
const DESC = { 木: '성장과 확장의\n생명력', 火: '열정과 표현의\n에너지', 土: '중심을 잡는\n안정의 기운', 金: '정리와 결실의\n단단함', 水: '지혜와 흐름의\n유연함' };
const MEAN = { 木: '목의 기운이 강해 시작하고 키우는 힘이 크며', 火: '화의 기운이 강해 표현하고 밝히는 힘이 크며', 土: '토의 기운이 강해 중심을 잡고 버티는 힘이 크며', 金: '금의 기운이 강해 정리하고 완성하는 힘이 크며', 水: '수의 기운이 강해 살피고 흐르는 지혜가 크며' };

const S = 540, C = S / 2, R = 138;
const pos = (i, r = R) => { const a = (-90 + i * 72) * Math.PI / 180; return [C + Math.cos(a) * r, C + Math.sin(a) * r]; };

export default function Ohaeng({ data }) {
  const { elements, missing, strongest } = data;
  const total = Object.values(elements).reduce((a, b) => a + b, 0) || 1;
  const maxCount = Math.max(...Object.values(elements), 1);

  return (
    <div className="orbit-wrap">
      <svg viewBox={`0 0 ${S} ${S}`} className="orbit" role="img" aria-label={ORDER.map((e) => `${ELEMENT_KO[e]} ${elements[e]}개`).join(', ')}>
        <defs>
          <radialGradient id="tg2" cx="50%" cy="50%" r="60%"><stop offset="0" stopColor="#f6c7c0" /><stop offset="0.55" stopColor="#c9b7e6" /><stop offset="1" stopColor="#9aa4d9" /></radialGradient>
          <filter id="soft"><feGaussianBlur stdDeviation="6" /></filter>
        </defs>
        {/* 궤도 */}
        <circle cx={C} cy={C} r={R} fill="none" stroke="#d9cfc1" strokeWidth="1" strokeDasharray="3 6" />
        <circle cx={C} cy={C} r={R - 22} fill="none" stroke="#efe8dc" strokeWidth="1" />
        {/* 궤도 위 작은 점 (사이) */}
        {ORDER.map((_, i) => { const [x, y] = pos(i + 0.5); return <circle key={i} cx={x} cy={y} r="3" fill="#cdbfa6" />; })}
        {/* 중앙 태극 */}
        <circle cx={C} cy={C} r="52" fill="#f3e9d8" opacity="0.7" filter="url(#soft)" />
        <circle cx={C} cy={C} r="40" fill="url(#tg2)" />
        <path d={`M ${C} ${C - 40} A 20 20 0 0 1 ${C} ${C} A 20 20 0 0 0 ${C} ${C + 40} A 40 40 0 0 1 ${C} ${C - 40}`} fill="rgba(255,255,255,.5)" />
        {/* 다섯 기운 */}
        {ORDER.map((el, i) => {
          const [x, y] = pos(i);
          const n = elements[el];
          const r = n ? 24 + (n / maxCount) * 16 : 20;
          const on = n > 0;
          const [tx, ty] = pos(i, R + 78);
          const anchor = tx < C - 40 ? 'end' : tx > C + 40 ? 'start' : 'middle';
          return (
            <motion.g key={el} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 + i * 0.12, type: 'spring', stiffness: 160, damping: 16 }} style={{ transformOrigin: `${x}px ${y}px` }}>
              {on && <circle cx={x} cy={y} r={r + 12} fill={SOFT[el]} opacity="0.9" />}
              <circle cx={x} cy={y} r={r} fill={on ? HEX[el] : '#f4f1ec'} stroke={on ? 'rgba(255,255,255,.7)' : '#d9d2c6'} strokeWidth="2" />
              <text x={x} y={y + (r > 30 ? 12 : 9)} textAnchor="middle" fontFamily="var(--serif)" fontWeight="700" fontSize={r > 30 ? 30 : 24} fill={on ? '#fff' : '#9b958d'}>{el}</text>
              <text x={x} y={y + r + 20} textAnchor="middle" fontSize="15" fontWeight="600" fill={on ? '#4a4038' : '#a39c93'}>{n}</text>
              {DESC[el].split('\n').map((line, k) => <text key={k} x={tx} y={ty - 6 + k * 16} textAnchor={anchor} fontSize="12" fill="#8c8078">{line}</text>)}
            </motion.g>
          );
        })}
      </svg>

      <div className="orbit-bars">
        {ORDER.map((el, i) => (
          <div className="orb" key={el}>
            <span className="orb-ko" style={{ color: HEX[el] }}>{ELEMENT_KO[el]}</span>
            <span className="orb-lab" style={{ color: HEX[el] }}>{ELEMENT_KO[el]}({el})</span>
            <div className="orb-track"><motion.i style={{ background: HEX[el] }} initial={{ width: 0 }} animate={{ width: `${(elements[el] / total) * 100}%` }} transition={{ duration: 0.9, delay: 0.3 + i * 0.08 }} /></div>
            <b>{elements[el]}</b>
          </div>
        ))}
      </div>

      <div className="orbit-note">
        <p className="lead">가장 강한 기운은 <b style={{ color: HEX[strongest] }}>{ELEMENT_KO[strongest]}({strongest})</b>이며,{' '}
          {missing.length ? <>없는 오행은 <b style={{ color: HEX[missing[0]] }}>{missing.map((m) => `${ELEMENT_KO[m]}(${m})`).join(', ')}</b> 입니다.</> : <>다섯 기운이 모두 갖추어져 있습니다.</>}</p>
        <p className="sub">{MEAN[strongest]}{missing.length ? `, ${missing.map((m) => ELEMENT_KO[m]).join('·')}의 기운이 부족하여 운에서 채워질 때 크게 움직입니다.` : ' 한쪽으로 크게 치우치지 않아 운의 기운을 고르게 소화합니다.'}</p>
      </div>
    </div>
  );
}
