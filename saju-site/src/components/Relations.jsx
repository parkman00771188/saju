import { useState } from 'react';
import { motion } from 'framer-motion';
import Tile from './Tile.jsx';
import { SINSAL_DESC, SAL_DESC, STEM_KO, BRANCH_KO, ELEMENT_KO } from '../saju/tables.js';

const posKo = { time: '시', day: '일', month: '월', year: '년' };

function Pair({ r }) {
  return (
    <div className="pair">
      {r.chars.map((c, i) => (
        <span key={i} className="pc"><small>{c.posKo}</small>{c.ch}</span>
      ))}
      <em>{r.label}{r.result ? ` → ${r.result}(${ELEMENT_KO[r.result]})` : ''}</em>
    </div>
  );
}

function Panel({ title, children, delay = 0, className = '' }) {
  return (
    <motion.div className={`panel ${className}`} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.6, delay }}>
      <h4>{title}</h4>
      {children}
    </motion.div>
  );
}

const Empty = ({ text }) => <p className="empty">{text}</p>;

export default function Relations({ data }) {
  const { relations: R, sinsal, yukchin, pillars, order, meta, detail } = data;
  const [info, setInfo] = useState(null);
  const present = order.filter((k) => pillars[k]);
  const showInfo = (name) => setInfo({ name, desc: SINSAL_DESC[name] || SAL_DESC[name] || '' });

  const jijiHap = [...R.yukhap, ...R.samhap, ...R.banghap];
  const hyeongpahae = [...R.hyeong, ...R.pa, ...R.hae];

  return (
    <div className="relations">
      <Panel title="합 合" delay={0}>
        <h5>천간합</h5>
        {R.stemHap.length ? R.stemHap.map((r, i) => <Pair key={i} r={r} />) : <Empty text="천간합이 없습니다." />}
        <h5>지지합</h5>
        {jijiHap.length ? jijiHap.map((r, i) => <Pair key={i} r={r} />) : <Empty text="지지합이 없습니다." />}
      </Panel>

      <Panel title="충 沖" delay={0.05}>
        <h5>천간충</h5>
        {R.stemChung.length ? R.stemChung.map((r, i) => <Pair key={i} r={r} />) : <Empty text="천간충이 없습니다." />}
        <h5>지지충</h5>
        {R.chung.length ? R.chung.map((r, i) => <Pair key={i} r={r} />) : <Empty text="지지충이 없습니다." />}
      </Panel>

      <Panel title="형 · 파 · 해" delay={0.1}>
        {hyeongpahae.length ? hyeongpahae.map((r, i) => <Pair key={i} r={r} />) : <Empty text="형·파·해가 없습니다." />}
      </Panel>

      <Panel title="신살 神殺" delay={0.15} className="wide">
        <div className="pillar-list">
          {present.map((k) => (
            <div className="pl" key={k}>
              <Tile ch={pillars[k].branch} ko={BRANCH_KO[pillars[k].branch]} el={pillars[k].branchEl} size="sm" flip={false} />
              <small>{posKo[k]}지 · {detail[k].salDay}</small>
              <ul>
                {(sinsal[k] || []).map((s) => (
                  <li key={s.name}><button type="button" className={info?.name === s.name ? 'on' : ''} onClick={() => showInfo(s.name)}>{s.name}</button></li>
                ))}
                {!(sinsal[k] || []).length && <li className="none">—</li>}
              </ul>
            </div>
          ))}
        </div>
        {info && <p className="info"><b>{info.name}</b> {info.desc}</p>}
        {!info && <p className="info muted">신살 이름을 누르면 뜻을 볼 수 있습니다.</p>}
      </Panel>

      <Panel title="육친 六親" delay={0.2} className="wide">
        <h5>천간</h5>
        <div className="pillar-list">
          {present.map((k) => (
            <div className="pl" key={k}>
              <Tile ch={pillars[k].stem} ko={STEM_KO[pillars[k].stem]} el={pillars[k].stemEl} size="sm" flip={false} />
              <small>{detail[k].stemGod}</small>
              <ul>{yukchin[k].stem.map((y) => <li key={y}>{y}</li>)}</ul>
            </div>
          ))}
        </div>
        <h5>지지</h5>
        <div className="pillar-list">
          {present.map((k) => (
            <div className="pl" key={k}>
              <Tile ch={pillars[k].branch} ko={BRANCH_KO[pillars[k].branch]} el={pillars[k].branchEl} size="sm" flip={false} />
              <small>{detail[k].branchGod}</small>
              <ul>{yukchin[k].branch.map((y) => <li key={y}>{y}</li>)}</ul>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="원진 · 귀문 · 공망 · 태월" delay={0.25}>
        <h5>원진</h5>
        {R.wonjin.length ? R.wonjin.map((r, i) => <Pair key={i} r={r} />) : <Empty text="원진이 없습니다." />}
        <h5>귀문관살</h5>
        {R.gwimun.length ? R.gwimun.map((r, i) => <Pair key={i} r={r} />) : <Empty text="귀문이 없습니다." />}
        <div className="two">
          <div>
            <h5>공망 <small>일주 기준</small></h5>
            <div className="tiles">{meta.gongmang.map((b) => <Tile key={b} ch={b} ko={BRANCH_KO[b]} size="sm" flip={false} ghost />)}</div>
          </div>
          <div>
            <h5>태월 <small>胎月</small></h5>
            <div className="tiles">
              <Tile ch={meta.taewon.stem} ko={meta.taewon.stemKo} el={meta.taewon.stemEl} size="sm" flip={false} />
              <Tile ch={meta.taewon.branch} ko={meta.taewon.branchKo} el={meta.taewon.branchEl} size="sm" flip={false} />
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
