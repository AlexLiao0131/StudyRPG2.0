import { localDateString, parseLocalDate } from '../core/date.js';
import { getFamily, getGame } from '../core/store.js';
import { WEEKLY_WORLDS, monsterName } from './world-database.js';

export function activeSemesterStartDate(dateStr=localDateString()){
  const family=getFamily(),profileId=family?.activeProfileId,starts=(family?.adventureCalendar||[]).filter(e=>e?.type==='semester_start'&&e.date&&e.date<=dateStr&&(e.targetType!=='selected'||(e.targetProfileIds||[]).includes(profileId))).slice().sort((a,b)=>(a.date+String(a.id||'')).localeCompare(b.date+String(b.id||'')));
  return starts.at(-1)?.date||getGame().semester?.startDate||dateStr;
}
export function semesterWeekIndex(dateStr=localDateString()){
  const start=parseLocalDate(activeSemesterStartDate(dateStr)),now=parseLocalDate(dateStr);
  return Math.max(1,Math.floor((now-start)/604800000)+1);
}
export function worldForWeek(week){return WEEKLY_WORLDS.find(x=>x.week===Number(week))||null}
export function worldForDate(dateStr=localDateString()){return worldForWeek(semesterWeekIndex(dateStr))}
export function dailyMonsterIndex(dateStr=localDateString()){
  const d=parseLocalDate(dateStr).getDay();return d===0||d===6?4:Math.max(0,Math.min(4,d-1));
}
export function encounterForDate(dateStr=localDateString()){
  const world=worldForDate(dateStr);if(!world||world.noBattle)return null;
  const monsterId=world.monsters[dailyMonsterIndex(dateStr)]||null;
  return monsterId?{monsterId,name:monsterName(monsterId),world}:null;
}
