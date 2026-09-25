import { getFamily } from '../core/store.js';
import { localDateString } from '../core/date.js';
export function calendarIcon(type){return ({semester_start:'🏁',semester_end:'🏆',midterm:'👿',final:'🐉',holiday:'🏖️',activity:'🎪',general:'📅'}[type]||'📅')}
export function calendarStatus(e){const done=e.requireComplete&&e.completedBy&&Object.values(e.completedBy).some(Boolean);if(done)return'done';if(e.requireComplete&&e.date<localDateString())return'overdue';return e.date===localDateString()?'current':'future'}
export function visibleCalendar(){return (getFamily().adventureCalendar||[]).slice().sort((a,b)=>(a.date+(a.startTime||'')).localeCompare(b.date+(b.startTime||'')))}
