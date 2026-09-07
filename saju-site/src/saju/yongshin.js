/**
 * 억부용신(抑扶用神)과 희신·기신·구신·한신
 *
 *  - 신강: 힘을 눌러 주는 식상·재성·관성이 좋은 편, 힘을 더 보태는 비겁·인성이 나쁜 편.
 *      비겁이 원인 → 관성(제압) > 식상(설기) > 재성 / 인성이 원인 → 재성(재극인) > 식상
 *  - 신약: 힘을 세워 주는 인성·비겁이 좋은 편, 힘을 빼앗는 식상·재성·관성이 나쁜 편.
 *      관성이 병 → 인성(살인상생) / 재성이 병 → 비겁(재다신약) / 식상이 병 → 인성
 *  - 희신: 좋은 편에서 용신을 낳는 기운(없으면 용신이 낳는 기운)
 *  - 기신: 균형을 깨뜨린 병(病)이 되는 기운(원인 그룹). 원인이 없으면 용신을 극하는 기운
 *  - 구신: 나쁜 편에서 기신을 낳는 기운(없으면 남은 나쁜 기운 중 가장 강한 것)
 *  - 한신: 나머지
 *  - 중화: 조후(계절)가 필요로 하는 기운을 용신으로 삼고 순환 공식(생·극)으로 희기신을 정한다.
 */
const GEN = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const CTRL = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const genBy = (el) => Object.keys(GEN).find((k) => GEN[k] === el);
const ctrlBy = (el) => Object.keys(CTRL).find((k) => CTRL[k] === el);

export const GROUP_EL = (dayEl) => ({ 비겁: dayEl, 식상: GEN[dayEl], 재성: GEN[GEN[dayEl]], 관성: ctrlBy(dayEl), 인성: genBy(dayEl) });

export function pickYong({ label, groups = {}, needEl, dayEl }) {
  const groupEl = GROUP_EL(dayEl);
  const elGroup = Object.fromEntries(Object.entries(groupEl).map(([g, e]) => [e, g]));
  const g = (k) => groups[k] || 0;
  const has = (k) => g(k) > 0;
  const strongest = (arr) => arr.slice().sort((a, b) => g(b) - g(a))[0];

  let yongGroup, why, cause = null, fav = null, unf = null;
  if (label === '신강') {
    fav = ['식상', '재성', '관성']; unf = ['비겁', '인성'];
    cause = g('비겁') >= g('인성') ? '비겁' : '인성';
    if (cause === '비겁') {
      yongGroup = has('관성') ? '관성' : has('식상') ? '식상' : has('재성') ? '재성' : '관성';
      why = `비겁(나와 같은 기운)이 많아 일간이 강하니, 그 힘을 ${yongGroup === '관성' ? '다스리는 관성(책임·규범)' : yongGroup === '식상' ? '흘려보내는 식상(표현·생산)' : '쓰게 하는 재성(재물·현실)'}이 균형을 잡습니다.`;
    } else {
      yongGroup = has('재성') ? '재성' : has('식상') ? '식상' : '재성';
      why = `인성(나를 돕는 기운)이 많아 일간이 강하니, 그 힘을 ${yongGroup === '재성' ? '쓰게 하는 재성(재물·현실)이 인성을 눌러' : '밖으로 내는 식상(표현·생산)이'} 균형을 잡습니다.`;
    }
  } else if (label === '신약') {
    fav = ['인성', '비겁']; unf = ['관성', '재성', '식상'];
    const top = strongest(unf); cause = has(top) ? top : null;
    if (cause === '관성') { yongGroup = has('인성') ? '인성' : '비겁'; why = `관성(압박)이 강해 일간이 약하니, 압박을 지혜로 바꾸는 ${yongGroup === '인성' ? '인성(배움·보호)이 용신입니다(살인상생)' : '기운이 필요하나 인성이 없어 나를 세우는 비겁(동료·자립)이 용신입니다'}.`; }
    else if (cause === '재성') { yongGroup = has('비겁') ? '비겁' : '인성'; why = `재성(재물)이 많아 일간이 약하니(재다신약), ${yongGroup === '비겁' ? '나를 세우는 비겁(동료·자립)' : '비겁이 없어 나를 생하는 인성(배움·보호)'}이 용신입니다.`; }
    else if (cause === '식상') { yongGroup = has('인성') ? '인성' : '비겁'; why = `식상(발산)이 많아 기운이 새니, ${yongGroup === '인성' ? '발산을 다스리고 나를 채우는 인성' : '인성이 없어 나를 세우는 비겁'}이 용신입니다.`; }
    else { yongGroup = has('인성') ? '인성' : '비겁'; why = `일간이 약하니 나를 ${yongGroup === '인성' ? '생하는 인성(배움·자격·보호)' : '세우는 비겁(동료·자립)'}이 용신입니다.`; }
  } else {
    yongGroup = elGroup[needEl] || '식상';
    why = `일간의 강약이 중화에 가까워 억부보다 조후가 우선입니다. 계절이 필요로 하는 ${needEl} 기운, 곧 ${yongGroup}이 용신입니다.`;
  }
  const yongEl = groupEl[yongGroup];

  let heeG, giG, guG, hanG; const how = {};
  if (fav) {
    const born = elGroup[genBy(yongEl)], child = elGroup[GEN[yongEl]];
    heeG = [born, child].find((x) => fav.includes(x) && x !== yongGroup) || fav.find((x) => x !== yongGroup);
    how.hee = heeG === born ? `용신 ${yongGroup}을 낳아 돕는 기운` : `용신과 같은 편에서 일간을 ${label === '신강' ? '눌러 주는' : '세워 주는'} 기운`;
    giG = cause && unf.includes(cause) ? cause : null;
    if (!giG) { const c = elGroup[ctrlBy(yongEl)]; giG = unf.includes(c) ? c : strongest(unf); }
    how.gi = giG === cause ? `일간을 지나치게 ${label === '신강' ? '강하게' : '약하게'} 만든 병(病)이 되는 기운` : `용신 ${yongGroup}을 직접 치는 기운`;
    const rest = unf.filter((x) => x !== giG);
    const genGi = elGroup[genBy(groupEl[giG])];
    guG = rest.includes(genGi) ? genGi : strongest(rest);
    how.gu = guG === genGi ? `기신 ${giG}을 낳아 키우는 기운` : `기신과 같은 편에서 균형을 흔드는 기운`;
    hanG = [...fav, ...unf].find((x) => ![yongGroup, heeG, giG, guG].includes(x));
    how.han = '어느 쪽에도 크게 힘을 보태지 않는 기운';
  } else {
    heeG = elGroup[genBy(yongEl)]; giG = elGroup[ctrlBy(yongEl)]; guG = elGroup[ctrlBy(genBy(yongEl))]; hanG = elGroup[GEN[yongEl]];
    how.hee = '용신을 낳아 돕는 기운'; how.gi = '용신을 직접 치는 기운'; how.gu = '희신을 치고 기신을 돕는 기운'; how.han = '어느 쪽에도 크게 힘을 보태지 않는 기운';
  }

  return {
    group: yongGroup, el: yongEl, why, cause, side: label,
    hee: groupEl[heeG], gi: groupEl[giG], gu: groupEl[guG], han: groupEl[hanG],
    groups: { hee: heeG, gi: giG, gu: guG, han: hanG }, how,
  };
}
