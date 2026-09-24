import {weekday} from "../core/date.js";
import {uid} from "../core/ids.js";
export function scheduled(task,date){
 if(!task||task.active===false)return false;
 if(task.activeFrom&&date<task.activeFrom)return false;
 if(task.activeUntil&&date>task.activeUntil)return false;
 if(task.cancelledDates?.includes(date))return false;
 if(task.recurring===true)return (task.weekdays?.length?task.weekdays:[1,2,3,4,5,6,0]).includes(weekday(date));
 return date===(task.date||task.activeFrom);
}
export function tasksForDate(state,date){return state.tasks.filter(t=>scheduled(t,date));}
export function occurrenceKey(taskId,date){return `${taskId}@${date}`;}
export function occurrence(state,taskId,date){return state.occurrences[occurrenceKey(taskId,date)]||{taskId,date,status:"pending"};}
export function completeTask(state,task,date,ratio=1){
 const key=occurrenceKey(task.id,date);const old=state.occurrences[key];
 if(old?.status==="completed")return null;
 const rec={id:uid("rec"),taskId:task.id,date,status:"completed",approvalStatus:"approved",approvalRatio:ratio,taskSnapshot:structuredClone(task)};
 state.occurrences[key]={taskId:task.id,date,status:"completed",recordId:rec.id};
 state.taskRecords.push(rec);return rec;
}
export function cancelOccurrence(state,task,date){state.occurrences[occurrenceKey(task.id,date)]={taskId:task.id,date,status:"cancelled"};}
export function effectiveTasksForDate(state,date){return tasksForDate(state,date).filter(t=>occurrence(state,t.id,date).status!=="cancelled");}
