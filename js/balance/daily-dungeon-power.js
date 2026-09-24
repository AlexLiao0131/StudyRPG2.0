import {heroPower,taskPower} from "../progression/ability-engine.js";
import {effectiveTasksForDate} from "../tasks/task-service.js";
export function dailyPlan(state,date){
 const tasks=effectiveTasksForDate(state,date);let planned=0,credited=0;
 for(const t of tasks){const unit=taskPower(t),limit=Math.max(1,Number(t.dailyLimit)||1);planned+=unit*limit;
  const recs=state.taskRecords.filter(r=>r.date===date&&r.taskId===t.id&&r.status==="completed");
  credited+=Math.min(unit*limit,recs.reduce((n,r)=>n+unit*(Number(r.approvalRatio??1)),0));
 }
 return {tasks,planned,credited};
}
export function ensureDailySnapshot(state,date,isFridayBoss=false){
 const plan=dailyPlan(state,date),live=Math.max(1,heroPower(state.hero)),position=isFridayBoss?.7:.5;
 let snap=state.dailyBalanceSnapshots[date];
 if(snap){
  if(plan.planned>snap.plannedTaskPower){const delta=plan.planned-snap.plannedTaskPower;snap.referencePower+=delta*position;snap.plannedTaskPower=plan.planned;snap.maximumTaskPower=snap.baseCombatPower+plan.planned;}
  return snap;
 }
 const base=Math.max(1,live-plan.credited),maximum=base+plan.planned,reference=base+(maximum-base)*position;
 snap={date,baseCombatPower:base,maximumTaskPower:maximum,plannedTaskPower:plan.planned,creditedTaskPower:plan.credited,referencePower:Math.max(18,Math.round(reference)),balancePosition:position};
 state.dailyBalanceSnapshots[date]=snap;return snap;
}