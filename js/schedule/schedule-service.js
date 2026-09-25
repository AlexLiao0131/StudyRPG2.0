import {weekday} from "../core/date.js";
export function coursesForDate(state,date){const wd=weekday(date);return state.schedule.filter(x=>x.weekday===wd);}
export function studyMinutesUntil(state,endDate,subjectIds,startDate=state.semester.startDate){
 const out=Object.fromEntries(subjectIds.map(id=>[id,0]));let d=new Date(`${startDate}T12:00:00`),end=new Date(`${endDate}T12:00:00`);
 for(;d<=end;d.setDate(d.getDate()+1)){const wd=d.getDay();for(const row of state.schedule)if(row.weekday===wd&&out[row.subjectId]!==undefined)out[row.subjectId]+=Number(row.minutes)||0;}
 return out;
}