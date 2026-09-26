import { getGame, update } from '../core/store.js';
import { ensureContentDatabase } from '../data/content-provider.js';
import { formalSkillRuntimeReady } from './formal-class-runtime.js';

const FALLBACK=Object.freeze([
 {id:'power_strike',name:'奮力一擊',icon:'💥',cost:20,actionType:'melee',effects:[{type:'damage',damageType:'physical',source:'attack',multiplier:1.6}],description:'ATK×1.60－敵DEF×0.5 的強力近戰攻擊。'},
 {id:'ember',name:'魔力彈',icon:'🔮',cost:18,actionType:'ranged',effects:[{type:'damage',damageType:'arcane',source:'magicAttack',multiplier:1.45}],description:'MATK×1.45－敵MDEF×0.5 的秘法遠程攻擊。'},
 {id:'defense_stance',name:'防禦姿態',icon:'🛡️',cost:0,energyGain:8,actionType:'self',effects:[{type:'status',category:'buff',duration:1,modifiers:[{target:'damageTaken',operation:'add',value:-.5}]}],description:'本回合承受傷害減半，並回復8能量。'},
 {id:'focus',name:'專注',icon:'🎯',cost:10,actionType:'self',effects:[{type:'status',category:'buff',duration:99,modifiers:[{target:'nextAttackMultiplier',operation:'add',value:.4}]}],description:'下一次造成傷害的攻擊×1.40；命中後消耗。'}
]);

function formalDescription(skill){
  if(skill.description)return skill.description;
  const bits=[];
  if(skill.aoe)bits.push('全體');
  if(skill.multiplier)bits.push(`${Math.round(Number(skill.multiplier)*100)}%傷害`);
  if(skill.effect?.turns)bits.push(`${skill.effect.turns}回合效果`);
  if(skill.status?.type)bits.push(`附加 ${skill.status.type}`);
  if(skill.special)bits.push('職業特殊技能');
  return bits.join('｜')||'正式職業技能';
}

export async function formalClassSkillSet(className){
  const db=await ensureContentDatabase(),list=db?.formalClassSkills?.[className]||[];
  return list.map(skill=>({...skill,formalClass:true,runtimeReady:formalSkillRuntimeReady(skill),description:formalDescription(skill)}));
}

export async function availableBattleSkills(){
  const db=await ensureContentDatabase(),h=getGame().hero||{};
  if(!db)return FALLBACK;
  if(h.jobAwakened&&db.formalClassSkills?.[h.heroClass]){
    const list=await formalClassSkillSet(h.heroClass),map=new Map(list.map(s=>[s.id,s]));
    let ids=(h.equippedSkills||[]).filter(id=>map.has(id)&&map.get(id).runtimeReady).slice(0,4);
    if(!ids.length)ids=list.filter(s=>s.runtimeReady).slice(0,4).map(s=>s.id);
    return ids.map(id=>map.get(id)).filter(Boolean);
  }
  const all=[...(db.beginner||[]),...Object.values(db.jobs||{})],map=new Map(all.map(s=>[s.id,s]));
  const known=new Set([...(h.knownSkills||[]),...(h.skills||[])]);
  let ids=(h.equippedSkills||[]).filter(id=>known.has(id)&&map.has(id)).slice(0,4);
  if(!ids.length)ids=(db.beginner||FALLBACK).map(s=>s.id).slice(0,4);
  const result=ids.map(id=>map.get(id)).filter(Boolean);
  return result.length?result:FALLBACK;
}

export async function formalLoadoutSnapshot(){
  const h=getGame().hero||{};
  if(!h.jobAwakened)return{className:'',skills:[],equipped:[]};
  const skills=await formalClassSkillSet(h.heroClass),valid=new Set(skills.map(s=>s.id));
  let equipped=(h.equippedSkills||[]).filter(id=>valid.has(id)).slice(0,4);
  if(!equipped.length)equipped=skills.filter(s=>s.runtimeReady).slice(0,4).map(s=>s.id);
  return{className:h.heroClass,skills,equipped};
}

export async function toggleFormalSkill(skillId){
  const snap=await formalLoadoutSnapshot(),skill=snap.skills.find(s=>s.id===skillId);
  if(!skill)return{ok:false,message:'找不到這個職業技能。'};
  if(!skill.runtimeReady)return{ok:false,message:'這招的特殊機制尚未搬入 2.0 Runtime。'};
  const eq=new Set(snap.equipped);
  if(eq.has(skillId))eq.delete(skillId);
  else{
    if(eq.size>=4)return{ok:false,message:'最多只能裝備 4 個技能。'};
    eq.add(skillId);
  }
  update(()=>{getGame().hero.equippedSkills=[...eq]});
  return{ok:true,message:`已裝備 ${eq.size}/4 個技能。`,equipped:[...eq]};
}

export { FALLBACK as BEGINNER_SKILLS };
