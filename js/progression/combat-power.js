import { getGame } from '../core/store.js';
export const POWER_WEIGHT=Object.freeze({str:1.2,agi:1.1,int:1,will:.8,virtue:0});
export const AUTO_TASK_RULES=Object.freeze({study:{int:.67,will:.33},exam_paper:{int:.70,will:.30},sport:{str:.55,agi:.45},music:{agi:.45,int:.35,will:.20},chore:{virtue:.70,will:.30},selfcare:{virtue:.55,will:.45},school_reading:{int:.60,will:.40},extra_reading:{int:.60,will:.40},custom:{will:1}});
export const DIFFICULTY_POINTS=Object.freeze({easy:1,normal:3,hard:4,challenge:5});
export function combatPower(hero=getGame().hero){const s=hero?.stats||{};return Math.floor((s.str||0)*1.2+(s.agi||0)*1.1+(s.int||0)+(s.will||0)*.8)}
export function autoTaskRewards(category='custom',difficulty='normal'){
  const weights=AUTO_TASK_RULES[category]||AUTO_TASK_RULES.custom,budget=DIFFICULTY_POINTS[difficulty]||3,entries=Object.entries(weights).sort((a,b)=>b[1]-a[1]);let used=0;const out={};
  entries.forEach(([k,w],i)=>{const v=i===entries.length-1?budget-used:Math.max(0,Math.round(budget*w));used+=v;if(v)out[k]=(out[k]||0)+v});return out;
}
export function taskPowerGain(t={}){
  const map=t.rewardMode==='auto'?autoTaskRewards(t.category||'custom',t.difficulty||'normal'):(t.manualStatRewards||{[t.fixedStat||'will']:Number(t.fixedStatValue)||0});
  return Object.entries(map).reduce((n,[k,v])=>n+(POWER_WEIGHT[k]||0)*(Number(v)||0),0);
}
