import { APP_CONFIG } from '../data/app-config.js';
import { getGame } from '../core/store.js';
const FALLBACK=Object.freeze([
 {id:'power_strike',name:'奮力一擊',icon:'💥',cost:20,actionType:'melee',effects:[{type:'damage',damageType:'physical',source:'attack',multiplier:1.6}],description:'ATK×1.60－敵DEF×0.5 的強力近戰攻擊。'},
 {id:'ember',name:'魔力彈',icon:'🔮',cost:18,actionType:'ranged',effects:[{type:'damage',damageType:'arcane',source:'magicAttack',multiplier:1.45}],description:'MATK×1.45－敵MDEF×0.5 的秘法遠程攻擊。'},
 {id:'defense_stance',name:'防禦姿態',icon:'🛡️',cost:0,energyGain:8,actionType:'self',effects:[{type:'status',category:'buff',duration:1,modifiers:[{target:'damageTaken',operation:'add',value:-.5}]}],description:'本回合承受傷害減半，並回復8能量。'},
 {id:'focus',name:'專注',icon:'🎯',cost:10,actionType:'self',effects:[{type:'status',category:'buff',duration:99,modifiers:[{target:'nextAttackMultiplier',operation:'add',value:.4}]}],description:'下一次造成傷害的攻擊×1.40；命中後消耗。'}
]);
let loading=null;
export async function ensureSkillDatabase(){
 if(window.STUDYRPG_SKILL_DATABASE)return window.STUDYRPG_SKILL_DATABASE;
 if(loading)return loading;
 loading=new Promise(resolve=>{const s=document.createElement('script');s.src=APP_CONFIG.assetBase+'skill-database.js';s.onload=()=>resolve(window.STUDYRPG_SKILL_DATABASE||null);s.onerror=()=>resolve(null);document.head.appendChild(s)});
 return loading;
}
export async function availableBattleSkills(){
 const db=await ensureSkillDatabase();const h=getGame().hero||{};
 if(!db)return FALLBACK;
 const all=[...(db.beginner||[]),...Object.values(db.jobs||{})],map=new Map(all.map(s=>[s.id,s]));
 const known=new Set([...(h.knownSkills||[]),...(h.skills||[])]);
 let ids=(h.equippedSkills||[]).filter(id=>known.has(id)&&map.has(id)).slice(0,4);
 if(!ids.length)ids=(db.beginner||FALLBACK).map(s=>s.id).slice(0,4);
 return ids.map(id=>map.get(id)).filter(Boolean).length?ids.map(id=>map.get(id)).filter(Boolean):FALLBACK;
}
export {FALLBACK as BEGINNER_SKILLS};
