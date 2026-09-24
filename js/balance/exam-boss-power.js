import {heroPower,taskPower} from "../progression/ability-engine.js";
import {studyMinutesUntil} from "../schedule/schedule-service.js";
const LEARNING=new Set(["study","exam_paper","school_reading","extra_reading"]);
const TARGET=.75,MIN_POWER=18;
function taskMinutes(t){return t.taskType==="timer"?Math.max(10,Number(t.standardMinutes)||Number(t.fastMinutes)||40):40;}
function subjectRates(state,ids){
 const pools=Object.fromEntries(ids.map(id=>[id,[]]));const untagged=[];
 state.tasks.filter(t=>t.active!==false&&LEARNING.has(t.category)).forEach(t=>{const rate=taskPower(t)/(taskMinutes(t)/60);if(rate<=0)return;(t.subjectId&&pools[t.subjectId]?pools[t.subjectId]:untagged).push(rate);});
 const fallback=Math.max(.5,taskPower({rewardMode:"auto",category:"study",difficulty:"normal",taskType:"timer"})/(40/60));
 const shared=untagged.length?untagged.reduce((a,b)=>a+b,0)/untagged.length:fallback;
 return Object.fromEntries(ids.map(id=>[id,pools[id].length?pools[id].reduce((a,b)=>a+b,0)/pools[id].length:shared]));
}
export function examBossPower(state,event){
 const old=state.examBossLocks[event.id];if(old)return old.power;
 const ids=state.subjects.map(s=>s.id),minutes=studyMinutesUntil(state,event.date,ids),rates=subjectRates(state,ids);
 if(!state.examBaseline)state.examBaseline={date:state.semester.startDate,nakedPower:heroPower(state.hero)};
 const growth=ids.reduce((n,id)=>n+(minutes[id]/60)*(rates[id]||0)*TARGET,0);
 const multiplier=event.type==="final"?1.20:1.10;
 const power=Math.max(MIN_POWER,Math.round((Math.max(1,state.examBaseline.nakedPower)+growth)*multiplier));
 state.examBossLocks[event.id]={power,baselineNakedPower:state.examBaseline.nakedPower,subjectMinutes:{...minutes}};
 return power;
}
export function examEnergy(state,event){
 const ids=state.subjects.map(s=>s.id),minutes=studyMinutesUntil(state,event.date,ids),rates=subjectRates(state,ids);
 let target=state.examEnergyTargets[event.id];
 if(!target){target={required:Object.fromEntries(ids.map(id=>[id,(minutes[id]/60)*(rates[id]||0)*TARGET]))};state.examEnergyTargets[event.id]=target;}
 const byCourse=Object.fromEntries(ids.map(id=>[id,{approved:0,required:target.required[id]||0}]));
 for(const r of state.taskRecords){if(r.date<state.semester.startDate||r.date>event.date||r.status!=="completed"||r.approvalStatus==="rejected"||r.approvalStatus==="pending")continue;
  const t=state.tasks.find(x=>x.id===r.taskId)||r.taskSnapshot;if(!t||!LEARNING.has(t.category))continue;
  const points=taskPower(t)*(Number(r.approvalRatio??1));if(t.subjectId&&byCourse[t.subjectId])byCourse[t.subjectId].approved+=points;
  else {const share=points/ids.length;ids.forEach(id=>byCourse[id].approved+=share);}
 }
 return byCourse;
}