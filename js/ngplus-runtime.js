import { NGPLUS_MONSTER_DATABASE } from './ngplus-database.js';

function cycleOf(engine){return Math.max(1,Number(engine?.campaignProgress?.cycle)||1)}
function hashMonster(monsterId,seed=0){
  return Math.abs(String(monsterId||'').split('').reduce((n,c)=>n+c.charCodeAt(0),Number(seed)||0));
}
function affixDef(id){return NGPLUS_MONSTER_DATABASE.affixes?.[id]||null}

export function applyNgPlusMonsterLoadout(engine,unit){
  if(!unit||unit.isSummon)return null;
  const cycle=cycleOf(engine);if(cycle<=1)return null;
  const skills=NGPLUS_MONSTER_DATABASE.skillPool||[],affixes=Object.values(NGPLUS_MONSTER_DATABASE.affixes||{});
  const skillId=skills.length?skills[hashMonster(unit.monsterId,cycle)%skills.length]:'';
  const count=Math.min(Math.max(0,Number(NGPLUS_MONSTER_DATABASE.maxAffixes)||0),Math.max(0,cycle-1),affixes.length),chosen=[];
  for(let i=0;i<count;i++){
    const def=affixes[(i+cycle+String(unit.monsterId||'').length)%affixes.length];
    if(def&&!chosen.some(x=>x.id===def.id))chosen.push(def);
  }
  for(const def of chosen)for(const [stat,mult] of Object.entries(def.statMultipliers||{}))if(Number.isFinite(Number(unit[stat])))unit[stat]=Number(unit[stat])*Number(mult);
  unit.ngPlus={cycle,skillId,affixIds:chosen.map(x=>x.id)};
  unit.ngPlusSkillId=skillId; // migration/debug compatibility only
  unit.ngAffixes=chosen.map(x=>({id:x.id,name:x.name}));
  if(chosen.length)unit.name+=`【${chosen.map(x=>x.name).join('・')}】`;
  if(engine?.log)engine.log(`♻️ 二週目強化：${unit.name}${skillId?`｜額外技能 ${engine.skillFor?.(skillId)?.name||skillId}`:''}`);
  return unit.ngPlus;
}

export function ngPlusSkillForTurn(engine,unit){
  const id=unit?.ngPlus?.skillId||unit?.ngPlusSkillId;if(!id)return null;
  if(Math.random()>=Number(NGPLUS_MONSTER_DATABASE.bonusSkillChance||0))return null;
  return engine?.skillFor?.(id)||null;
}

export function applyNgPlusTurnStart(engine,unit){
  if(!unit?.ngPlus?.affixIds?.length||unit.hp<=0)return false;
  let changed=false;
  for(const id of unit.ngPlus.affixIds){
    const def=affixDef(id),pct=Number(def?.turnStart?.healMaxHp)||0;
    if(pct>0&&unit.hp<unit.maxHp){
      const heal=Math.min(unit.maxHp-unit.hp,Math.max(1,Math.round(unit.maxHp*pct)));
      unit.hp+=heal;changed=true;
      engine?.log?.(`♻️ ${unit.name}的${def.name}詞綴恢復 ${heal} HP。`);
    }
  }
  if(changed)engine?.emit?.({type:'enemy-state',unitUid:unit.uid});
  return changed;
}
