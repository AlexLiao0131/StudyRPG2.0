import { getFamily, update } from '../core/store.js';

const uid=()=>`cal_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
const result=(ok,message,data={})=>({ok,message,...data});
function invalidateAll(){for(const p of getFamily().profiles||[])p.data.examCompletionTargets={}}
function normalize(input={},existing=null){
  const date=String(input.date||''),name=String(input.name||'').trim(),type=String(input.type||'general');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!name)throw new Error('請填日期與事件名稱。');
  const allDay=input.allDay!==false,targetType=input.targetType==='selected'?'selected':'all',targets=targetType==='selected'?[...new Set(input.targetProfileIds||[])]:[];
  if(targetType==='selected'&&!targets.length)throw new Error('指定孩子時至少要選一位。');
  const exam=type==='midterm'||type==='final',subjects=exam?[...new Set(input.examSubjectIds||[])]:[];if(exam&&!subjects.length)throw new Error('考試事件至少要選一個科目。');
  return {...(existing||{}),id:existing?.id||uid(),date,name,type,examSubjectIds:subjects,allDay,startTime:allDay?'':String(input.startTime||''),endTime:allDay?'':String(input.endTime||''),note:String(input.note||'').trim(),reminderMinutes:Math.max(0,Number(input.reminderMinutes)||0),targetType,targetProfileIds:targets,requireComplete:!!input.requireComplete,completedBy:existing?.completedBy&&typeof existing.completedBy==='object'?existing.completedBy:{},creatorRole:existing?.creatorRole||'parent',creatorProfileId:existing?.creatorProfileId||'parent'};
}
export function saveCalendarEvent(input,{editingId=''}={}){let event=null;try{update(()=>{const f=getFamily(),existing=editingId?(f.adventureCalendar||[]).find(e=>String(e.id)===String(editingId)):null;event=normalize(input,existing||null);if(existing)Object.assign(existing,event);else f.adventureCalendar.push(event);invalidateAll()})}catch(e){return result(false,e?.message||'行事曆儲存失敗。')}return result(true,editingId?'事件已更新。':'事件已新增。',{event})}
export function deleteCalendarEvent(id){let removed=false;update(()=>{const f=getFamily(),before=f.adventureCalendar.length;f.adventureCalendar=f.adventureCalendar.filter(e=>String(e.id)!==String(id));removed=f.adventureCalendar.length<before;if(removed)invalidateAll()});return removed?result(true,'事件已刪除。'):result(false,'找不到事件。')}
