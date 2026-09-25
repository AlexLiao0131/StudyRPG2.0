import { APP_CONFIG } from '../data/app-config.js';
import { createDefaultState } from '../data/default-state.js';

function clone(v){ return JSON.parse(JSON.stringify(v)); }
function safeParse(raw){ try{return JSON.parse(raw)}catch{return null} }

export function readLegacyState(){
  const family=safeParse(localStorage.getItem(APP_CONFIG.legacyFamilyKey));
  if(family?.profiles?.length){
    const copy=clone(family);
    const active=sessionStorage.getItem('activeHeroProfile')||copy.activeProfileId||copy.profiles[0].id;
    copy.activeProfileId=copy.profiles.some(p=>p.id===active)?active:copy.profiles[0].id;
    copy.examSubjects=Array.isArray(copy.examSubjects)&&copy.examSubjects.length?copy.examSubjects:[{id:'chinese',name:'國語'},{id:'english',name:'英語'},{id:'math',name:'數學'}];
    copy.schoolTimetable=Array.isArray(copy.schoolTimetable)?copy.schoolTimetable:[];
    copy.adventureCalendar=Array.isArray(copy.adventureCalendar)?copy.adventureCalendar:[];
    return {schemaVersion:2,source:'1.0-localStorage-readonly',importedAt:new Date().toISOString(),family:copy};
  }
  const single=safeParse(localStorage.getItem(APP_CONFIG.legacySingleKey));
  if(single?.hero){
    const state=createDefaultState();
    state.source='1.0-single-save-readonly';state.importedAt=new Date().toISOString();
    state.family.profiles[0].data=clone(single);state.family.profiles[0].label=single.hero.name||'勇者';
    return state;
  }
  return null;
}
