import { getFamily, getGame, save } from '../core/store.js';
import { localDateString, parseLocalDate } from '../core/date.js';
import { semesterWindowForDate } from '../calendar/calendar-service.js';
import { taskPowerGain } from '../progression/combat-power.js';

const LEARNING_CATEGORIES=new Set(['study','exam_paper','school_reading']);
const TARGET_COMPLETION=.75;

export function examSubjects(){return getFamily().examSubjects||[]}
export function examSubjectById(id){return examSubjects().find(s=>String(s.id)===String(id))||null}
function visibleExamEvents(referenceDate=localDateString()){
  const {startDate,nextStartDate}=semesterWindowForDate(referenceDate),pid=getFamily().activeProfileId;
  if(!startDate)return[];
  return (getFamily().adventureCalendar||[]).filter(e=>
    ['midterm','final'].includes(e.type)&&e.date>=startDate&&(!nextStartDate||e.date<nextStartDate)&&
    (e.targetType!=='selected'||(e.targetProfileIds||[]).includes(pid))
  );
}
export function examEventsForType(type,dateStr=localDateString()){return visibleExamEvents(dateStr).filter(e=>e.type===type).slice().sort((a,b)=>a.date.localeCompare(b.date))}
export function examEventForDate(dateStr=localDateString()){
  return visibleExamEvents(dateStr).find(e=>e.date===dateStr)||null;
}
export function eventSubjectIds(evt){
  const ids=(evt?.examSubjectIds||[]).filter(id=>examSubjectById(id));
  return ids.length?ids:examSubjects().map(s=>s.id);
}
function isHoliday(ds){return (getFamily().adventureCalendar||[]).some(e=>e.date===ds&&e.type==='holiday')}
function studyMinutesUntil(dateStr,ids,startStr=semesterWindowForDate(dateStr).startDate||dateStr){
  const out=Object.fromEntries(ids.map(id=>[id,0])),a=parseLocalDate(startStr),b=parseLocalDate(dateStr);if(b<=a)return out;
  for(let d=new Date(a);d<b;d.setDate(d.getDate()+1)){
    const ds=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if(isHoliday(ds))continue;
    (getFamily().schoolTimetable||[]).forEach(x=>{
      if(Number(x.weekday)===d.getDay()&&ids.includes(x.subjectId))out[x.subjectId]+=Math.max(1,Number(x.minutes)||40)
    });
  }
  return out;
}
function taskMinutes(t){return t.taskType==='timer'?Math.max(10,Number(t.standardMinutes)||Number(t.fastMinutes)||40):40}
function subjectPowerRates(ids){
  const pools=Object.fromEntries(ids.map(id=>[id,[]])),untagged=[];
  (getGame().tasks||[]).filter(t=>t.active!==false&&LEARNING_CATEGORIES.has(t.category)).forEach(t=>{
    const rate=taskPowerGain(t)/(taskMinutes(t)/60);if(rate<=0)return;
    const sid=ids.includes(String(t.courseId||''))?String(t.courseId):'';
    sid?pools[sid].push(rate):untagged.push(rate);
  });
  const fallback=Math.max(.5,taskPowerGain({rewardMode:'auto',category:'study',difficulty:'normal',taskType:'timer'})/(40/60)),
    shared=untagged.length?untagged.reduce((a,b)=>a+b,0)/untagged.length:fallback;
  return Object.fromEntries(ids.map(id=>[id,pools[id].length?pools[id].reduce((a,b)=>a+b,0)/pools[id].length:shared]));
}
function targetSnapshot(evt){
  const g=getGame(),ids=eventSubjectIds(evt),key=String(evt.id||`${evt.type}_${evt.date}`),window=semesterWindowForDate(evt.date),
    sourceSemesterEventId=String(window.event?.id||''),sourceSemesterDate=String(window.startDate||evt.date);
  g.examCompletionTargets=g.examCompletionTargets||{};let snap=g.examCompletionTargets[key];
  const same=snap&&snap.sourceSemesterEventId===sourceSemesterEventId&&snap.sourceSemesterDate===sourceSemesterDate&&snap.examDate===evt.date&&Array.isArray(snap.subjectIds)&&ids.every(id=>snap.subjectIds.includes(id))&&snap.subjectIds.length===ids.length;
  if(!same){
    const minutes=studyMinutesUntil(evt.date,ids,sourceSemesterDate),rates=subjectPowerRates(ids),
      required=Object.fromEntries(ids.map(id=>[id,Math.max(0,(minutes[id]/60)*(rates[id]||0)*TARGET_COMPLETION)]));
    snap={sourceSemesterEventId,sourceSemesterDate,examDate:evt.date,subjectIds:[...ids],minutes,rates,required,createdAt:new Date().toISOString()};
    g.examCompletionTargets[key]=snap;save();
  }
  return snap;
}
function approvalRatio(r){
  if(r?.approvalStatus==='pending'||r?.approvalStatus==='rejected')return 0;
  if(Number.isFinite(Number(r?.approvalRatio)))return Math.max(0,Math.min(1,Number(r.approvalRatio)));
  return r?.approvalStatus==='approved'?1:0;
}
function courseShares(t,ids){
  const direct=ids.includes(String(t?.courseId||''))?String(t.courseId):'';if(direct)return{[direct]:1};
  if(!LEARNING_CATEGORIES.has(t?.category)||t?.courseId)return{};
  return Object.fromEntries(ids.map(id=>[id,1/Math.max(1,ids.length)]));
}
export function examEnergyReport(evt){
  if(!evt)return{required:0,approved:0,ratio:0,byCourse:{}};
  const g=getGame(),ids=eventSubjectIds(evt),base=semesterWindowForDate(evt.date).startDate||evt.date,
    end=localDateString()<evt.date?localDateString():evt.date,snap=targetSnapshot(evt),
    byCourse=Object.fromEntries(ids.map(id=>[id,{name:examSubjectById(id)?.name||id,approved:0,required:Math.max(0,Number(snap.required?.[id])||0)}]));
  (g.taskRecords||[]).forEach(r=>{
    if(!r?.date||r.date<base||r.date>end||r.voluntaryChallenge===true)return;
    const ratio=approvalRatio(r);if(ratio<=0)return;
    const t=(g.tasks||[]).find(x=>x.id===r.taskId)||r.taskSnapshot;if(!t)return;
    const points=taskPowerGain(t)*ratio;
    for(const [id,share] of Object.entries(courseShares(t,ids)))byCourse[id].approved+=points*share;
  });
  const required=Object.values(byCourse).reduce((n,x)=>n+x.required,0),
    approved=Object.values(byCourse).reduce((n,x)=>n+x.approved,0);
  return{required,approved,ratio:required?Math.min(1.2,approved/required):0,byCourse};
}
export function energyStage(r){
  const ratio=(Number(r?.required)||0)>0?Number(r.approved||0)/Number(r.required):0;
  return ratio>=1?1:ratio>=.8?.8:ratio>=.5?.5:0;
}
export function energyStageText(stage){
  return stage>=1?'✨ 完全破盾':stage>=.8?'💥 重度破盾（80%效果）':stage>=.5?'⚡ 護盾裂痕（50%效果）':'護盾尚未削弱';
}
