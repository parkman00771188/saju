import { motion } from 'framer-motion';
import PillarBoard from './PillarBoard.jsx';
import Ohaeng from './Ohaeng.jsx';
import Fortune from './Fortune.jsx';
import Relations from './Relations.jsx';
import Interpretation from './Interpretation.jsx';
import { ELEMENT_COLOR, ELEMENT_KO, STEM_KO } from '../saju/tables.js';

const sec = (delay = 0) => ({
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] },
});

export default function Result({ data, onReset }) {
  const { meta, pillars, dayStem, dayStemDesc, current } = data;
  const dayEl = pillars.day.stemEl;
  const c = ELEMENT_COLOR[dayEl];
  const summary = `${pillars.year.text} ${pillars.month.text} ${pillars.day.text} ${pillars.time ? pillars.time.text : '□□'}`;

  return (
    <div className="result-inner">
      <motion.header className="rhead" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
        <button type="button" className="back" onClick={onReset}>← 다시 입력</button>
        <div className="who">
          <div className="me-tile" style={{ background: c.bg, color: c.fg, boxShadow: `0 0 60px -10px ${c.glow}` }}>
            <span className="hanja">{dayStem}</span>
            <span className="ko">{STEM_KO[dayStem]} · {ELEMENT_KO[dayEl]}</span>
          </div>
          <div className="who-text">
            <p className="eyebrow">일간 日干 · 나를 나타내는 글자</p>
            <h2>{meta.name || '이름 없음'} <small>{meta.gender} · {meta.koreanAge}세 (만 {meta.manAge}세) · {meta.zodiac}띠</small></h2>
            <p className="desc">{dayStemDesc}</p>
            <p className="dates">
              <span><b className="or">양력</b> {meta.solar} ({meta.weekday}) {meta.time}</span>
              <span><b className="bl">음력</b> {meta.lunarText}</span>
              {meta.correctedTime && <span><b>보정시</b> {meta.correctedTime} ({meta.correctionMin > 0 ? '+' : ''}{meta.correctionMin}분)</span>}
            </p>
            <p className="opts">{meta.options.join(' · ')} · 절기 {meta.prevJieqi.name} {meta.prevJieqi.time.slice(0, 16)} ~ {meta.nextJieqi.name}</p>
            <p className="gz">{summary}</p>
          </div>
        </div>
      </motion.header>

      <Interpretation data={data} />

      <motion.section className="card" {...sec(0)}>
        <div className="sec-head">
          <h3>원국 原局 <small>사주 여덟 글자와 십성 · 십이운성 · 십이신살 · 지장간</small></h3>
          <p>지금 흐르는 세운 {current.year.text} · 대운 {current.daeun?.text} 를 함께 놓았습니다.</p>
        </div>
        <PillarBoard data={data} />
      </motion.section>

      <motion.section className="card" {...sec(0.05)}>
        <div className="sec-head">
          <h3>오행 五行 <small>여덟 글자의 기운 분포</small></h3>
          <p>금색 선은 상생(生), 붉은 점선은 상극(剋)의 흐름입니다.</p>
        </div>
        <Ohaeng data={data} />
      </motion.section>

      <motion.section className="card" {...sec(0.05)}>
        <div className="sec-head">
          <h3>운의 흐름 運 <small>대운 · 세운 · 월운</small></h3>
          <p>카드를 누르면 그 시기의 세운과 월운이 펼쳐집니다.</p>
        </div>
        <Fortune data={data} />
      </motion.section>

      <motion.section className="card plain" {...sec(0.05)}>
        <div className="sec-head">
          <h3>관계와 별 <small>합 · 충 · 형파해 · 신살 · 육친 · 원진귀문공망</small></h3>
        </div>
        <Relations data={data} />
      </motion.section>

      <footer className="rfoot">
        <p>천기록 天機錄 · 만세력 엔진 lunar-javascript · 본 결과는 명리 이론에 따른 참고 자료입니다.</p>
        <button type="button" className="primary" onClick={onReset}>다른 사주 보기</button>
      </footer>
    </div>
  );
}
