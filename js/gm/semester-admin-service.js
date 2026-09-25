import { getFamily, getGame, update } from '../core/store.js';

const uid=()=>`tt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
const slug=v=>String(v||'').trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g,'_').replace(/^_+|_+$/g,'');
const result=(ok,message,data={})=>({ok,message,...data});
function invalidateAll(){for(const p of getFamily().profiles||[])p.data.examCompletionTargets={}}

export function saveSemesterSettings({startDate,endDate,schoolWeekdays=[]}={}){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(startDate||''))||!/^\d{4}-\d{2}-\d{2}$/.test(String(endDate||'')))return result(false,'請填正確的學期開始與結束日期。');
  if(endDate<startDate)return result(false,'學期結束日期不能早於開始日期。');
  const days=[...new Set((schoolWeekdays||[]).map(Number).filter(n=>n>=0&&n<=6))];if(!days.length)return result(false,'至少要選一個上課日。');
  update(()=>{const g=getGame();g.semester.startDate=startDate;g.semester.endDate=endDate;g.semester.schoolWeekdays=days;invalidateAll()});return result(true,'學期設定已儲存。');
}
export function addExamSubject(name,id=''){
  name=String(name||'').trim();if(!name)return result(false,'請輸入科目名稱。');let subject=null;
  update(()=>{const f=getFamily();const base=slug(id||name)||`subject_${Date.now().toString(36)}`;let sid=base,n=2;while(f.examSubjects.some(s=>s.id===sid))sid=`${base}_${n++}`;subject={id:sid,name};f.examSubjects.push(subject);invalidateAll()});return result(true,'科目已新增。',{subject});
}
export function removeExamSubject(id){
  const f=getFamily();if((f.schoolTimetable||[]).some(x=>String(x.subjectId)===String(id)))return result(false,'這個科目仍在課表中，請先移除課表時段。');
  if((f.adventureCalendar||[]).some(e=>(e.examSubjectIds||[]).includes(id)))return result(false,'這個科目仍被考試事件使用，請先修改考試事件。');
  if((f.examSubjects||[]).length<=1)return result(false,'至少保留一個科目。');let removed=false;
  update(()=>{const fam=getFamily(),before=fam.examSubjects.length;fam.examSubjects=fam.examSubjects.filter(s=>String(s.id)!==String(id));removed=fam.examSubjects.length<before;invalidateAll()});return removed?result(true,'科目已刪除。'):result(false,'找不到科目。');
}
export function addTimetableEntry({weekday,subjectId,minutes}={}){
  weekday=Number(weekday);minutes=Math.max(1,Number(minutes)||40);const f=getFamily();if(!Number.isInteger(weekday)||weekday<0||weekday>6)return result(false,'星期設定不正確。');if(!(f.examSubjects||[]).some(s=>String(s.id)===String(subjectId)))return result(false,'找不到課表科目。');let row=null;
  update(()=>{row={id:uid(),weekday,subjectId:String(subjectId),minutes};getFamily().schoolTimetable.push(row);invalidateAll()});return result(true,'課表時段已新增。',{row});
}
export function removeTimetableEntry(id){let removed=false;update(()=>{const f=getFamily(),before=f.schoolTimetable.length;f.schoolTimetable=f.schoolTimetable.filter(x=>String(x.id)!==String(id));removed=f.schoolTimetable.length<before;invalidateAll()});return removed?result(true,'課表時段已刪除。'):result(false,'找不到課表時段。');
}
