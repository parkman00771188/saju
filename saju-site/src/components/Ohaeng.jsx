import { motion } from 'framer-motion';
import { ELEMENTS, ELEMENT_COLOR, ELEMENT_KO } from '../saju/tables.js';

// 木(좌상) → 火(상) → 土(우상) → 金(우하) → 水(좌하) : 시계방향 상생
const ORDER = ['木', '火', '土', '金', '水'];
const ANGLE = { 木: 198, 火: -90, 土: -18, 金: 54, 水: 126 };
const S = 340, C = S / 2, R = 118;
const pt = (el, r = R) => {
  const a = (ANGLE[el] * Math.PI) / 180;
  return [C + Math.cos(a) * r, C + Math.sin(a) * r];
};

export default function Ohaeng({ data }) {
  const { elements, missing, strongest, pillars, order } = data;
  const total = Object.values(elements).reduce((a, b) => a + b, 0);
  const chars = order.filter((k) => pillars[k]).flatMap((k) => [
    { ch: pillars[k].stem, el: pillars[k].stemEl }, { ch: pillars[k].branch, el: pillars[k].branchEl },
  ]);

  return (
    <div className="ohaeng">
      <svg viewBox={`0 0 ${S} ${S}`} className="pent">
        <defs>
          <filter id="glow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {/* 상극 (별) */}
        {ORDER.map((el, i) => {
          const [x1, y1] = pt(el), [x2, y2] = pt(ORDER[(i + 2) % 5]);
          return <motion.line key={'k' + el} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(230,120,120,.25)" strokeWidth="1" strokeDasharray="4 5"
            initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 1.2, delay: 0.6 + i * 0.1 }} />;
        })}
        {/* 상생 (오각) */}
        {ORDER.map((el, i) => {
          const [x1, y1] = pt(el), [x2, y2] = pt(ORDER[(i + 1) % 5]);
          return <motion.line key={'g' + el} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(217,180,106,.55)" strokeWidth="1.5"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: 0.2 + i * 0.12 }} />;
        })}
        {/* 태극 중심 */}
        <circle cx={C} cy={C} r="26" fill="url(#tg)" opacity=".9" />
        <defs>
          <linearGradient id="tg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#e9a0a0" /><stop offset="1" stopColor="#7d86d8" />
          </linearGradient>
        </defs>
        <circle cx={C} cy={C} r="26" fill="none" stroke="rgba(255,255,255,.35)" />
        {ORDER.map((el, i) => {
          const [x, y] = pt(el);
          const n = elements[el];
          const r = 20 + Math.min(n, 5) * 6;
          const c = ELEMENT_COLOR[el];
          return (
            <motion.g key={el} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 160, damping: 14, delay: 0.3 + i * 0.12 }} style={{ transformOrigin: `${x}px ${y}px` }}>
              <circle cx={x} cy={y} r={r + 8} fill={c.glow} opacity={n ? 0.35 : 0.08} filter="url(#glow)" />
              <circle cx={x} cy={y} r={r} fill={n ? c.bg : 'rgba(255,255,255,.06)'} stroke={n ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.18)'} strokeDasharray={n ? '0' : '3 3'} />
              <text x={x} y={y - 2} textAnchor="middle" className="pel" fill={n ? c.fg : 'rgba(255,255,255,.4)'}>{el}</text>
              <text x={x} y={y + 16} textAnchor="middle" className="pcnt" fill={n ? c.fg : 'rgba(255,255,255,.4)'}>{n}</text>
            </motion.g>
          );
        })}
      </svg>

      <div className="ostats">
        <div className="bars">
          {ELEMENTS.map((el, i) => (
            <div className="bar" key={el}>
              <span className="lab" style={{ color: ELEMENT_COLOR[el].bg }}>{el} {ELEMENT_KO[el]}</span>
              <div className="track">
                <motion.i style={{ background: ELEMENT_COLOR[el].bg }} initial={{ width: 0 }} animate={{ width: `${(elements[el] / total) * 100}%` }} transition={{ duration: 1, delay: 0.4 + i * 0.1 }} />
              </div>
              <b>{elements[el]}</b>
            </div>
          ))}
        </div>
        <div className="chars">
          {chars.map((c, i) => (
            <motion.span key={i} className="mini" style={{ background: ELEMENT_COLOR[c.el].bg, color: ELEMENT_COLOR[c.el].fg }}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 + i * 0.05 }}>{c.ch}</motion.span>
          ))}
        </div>
        <p className="onote">
          가장 강한 기운은 <b style={{ color: ELEMENT_COLOR[strongest].bg }}>{strongest}({ELEMENT_KO[strongest]})</b>
          {missing.length
            ? <> · 사주에 없는 오행은 <b>{missing.map((m) => `${m}(${ELEMENT_KO[m]})`).join(', ')}</b> 입니다. 비어 있는 오행은 운에서 채워질 때 크게 움직입니다.</>
            : <> · 다섯 오행이 모두 갖추어진 사주입니다.</>}
        </p>
      </div>
    </div>
  );
}
