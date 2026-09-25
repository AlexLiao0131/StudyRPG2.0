import { getFamily } from '../core/store.js';
import { localDateString } from '../core/date.js';
export function calendarIcon(type){return ({semester_start:'🏁',semester_end:'🏆',midterm:'👿',final:'🐉',holiday:'🏖️',activity:'🎪',general:'📅'}[type]||'📅')}
export function calendarStatus(e,profileId=getFamily().activeProfileId){const done=e.requireComplete&&!!e.completedBy?.[profileId];if(done)return'done';if(e.requireComplete&&e.date<localDateString())return'overdue';return e.date===localDateString()?'current':'future'}
export function visibleCalendar(profileId=getFamily().activeProfileId){return (getFamily().adventureCalendar||[]).filter(e=>e.targetType!=='selected'||(e.targetProfileIds||[]).includes(profileId)).slice().sort((a,b)=>(a.date+(a.startTime||'')).localeCompare(b.date+(b.startTime||'')))}
