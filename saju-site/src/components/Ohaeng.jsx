import { motion } from 'framer-motion';
import { ELEMENTS, ELEMENT_COLOR, ELEMENT_KO, STEMS, BRANCHES, STEM_ELEMENT, BRANCH_ELEMENT, STEM_KO, BRANCH_KO } from '../saju/tables.js';

// 시안과 같은 배치: 土 상단, 金 우, 水 우하, 木 좌하, 火 좌
const ANGLE = { 土: -90, 金: -18, 水: 54, 木: 126, 火: 198 };
const S = 360, C = S / 2, R = 150, r = 58;
const pt = (el, rad) => { const a = (ANGLE[el] * Math.PI) / 180; return [C + Math.cos(a) * rad, C + Math.sin(a) * rad]; };

function Glyph({ ch, ko, el, on, i }) {
  const c = ELEMENT_COLOR[el];
  return on ? (
    <motion.span className="og on" style={{ background: c.bg, color: c.fg }} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.5 + i * 0.05, type: 'spring', stiffness: 220, damping: 16 }}>
      {ch}<small>{ko}</small>
    </motion.span>
  ) : <span className="og">{ch}</span>;
}

function Group({ el, presentStems, presentBranches, align, tags }) {
  const stems = STEMS.filter((s) => STEM_ELEMENT[s] === el);
  const brs = BRANCHES.filter((b) => BRANCH_ELEMENT[b] === el);
  return (
    <div className={`ogroup ${align}`}>
      <div className="orow">{stems.map((s, i) => <Glyph key={s} ch={s} ko={STEM_KO[s]} el={el} on={presentStems.has(s)} i={i} />)}{tags?.stem}</div>
      <div className="orow">{brs.map((b, i) => <Glyph key={b} ch={b} ko={BRANCH_KO[b]} el={el} on={presentBranches.has(b)} i={i + 2} />)}{tags?.branch}</div>
    </div>
  );
}

export default function Ohaeng({ data }) {
  const { elements, missing, strongest, pillars, order, dayStem } = data;
  const total = Object.values(elements).reduce((a, b) => a + b, 0);
  const presentStems = new Set(order.filter((k) => pillars[k]).map((k) => pillars[k].stem));
  const presentBranches = new Set(order.filter((k) => pillars[k]).map((k) => pillars[k].branch));
  const dayBranch = pillars.day.branch;
  const dayEl = STEM_ELEMENT[dayStem];
  const g = (el, align) => (
    <Group el={el} align={align} presentStems={presentStems} presentBranches={presentBranches}
      tags={el === dayEl ? { stem: <span className="otag">일간</span>, branch: BRANCH_ELEMENT[dayBranch] === el ? <span className="otag">일지</span> : null }
        : BRANCH_ELEMENT[dayBranch] === el ? { branch: <span className="otag">일지</span> } : null} />
  );

  return (
    <div className="ohaeng">
      <div className="ostar">
        <div className="oc top">{g('土', 'center')}</div>
        <div className="oc left">{g('火', 'right')}</div>
        <div className="oc center">
          <svg viewBox={`0 0 ${S} ${S}`} className="pent">
            {ELEMENTS.map((el, i) => {
              const [x, y] = pt(el, R);
              const prev = ELEMENTS[(i + 4) % 5], next = ELEMENTS[(i + 1) % 5];
              const [px, py] = pt(prev, r), [nx, ny] = pt(next, r), [ax, ay] = pt(el, r);
              const l = [(ax + px) / 2, (ay + py) / 2], rr = [(ax + nx) / 2, (ay + ny) / 2];
              const on = elements[el] > 0;
              return (
                <motion.polygon key={el} points={`${l[0]},${l[1]} ${x},${y} ${rr[0]},${rr[1]} ${ax},${ay}`} fill={on ? ELEMENT_COLOR[el].bg : '#ececec'} stroke="#fff" strokeWidth="2"
                  initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + i * 0.1, duration: 0.6, ease: 'easeOut' }} style={{ transformOrigin: `${C}px ${C}px` }} />
              );
            })}
            <circle cx={C} cy={C} r={r * 0.78} fill="url(#tg)" />
            <defs><linearGradient id="tg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#f2a3a3" /><stop offset="1" stopColor="#8b93dc" /></linearGradient></defs>
            <path d={`M ${C} ${C - r * 0.78} A ${r * 0.39} ${r * 0.39} 0 0 1 ${C} ${C} A ${r * 0.39} ${r * 0.39} 0 0 0 ${C} ${C + r * 0.78} A ${r * 0.78} ${r * 0.78} 0 0 1 ${C} ${C - r * 0.78}`} fill="rgba(255,255,255,.55)" />
            {ELEMENTS.map((el) => { const [x, y] = pt(el, R * 0.66); return <text key={el} x={x} y={y + 8} textAnchor="middle" className="pel" fill={elements[el] ? ELEMENT_COLOR[el].fg : '#9a9a9a'}>{el}</text>; })}
          </svg>
        </div>
        <div className="oc right">{g('金', 'left')}</div>
        <div className="oc bl">{g('木', 'left')}</div>
        <div className="oc br">{g('水', 'right')}</div>
      </div>

      <div className="ostats">
        <div className="bars">
          {ELEMENTS.map((el, i) => (
            <div className="bar" key={el}>
              <span className="lab" style={{ color: ELEMENT_COLOR[el].bg }}>{el} {ELEMENT_KO[el]}</span>
              <div className="track"><motion.i style={{ background: ELEMENT_COLOR[el].bg }} initial={{ width: 0 }} animate={{ width: `${(elements[el] / total) * 100}%` }} transition={{ duration: 0.9, delay: 0.3 + i * 0.08 }} /></div>
              <b>{elements[el]}</b>
            </div>
          ))}
        </div>
        <p className="onote">
          가장 강한 기운은 <b style={{ color: ELEMENT_COLOR[strongest].bg }}>{strongest}({ELEMENT_KO[strongest]})</b>
          {missing.length ? <> · 없는 오행은 <b>{missing.map((m) => `${m}(${ELEMENT_KO[m]})`).join(', ')}</b> 입니다. 비어 있는 오행은 운에서 채워질 때 크게 움직입니다.</> : <> · 다섯 오행이 모두 갖추어진 사주입니다.</>}
        </p>
      </div>
    </div>
  );
}
