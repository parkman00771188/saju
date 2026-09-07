import Tile from './Tile.jsx';
import { HIDDEN_STEMS, STEM_KO, STEM_ELEMENT, ELEMENT_COLOR, TEN_GOD_DESC } from '../saju/tables.js';

function Col({ label, d, delay, dim = false }) {
  if (!d) {
    return (
      <div className="pcol">
        <div className="phead">{label}</div>
        <div className="pcell god">—</div>
        <Tile ghost size="md" delay={delay} /><Tile ghost size="md" delay={delay + 0.08} />
        <div className="pcell god">—</div><div className="pcell">—</div><div className="pcell">—</div><div className="pcell hid">—</div>
      </div>
    );
  }
  const hidden = HIDDEN_STEMS[d.branch];
  return (
    <div className={`pcol ${dim ? 'dim' : ''} ${d.pos === 'day' ? 'me' : ''}`}>
      <div className="phead">{label}</div>
      <div className="pcell god" title={TEN_GOD_DESC[d.stemGod]}>{d.stemGod}</div>
      <Tile ch={d.stem} ko={d.stemKo} el={d.stemEl} size="md" delay={delay} />
      <Tile ch={d.branch} ko={d.branchKo} el={d.branchEl} size="md" delay={delay + 0.08} />
      <div className="pcell god" title={TEN_GOD_DESC[d.branchGod]}>{d.branchGod}</div>
      <div className="pcell">{d.stage}</div>
      <div className="pcell">{d.sal ?? d.salYear}</div>
      <div className="pcell hid">
        {hidden.map((h) => <b key={h} style={{ color: ELEMENT_COLOR[STEM_ELEMENT[h]].bg }}>{STEM_KO[h]}</b>)}
      </div>
    </div>
  );
}

/** 원국 보드: [현재세운 현재대운 | 시 일 월 년] 6열 (참고 시안과 동일 구성) */
export default function PillarBoard({ data }) {
  const { detail, order, current } = data;
  return (
    <div className="board">
      <Col label="현재세운" d={{ ...current.year, pos: 'seun' }} delay={0.05} dim />
      <Col label="현재대운" d={{ ...current.daeun, pos: 'daeun' }} delay={0.1} dim />
      <div className="pdiv" />
      {order.map((k, i) => (
        <Col key={k} label={{ time: '시', day: '일', month: '월', year: '년' }[k]} d={detail[k]} delay={0.15 + i * 0.1} />
      ))}
    </div>
  );
}
