import { getFamily, update } from '../core/store.js';
import { localDateString } from '../core/date.js';

const uid=()=>`cal_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
const clean=v=>String(v??'').trim();
const validDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||''));
const validTime=v=>v===''||/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(v||''));

export function calendarIcon(type){
  return ({
    exam:'📚',school:'🏫',holiday:'🏖️',winter_break_start:'❄️',summer_break_start:'☀️',
    semester_start:'🎒',semester_end:'🏆',sport:'⚽',activity:'🎉',todo:'📌',
    midterm:'👿',final:'🐉',general:'⭐'
  }[type]||'📌');
}

export function calendarTimeText(e={}){
  if(e.allDay!==false)return '全天';
  if(e.startTime&&e.endTime)return `${e.startTime}～${e.endTime}`;
  return e.startTime||'';
}

function eventEndDateTime(e={}){
  if(!e.date)return null;
  const time=e.allDay!==false||!e.endTime?'23:59:59':`${e.endTime}:00`;
  const d=new Date(`${e.date}T${time}`);
  return Number.isNaN(d.getTime())?null:d;
}

export function calendarStatus(e={},profileId=getFamily().activeProfileId){
  if(e.requireComplete===false)return 'info';
  if(e.completedBy?.[profileId])return 'done';
  const end=eventEndDateTime(e);
  return end&&Date.now()>end.getTime()?'overdue':'pending';
}

export function calendarStatusText(e={},profileId=getFamily().activeProfileId){
  const st=calendarStatus(e,profileId);
  return st==='done'?'已完成':st==='overdue'?'逾期未完成':st==='pending'?'待完成':'一般事件';
}

export function visibleCalendar(profileId=getFamily().activeProfileId){
  return (getFamily().adventureCalendar||[])
    .filter(e=>e.targetType!=='selected'||(e.targetProfileIds||[]).includes(profileId))
    .slice()
    .sort((a,b)=>(String(a.date||'')+String(a.startTime||'')).localeCompare(String(b.date||'')+String(b.startTime||'')));
}

export function calendarEventById(id){
  return (getFamily().adventureCalendar||[]).find(e=>String(e.id)===String(id))||null;
}

export function calendarTargetText(e={}){
  if(e.targetType!=='selected')return '所有孩子';
  const f=getFamily(),ids=Array.isArray(e.targetProfileIds)?e.targetProfileIds:[];
  return ids.map(id=>f.profiles.find(p=>String(p.id)===String(id))?.data?.hero?.name||id).join('、')||'未指定';
}

export function isOwnChildCalendarEvent(e={},profileId=getFamily().activeProfileId){
  return e.creatorRole==='child'&&String(e.creatorProfileId)===String(profileId);
}

export function toggleCalendarCompletion(id,profileId=getFamily().activeProfileId){
  let changed=null;
  update(state=>{
    const e=(state.family.adventureCalendar||[]).find(x=>String(x.id)===String(id));
    if(!e||e.requireComplete===false)return;
    e.completedBy=e.completedBy&&typeof e.completedBy==='object'?e.completedBy:{};
    e.completedBy[profileId]=!e.completedBy[profileId];
    changed=!!e.completedBy[profileId];
  });
  return changed===null
    ?{ok:false,message:'這個事件不需要完成確認。'}
    :{ok:true,message:changed?'已標記完成。':'已恢復為未完成。',completed:changed};
}

export function addChildCalendarEvent(input={},profileId=getFamily().activeProfileId){
  const name=clean(input.name),date=clean(input.date),startTime=clean(input.startTime),endTime=clean(input.endTime),note=String(input.note??'').trim();
  if(!name)return{ok:false,message:'請輸入行程名稱。'};
  if(!validDate(date))return{ok:false,message:'日期格式必須是 YYYY-MM-DD。'};
  if(!validTime(startTime)||!validTime(endTime))return{ok:false,message:'時間格式必須是 HH:MM。'};
  if(!startTime&&endTime)return{ok:false,message:'有結束時間時必須先設定開始時間。'};
  let event=null;
  update(state=>{
    state.family.adventureCalendar=Array.isArray(state.family.adventureCalendar)?state.family.adventureCalendar:[];
    event={
      id:uid(),date,name,type:'general',allDay:!startTime,startTime,endTime:startTime?endTime:'',
      note,reminderMinutes:0,targetType:'selected',targetProfileIds:[profileId],
      requireComplete:true,completedBy:{},creatorRole:'child',creatorProfileId:profileId
    };
    state.family.adventureCalendar.push(event);
  });
  return{ok:true,message:'已加入我的行程。',event};
}

export function editChildCalendarEvent(id,input={},profileId=getFamily().activeProfileId){
  const name=clean(input.name),date=clean(input.date),startTime=clean(input.startTime),endTime=clean(input.endTime),note=String(input.note??'').trim();
  if(!name)return{ok:false,message:'請輸入行程名稱。'};
  if(!validDate(date))return{ok:false,message:'日期格式必須是 YYYY-MM-DD。'};
  if(!validTime(startTime)||!validTime(endTime))return{ok:false,message:'時間格式必須是 HH:MM。'};
  if(!startTime&&endTime)return{ok:false,message:'有結束時間時必須先設定開始時間。'};
  let changed=false;
  update(state=>{
    const e=(state.family.adventureCalendar||[]).find(x=>String(x.id)===String(id));
    if(!e||e.creatorRole!=='child'||String(e.creatorProfileId)!==String(profileId))return;
    Object.assign(e,{name,date,startTime,endTime:startTime?endTime:'',allDay:!startTime,note});
    changed=true;
  });
  return changed?{ok:true,message:'行程已修改。'}:{ok:false,message:'只能修改自己建立的行程。'};
}
