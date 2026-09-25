import { APP_CONFIG } from '../data/app-config.js';
import { createDefaultState } from '../data/default-state.js';
import { readLegacyState } from './legacy-reader.js';

let state=null;
const listeners=new Set();
function clone(v){return JSON.parse(JSON.stringify(v));}
function normalize(s){
  const fallback=createDefaultState();
  if(!s?.family?.profiles?.length)return fallback;
  s.schemaVersion=2;
  s.family.activeProfileId=s.family.activeProfileId||s.family.profiles[0].id;
  s.family.examSubjects=Array.isArray(s.family.examSubjects)&&s.family.examSubjects.length?s.family.examSubjects:fallback.family.examSubjects;
  s.family.schoolTimetable=Array.isArray(s.family.schoolTimetable)?s.family.schoolTimetable:[];
  s.family.adventureCalendar=Array.isArray(s.family.adventureCalendar)?s.family.adventureCalendar:[];
  for(const profile of s.family.profiles){
    profile.data=profile.data||{};const g=profile.data;
    g.hero=g.hero||clone(fallback.family.profiles[0].data.hero);
    g.hero.stats=g.hero.stats||{str:10,agi:10,int:10,will:10};
    g.semester=g.semester||clone(fallback.family.profiles[0].data.semester);
    g.tasks=Array.isArray(g.tasks)?g.tasks:[];g.taskRecords=Array.isArray(g.taskRecords)?g.taskRecords:[];
    g.inventory=Array.isArray(g.inventory)?g.inventory:[];g.shopItems=Array.isArray(g.shopItems)?g.shopItems:[];
    g.examCompletionTargetsV101716=g.examCompletionTargetsV101716||{};
  }
  return s;
}
export function initStore(){
  let saved=null;try{saved=JSON.parse(localStorage.getItem(APP_CONFIG.storageKey))}catch{}
  state=normalize(saved||readLegacyState()||createDefaultState());
  if(!saved)save();
  return state;
}
export function getState(){return state}
export function getFamily(){return state.family}
export function getActiveProfile(){
  const f=getFamily();let p=f.profiles.find(x=>x.id===f.activeProfileId);
  if(!p){p=f.profiles[0];f.activeProfileId=p.id}return p;
}
export function getGame(){return getActiveProfile().data}
export function save(){localStorage.setItem(APP_CONFIG.storageKey,JSON.stringify(state))}
export function update(mutator){mutator(state);save();for(const fn of listeners)fn(state)}
export function subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)}
export function switchProfile(id){if(!getFamily().profiles.some(p=>p.id===id))return false;update(s=>s.family.activeProfileId=id);return true}
export function resetV2(){localStorage.removeItem(APP_CONFIG.storageKey);state=null;return initStore()}
