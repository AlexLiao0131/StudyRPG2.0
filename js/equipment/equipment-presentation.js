import { equipmentPowerScore } from './equipment-service.js';

const RARITY_LABEL=Object.freeze({
  common:'⚪ 普通',uncommon:'🟢 優良',rare:'🔵 稀有',epic:'🟣 史詩',legendary:'🟠 傳說'
});
const PERCENT_STATS=new Set(['crit','evade','block']);

export function equipmentAffixText(affix={}){
  if(affix.text)return String(affix.text);
  const name=String(affix.name||affix.id||'詞條');
  if(affix.kind==='stat'&&affix.stat){
    const value=Number(affix.value??affix.max??affix.min??0),shown=PERCENT_STATS.has(String(affix.stat))?`${Math.round(value*100)}%`:String(value);
    return `${name} +${shown}`;
  }
  if(affix.kind==='skill_boost')return `${name}${Number(affix.multiplier)>0?` +${Math.round(Number(affix.multiplier)*100)}%`:''}`;
  return name;
}

export function equipmentPresentation(item={}){
  const image=String(item.inventoryIcon||item.visual?.inventory||'');
  const rarity=String(item.rarity||'common'),tier=String(item.tier||'');
  const power=Number.isFinite(Number(item.powerScore))?Number(item.powerScore):equipmentPowerScore(item);
  return {
    image,
    rarity,
    rarityLabel:RARITY_LABEL[rarity]||rarity,
    tier,
    power:Math.round((Number(power)||0)*10)/10,
    affixes:(item.affixes||[]).map(equipmentAffixText).filter(Boolean),
    generated:!!item.generated,
    unique:!!item.uniqueId||rarity==='legendary'
  };
}
