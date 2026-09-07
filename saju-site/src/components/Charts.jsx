import { motion } from 'framer-motion';
import { CATS, CAT_META } from '../data/knowledge.js';

/** 5항목 레이더 */
export function Radar({ values, size = 220, axes = CATS, meta = CAT_META, max = 5, unit = '' }) {
  const C = size / 2, R = size / 2 - 28;
  const pt = (i, r) => { const a = (-90 + i * 72) * Math.PI / 180; return [C + Math.cos(a) * r, C + Math.sin(a) * r]; };
  const poly = axes.map((c, i) => pt(i, (values[c] / max) * R).join(',')).join(' ');
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="radar" style={{ width: size, height: size }} role="img" aria-label={axes.map(c=>`${c} ${values[c]}${unit}`).join(', ')}>
      {[1, 2, 3, 4, 5].map((lv) => (
        <polygon key={lv} points={axes.map((_, i) => pt(i, (lv / 5) * R).join(',')).join(' ')} fill={lv === 5 ? '#fff' : 'none'} stroke="#e7e3da" strokeWidth="1" />
      ))}
      {axes.map((c, i) => { const [x, y] = pt(i, R); return <line key={c} x1={C} y1={C} x2={x} y2={y} stroke="#eee9df" />; })}
      <motion.polygon points={poly} fill="rgba(201,150,46,.25)" stroke="#c9962e" strokeWidth="2" strokeLinejoin="round"
        initial={{ opacity: 0, scale: 0.3 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} style={{ transformOrigin: `${C}px ${C}px` }} />
      {axes.map((c, i) => {
        const [x, y] = pt(i, (values[c] / max) * R);
        const [lx, ly] = pt(i, R + 16);
        return (
          <g key={c}>
            <motion.circle cx={x} cy={y} r="4" fill={meta[c].color} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6 + i * 0.08 }} style={{ transformOrigin: `${x}px ${y}px` }} />
            <text x={lx} y={ly + 4} textAnchor="middle" fontSize="12" fontWeight="600" fill={meta[c].color}>{c}</text>
            <text x={lx} y={ly + 17} textAnchor="middle" fontSize="11" fill="#68625b">{values[c]}{unit}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** 10년 추세 라인 차트 */
export function Trend({ points, color = '#c9962e', height = 150, onPick, selected }) {
  const W = 560, H = height, padL = 22, padR = 14, padT = 16, padB = 28;
  const n = points.length;
  const x = (i) => padL + (i / Math.max(n - 1, 1)) * (W - padL - padR);
  const y = (v) => padT + (1 - (v - 1) / 4) * (H - padT - padB);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join(' ');
  const area = `${d} L${x(n - 1)},${H - padB} L${x(0)},${H - padB} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="trend" aria-label="연도별 활용 흐름 그래프">
      {[1, 2, 3, 4, 5].map((lv) => <line key={lv} x1={padL} x2={W - padR} y1={y(lv)} y2={y(lv)} stroke="#eee9df" strokeDasharray={lv === 3 ? '0' : '3 4'} />)}
      <motion.path d={area} fill={color} fillOpacity="0.12" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} />
      <motion.path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: 'easeInOut' }} />
      {points.map((p, i) => {
        const sel = selected != null && p.key === selected;
        return (
          <g key={i} role={onPick ? 'button' : undefined} tabIndex={onPick ? 0 : undefined} aria-label={`${p.key}년 흐름 보기`} aria-pressed={onPick ? sel : undefined} onKeyDown={onPick ? e => { if(e.key==='Enter'||e.key===' ') {e.preventDefault();onPick(p,i);} } : undefined} onClick={onPick ? () => onPick(p, i) : undefined} style={{ cursor: onPick ? 'pointer' : 'default' }}>
            {sel && <line x1={x(i)} x2={x(i)} y1={padT} y2={H - padB} stroke={color} strokeDasharray="3 3" opacity="0.6" />}
            <rect x={x(i) - 22} y={padT} width="44" height={H - padT - padB + 22} fill="transparent" />
            <motion.circle cx={x(i)} cy={y(p.value)} r={sel ? 7 : p.now ? 6 : 4} fill={p.now || sel ? color : '#fff'} stroke={color} strokeWidth="2"
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 + i * 0.08 }} style={{ transformOrigin: `${x(i)}px ${y(p.value)}px` }} />
            <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill={p.now || sel ? color : '#8f94a3'} fontWeight={p.now || sel ? 700 : 400}>{p.label}</text>
            {p.mark && <text x={x(i)} y={y(p.value) - 10} textAnchor="middle" fontSize="10" fill={color}>{p.mark}</text>}
          </g>
        );
      })}
    </svg>
  );
}

/** 12개월 막대 */
export function MonthBars({ months, color = '#c9962e', nowMonth, getValue, onPick, selected }) {
  const val = getValue || ((m) => m.luck.overall);
  return (
    <div className="mbars">
      {months.map((m, i) => (
        <div key={m.monthNo} className={`mb ${m.monthNo === nowMonth ? 'now' : ''} ${selected === m.monthNo ? 'sel' : ''}`} onClick={onPick ? () => onPick(m) : undefined} style={{ cursor: onPick ? 'pointer' : 'default' }}>
          <b>{val(m)}</b>
          <div className="mbt"><motion.i style={{ background: color }} initial={{ height: 0 }} animate={{ height: `${val(m) * 20}%` }} transition={{ delay: i * 0.04, duration: 0.6 }} /></div>
          <span>{m.monthNo}</span>
        </div>
      ))}
    </div>
  );
}
