import Tile from './Tile.jsx';
import { HIDDEN_STEMS, STEM_KO, STEM_ELEMENT, ELEMENT_COLOR, tenGod, TEN_GOD_DESC } from '../saju/tables.js';

const rows = ['십성', '천간', '지지', '십성', '십이운성', '십이신살', '지장간'];

function Labels() {
  return (
    <div className="pcol labels">
      <div className="phead"> </div>
      {rows.map((r, i) => <div key={i} className={`pcell lab ${i === 1 || i === 2 ? 'tall' : ''}`}>{r}</div>)}
    </div>
  );
}

function Col({ label, d, dayStem, delay, dim = false }) {
  if (!d) {
    return (
      <div className="pcol">
        <div className="phead">{label}</div>
        <div className="pcell god">—</div>
        <Tile ghost size="lg" delay={delay} />
        <Tile ghost size="lg" delay={delay + 0.08} />
        <div className="pcell god">—</div>
        <div className="pcell">—</div>
        <div className="pcell">—</div>
        <div className="pcell hidden">—</div>
      </div>
    );
  }
  const hidden = HIDDEN_STEMS[d.branch].map((h) => ({ stem: h, god: tenGod(dayStem, h) }));
  return (
    <div className={`pcol ${dim ? 'dim' : ''} ${d.pos === 'day' ? 'me' : ''}`}>
      <div className="phead">{label}</div>
      <div className="pcell god" title={TEN_GOD_DESC[d.stemGod]}>{d.stemGod}</div>
      <Tile ch={d.stem} ko={d.stemKo} el={d.stemEl} size="lg" delay={delay} />
      <Tile ch={d.branch} ko={d.branchKo} el={d.branchEl} size="lg" delay={delay + 0.08} />
      <div className="pcell god" title={TEN_GOD_DESC[d.branchGod]}>{d.branchGod}</div>
      <div className="pcell">{d.stage}</div>
      <div className="pcell">{d.sal ?? d.salYear}</div>
      <div className="pcell hidden">
        {hidden.map((h) => (
          <span key={h.stem}>
            <b style={{ color: ELEMENT_COLOR[STEM_ELEMENT[h.stem]].bg }}>{STEM_KO[h.stem]}</b> {h.god}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * 원국 보드. 데스크톱: [사주 4기둥] | [현재세운·현재대운] 가로 배치
 * 모바일: 4기둥이 화면 폭에 맞게 4열로 꽉 차고, 현재 운은 아래에 별도 블록으로 쌓인다.
 */
export default function PillarBoard({ data }) {
  const { detail, order, dayStem, current } = data;
  return (
    <div className="board">
      <div className="bgroup main">
        <Labels />
        {order.map((k, i) => (
          <Col key={k} label={{ time: '시', day: '일', month: '월', year: '년' }[k]} d={detail[k]} dayStem={dayStem} delay={0.15 + i * 0.12} />
        ))}
      </div>
      <div className="bgroup now">
        <Labels />
        <Col label="현재세운" d={{ ...current.year, pos: 'seun' }} dayStem={dayStem} delay={0.6} dim />
        <Col label="현재대운" d={{ ...current.daeun, pos: 'daeun' }} dayStem={dayStem} delay={0.68} dim />
      </div>
    </div>
  );
}
