import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import PillarBoard from './PillarBoard.jsx';
import Ohaeng from './Ohaeng.jsx';
import Fortune from './Fortune.jsx';
import Relations from './Relations.jsx';
import ReadingOverlay from './ReadingOverlay.jsx';
import { ELEMENT_COLOR, ELEMENT_KO, STEM_KO, ELEMENTS } from '../saju/tables.js';

const TABS = [
  { id: '운', hanja: '運', label: '대운·세운' },
  { id: '오행', hanja: '五', label: '오행도' },
  { id: '신살', hanja: '殺', label: '신살·합충' },
];

export default function Result({ data, onReset }) {
  const { meta, pillars, dayStem, relations } = data;
  const dayEl = pillars.day.stemEl;
  const c = ELEMENT_COLOR[dayEl];
  const [tab, setTab] = useState('운');
  const [reading, setReading] = useState(false);
  const pick = (id) => setTab(id);

  const LAB = { 천간충: '충', 천간합: '합', 육합: '합', 삼합: '삼합', 방합: '방합', 충: '충', 삼형: '삼형', 형: '형', 상형: '형', 자형: '자형', 파: '파', 해: '해' };
  const pairText = (list) => list.map((r) => r.chars.map((x) => x.ch).join('') + (LAB[r.label] || r.label)).join(' · ');
  const stemChange = pairText([...relations.stemHap, ...relations.stemChung]) || '없음';
  const branchChange = pairText([...relations.chung, ...relations.yukhap, ...relations.samhap.filter((r) => r.full), ...relations.banghap.filter((r) => r.full), ...relations.hyeong, ...relations.pa, ...relations.hae]) || '없음';

  return (
    <div className="result-inner">
      <motion.header className="rhead" initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <button type="button" className="back" onClick={onReset}>‹ 다시 입력</button>
        <div className="who">
          <div className="me-tile" style={{ background: c.bg, color: c.fg }}>
            <span className="hanja">{dayStem}</span>
            <span className="ko">{STEM_KO[dayStem]}·{ELEMENT_KO[dayEl]}</span>
          </div>
          <div className="who-text">
            <h2>{meta.name || '이름 없음'} <small>({meta.gender}) {meta.koreanAge}세 (만 {meta.manAge}세) · {meta.zodiac}띠</small></h2>
            <p className="dates"><b className="or">양력</b> {meta.solar} {meta.time} <span className="sep">/</span> <b className="bl">음력</b> {meta.lunarText}</p>
            <p className="opts">{meta.options.join(', ')}{meta.correctedTime ? `, 보정시 ${meta.correctedTime} (${meta.correctionMin > 0 ? '+' : ''}${meta.correctionMin}분)` : ''}</p>
          </div>
        </div>
      </motion.header>

      <motion.section className="card board-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
        <PillarBoard data={data} />
      </motion.section>

      <motion.section className="card summary" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
        <div className="srow"><span className="sl">사주 오행</span><span className="sv els">{ELEMENTS.map((e) => <b key={e} style={{ color: ELEMENT_COLOR[e].bg }}>{e} <i>{data.elements[e]}</i></b>)}</span></div>
        <div className="srow"><span className="sl">천간 변화</span><span className="sv">{stemChange}</span></div>
        <div className="srow"><span className="sl">지지 변화</span><span className="sv">{branchChange}</span></div>
        <div className="srow"><span className="sl">공망/태월</span><span className="sv">{meta.gongmang.join('')} / {meta.taewon.text}</span></div>
      </motion.section>

      <motion.nav className="itabs" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
        {TABS.map((t) => (
          <button type="button" key={t.id} className={`itab ${tab === t.id ? 'on' : ''}`} onClick={() => pick(t.id)}>
            <span className="icirc"><span className="hanja">{t.hanja}</span></span>
            <span className="ilab">{t.label}</span>
          </button>
        ))}
      </motion.nav>

      <AnimatePresence mode="wait">
        <motion.section key={tab} className="card panelcard" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4 }}>
          {tab === '운' && <Fortune data={data} />}
          {tab === '오행' && <Ohaeng data={data} />}
          {tab === '신살' && <Relations data={data} />}
        </motion.section>
      </AnimatePresence>

      <footer className="rfoot">
        <motion.button type="button" className="primary big" onClick={() => setReading(true)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <span className="hanja">解</span> 사주 해석 보기 <i />
        </motion.button>
        <p>천기록 天機錄 · 만세력 엔진 lunar-javascript · 본 결과는 명리 이론에 따른 참고 자료입니다.</p>
      </footer>

      <AnimatePresence>
        {reading && <ReadingOverlay key="reading" data={data} onClose={() => setReading(false)} />}
      </AnimatePresence>
    </div>
  );
}
