import { STATUS_DEFS } from './battle-config.js';
export function monsterAI(db,monsterId){return db?.monsterAI?.[monsterId]||{}}
export function monsterSkill(db,skillId){return db?.monsterSkills?.[skillId]||null}

export function isMagicCaster(db,monsterId){
  const ai=monsterAI(db,monsterId),defs=[];
  for(const e of ai.skills||[]){const s=monsterSkill(db,e.id);if(s)defs.push(s)}
  for(const id of ai.rotation||[]){const s=monsterSkill(db,id);if(s)defs.push(s)}
  const magic=defs.filter(s=>s.kind==='magic').length,physical=defs.filter(s=>s.kind==='physical').length;
  return magic>0&&magic>=physical;
}

export function skillUsable(engine,unit,entry,skill){
  if(!skill)return false;
  const used=Number(unit.skillUses?.[skill.id]||0),max=Number(entry?.maxUses??skill.maxUsesPerBattle??999);
  if(used>=max)return false;
  if(Number(unit.cooldowns?.[skill.id]||0)>0)return false;
  if(skill.requiresCharge&&unit.chargedSkill!==skill.id)return false;
  if(skill.conditionHpBelow!=null&&unit.hp/unit.maxHp>Number(skill.conditionHpBelow))return false;
  if(entry?.condition==='low_hp'&&unit.hp/unit.maxHp>Number(entry.threshold||skill.conditionHpBelow||.4))return false;
  if(skill.cannotUseConsecutively&&unit.lastSkillId===skill.id)return false;
  if(skill.kind==='summon'&&!engine.canUseSummonSkill(unit,skill))return false;
  return true;
}

export function chooseEnemySkill(engine,unit){
  const db=engine.content||{},ai=monsterAI(db,unit.monsterId);
  if(unit.forceBasicOnly)return {id:'summon_basic',name:'攻擊',kind:'physical',target:'single',multiplier:.8};
  if(unit.chargedSkill){const charged=monsterSkill(db,unit.chargedSkill);if(charged)return charged}
  if(Array.isArray(ai.rotation)&&ai.rotation.length){
    const id=ai.rotation[unit.rotationIndex%ai.rotation.length];unit.rotationIndex++;
    return monsterSkill(db,id);
  }
  if(unit.monsterId==='hero_mirror')return{id:'mirror_attack',name:'鏡像攻擊',kind:unit.magicAttack>unit.attack?'magic':'physical',element:'arcane',target:'single',multiplier:1,defensePierce:.50,mirrorDuel:true};
  const pool=[];
  for(const entry of ai.skills||[]){
    const skill=monsterSkill(db,entry.id);if(!skillUsable(engine,unit,entry,skill))continue;
    pool.push({skill,weight:Math.max(0,Number(entry.weight||1))});
  }
  if(!pool.length)return ai.noAttack?null:{id:'basic_attack',name:'攻擊',kind:'physical',target:'single',multiplier:1};
  const total=pool.reduce((n,x)=>n+x.weight,0);let roll=Math.random()*Math.max(.0001,total);
  for(const item of pool){roll-=item.weight;if(roll<=0)return item.skill}
  return pool.at(-1)?.skill||null;
}

export function statusFromMonsterSkill(status,target){
  if(!status)return null;const mods={};
  if(status.speedMultiplier!=null)mods.speed=(target.speed||0)*(Number(status.speedMultiplier)-1);
  if(status.evasionMultiplier!=null)mods.evade=-(target.evade||0)*(1-Number(status.evasionMultiplier));
  if(status.atkMultiplier!=null)mods.attack=(target.attack||0)*(Number(status.atkMultiplier)-1);
  if(status.matkMultiplier!=null)mods.magicAttack=(target.magicAttack||0)*(Number(status.matkMultiplier)-1);
  if(status.defMultiplier!=null)mods.defense=(target.defense||0)*(Number(status.defMultiplier)-1);
  if(status.mdefMultiplier!=null)mods.magicDefense=(target.magicDefense||0)*(Number(status.mdefMultiplier)-1);
  if(status.accuracyPenalty!=null)mods.hit=-Number(status.accuracyPenalty);
  const def=STATUS_DEFS[status.id]||{};return {type:status.id,turns:Number(status.duration||def.defaultTurns||1),power:0,maxHpDot:Number(status.maxHpDot||0),mods,effectType:'debuff',name:status.name||def.name||status.id,guaranteedSkip:['stun','paralysis'].includes(status.id)};
}
