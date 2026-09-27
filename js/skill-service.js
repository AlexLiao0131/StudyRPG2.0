import { getGame, update } from '../core/store.js';
import { ensureContentDatabase } from '../data/content-provider.js';
import { formalSkillRuntimeReady } from './formal-class-runtime.js';

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
  // Skill Database 是唯一技能定義來源。載入失敗時寧可沒有技能，也不能偷偷使用第二份數值。
  if(!db)return[];
  if(h.jobAwakened&&db.formalClassSkills?.[h.heroClass]){
    const list=await formalClassSkillSet(h.heroClass),map=new Map(list.map(s=>[s.id,s]));
    let ids=(h.equippedSkills||[]).filter(id=>map.has(id)&&map.get(id).runtimeReady).slice(0,4);
    if(!ids.length)ids=list.filter(s=>s.runtimeReady).slice(0,4).map(s=>s.id);
    return ids.map(id=>map.get(id)).filter(Boolean);
  }
  const all=[...(db.beginner||[]),...Object.values(db.jobs||{})],map=new Map(all.map(s=>[s.id,s]));
  const known=new Set([...(h.knownSkills||[]),...(h.skills||[])]);
  let ids=(h.equippedSkills||[]).filter(id=>known.has(id)&&map.has(id)).slice(0,4);
  if(!ids.length)ids=(db.beginner||[]).map(s=>s.id).slice(0,4);
  return ids.map(id=>map.get(id)).filter(Boolean);
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

// 相容舊 import；不再保存第二份技能定義。
export const BEGINNER_SKILLS=Object.freeze([]);
