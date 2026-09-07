import Tile from './Tile.jsx';
import { HIDDEN_STEMS, STEM_KO } from '../saju/tables.js';

export default function PillarBoard({ data }) {
  const keys = ['time','day','month','year'];
  const names = {time:['시주','태어난 시간'],day:['일주','나를 나타내는 날'],month:['월주','태어난 달'],year:['연주','태어난 해']};
  const rows = [
    ['십성', p => p.stemGod],
    ['천간', p => <Tile ch={p.stem} ko={p.stemKo} el={p.stemEl} size="md" flip={false}/>],
    ['지지', p => <Tile ch={p.branch} ko={p.branchKo} el={p.branchEl} size="md" flip={false}/>],
    ['십성', p => p.branchGod],
    ['지장간', p => HIDDEN_STEMS[p.branch].map(h => STEM_KO[h]).join(' · ')],
    ['12운성', p => p.stage],
    ['12신살', p => p.sal ?? p.salYear],
  ];
  return <div className="pillar-table-wrap"><table className="pillar-table"><caption className="sr-only">생년월일시로 계산한 사주팔자와 십성, 지장간, 십이운성, 십이신살</caption><thead><tr><th scope="col">사주</th>{keys.map(k=><th scope="col" key={k} className={k==='day'?'day-column':''}>{names[k][0]}<small>{names[k][1]}</small></th>)}</tr></thead><tbody>{rows.map(([label,render],i)=><tr key={i} className={i===1||i===2?'glyph-row':''}><th scope="row">{label}</th>{keys.map(k=><td key={k} className={k==='day'?'day-column':''}>{data.detail[k]?render(data.detail[k]):<span className="unknown-cell">{i===1?'시간':i===2?'모름':'—'}</span>}</td>)}</tr>)}</tbody></table></div>;
}
