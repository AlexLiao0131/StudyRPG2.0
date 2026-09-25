import { getGame, update } from '../core/store.js';
import { localDateString, weekdayNumber } from '../core/date.js';
export function isTaskScheduled(t,dateStr=localDateString()){
  if(t.active===false||t.archived)return false;if(Array.isArray(t.cancelledDates)&&t.cancelledDates.includes(dateStr))return false;
  const from=t.activeFrom||t.createdDate||getGame().semester?.startDate||dateStr,until=t.activeUntil||'9999-12-31';if(dateStr<from||dateStr>until)return false;
  if(t.recurring!==true)return dateStr===(t.date||t.createdDate||t.activeFrom||dateStr);const days=Array.isArray(t.weekdays)&&t.weekdays.length?t.weekdays:[1,2,3,4,5,6,0];return days.includes(weekdayNumber(dateStr));
}
export function todayTasks(){return (getGame().tasks||[]).filter(t=>isTaskScheduled(t))}
export function recordsForTaskToday(id){const day=localDateString();return(getGame().taskRecords||[]).filter(r=>r.taskId===id&&r.date===day&&r.status==='completed')}
export function completeSimpleTask(id){
  const day=localDateString(),g=getGame(),t=g.tasks.find(x=>x.id===id);if(!t)return false;if(recordsForTaskToday(id).length>=Math.max(1,Number(t.dailyLimit)||1))return false;
  update(()=>{g.taskRecords.push({id:`r_${Date.now().toString(36)}`,taskId:id,date:day,status:'completed',approvalStatus:'pending',approvalRatio:0,createdAt:new Date().toISOString(),taskSnapshot:JSON.parse(JSON.stringify(t))})});return true;
}
