import { APP_CONFIG } from '../data/app-config.js';
import { createDefaultState } from '../data/default-state.js';
import { readLegacyState } from './legacy-reader.js';

let state=null;
const listeners=new Set();
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
const arr=v=>Array.isArray(v)?clone(v):[];
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?clone(v):{};

function normalizeHero(raw={},fallback={}){
  const stats=raw.stats&&typeof raw.stats==='object'?raw.stats:{};
  return {
    ...fallback,
    name:String(raw.name||fallback.name||'勇者'),gender:raw.gender==='female'?'female':'male',
    heroClass:String(raw.heroClass||fallback.heroClass||'見習勇者'),jobAwakened:!!raw.jobAwakened,
    level:Math.max(1,Number(raw.level)||1),exp:Math.max(0,Number(raw.exp)||0),maxExp:Math.max(1,Number(raw.maxExp)||100),
    gold:Math.max(0,Number(raw.gold)||0),lotteryCoins:Math.max(0,Number(raw.lotteryCoins)||0),virtue:Math.max(0,Number(raw.virtue)||0),
    stats:{str:Number(stats.str)||0,agi:Number(stats.agi)||0,int:Number(stats.int)||0,will:Number(stats.will)||0},
    jobScores:obj(raw.jobScores),knownSkills:arr(raw.knownSkills),skills:arr(raw.skills),equippedSkills:arr(raw.equippedSkills),
    jobPassive:String(raw.jobPassive||''),pendingGoldDebt:Math.max(0,Number(raw.pendingGoldDebt)||0),lastStatGains:obj(raw.lastStatGains),equipment:obj(raw.equipment||fallback.equipment)
  };
}

function normalizeGame(raw={},fallback={}){
  const tombstones=obj(raw.inventoryTombstones),inventory=arr(raw.inventory).filter(inv=>!inv?.id||!Object.prototype.hasOwnProperty.call(tombstones,String(inv.id)));
  const sem=raw.semester&&typeof raw.semester==='object'?raw.semester:{};
  const settings=raw.settings&&typeof raw.settings==='object'?raw.settings:{};
  return {
    ...fallback,
    hero:normalizeHero(raw.hero||{},fallback.hero||{}),
    semester:{
      ...fallback.semester,
      startDate:String(sem.startDate||fallback.semester?.startDate||''),endDate:String(sem.endDate||fallback.semester?.endDate||''),
      schoolWeekdays:Array.isArray(sem.schoolWeekdays)?sem.schoolWeekdays.map(Number):clone(fallback.semester?.schoolWeekdays||[1,2,3,4,5]),
      worldState:String(sem.worldState||fallback.semester?.worldState||'normal')
    },
    tasks:arr(raw.tasks),taskRecords:arr(raw.taskRecords),activeTasks:obj(raw.activeTasks),learningProgress:arr(raw.learningProgress),
    inventory,inventoryTombstones:tombstones,shopItems:arr(raw.shopItems),lotteryPool:arr(raw.lotteryPool),lotteryCoinLedger:obj(raw.lotteryCoinLedger),couponRequests:arr(raw.couponRequests),battleRecords:arr(raw.battleRecords),gmAudit:arr(raw.gmAudit),semesterArchives:arr(raw.semesterArchives),campaignProgress:obj(raw.campaignProgress),
    social:{friends:arr(raw.social?.friends),inbox:arr(raw.social?.inbox)},
    settings:{parentPinHash:String(settings.parentPinHash||''),cloud:obj(settings.cloud),familyAccess:obj(settings.familyAccess||{enabled:true}),holidayTower:obj(settings.holidayTower||{dailyLimit:3})},
    dailyBalance:clone(raw.dailyBalance||raw.dailyBalanceV10114||null),
    examBossBaseline:clone(raw.examBossBaseline||raw.examBossBaselineV10158||fallback.examBossBaseline),
    examCompletionTargets:obj(raw.examCompletionTargets||raw.examCompletionTargetsV101716)
  };
}

function normalize(raw){
  const fallback=createDefaultState();
  if(!raw?.family?.profiles?.length)return fallback;
  const profiles=raw.family.profiles.map((p,i)=>({
    id:String(p.id||`hero_${i+1}`),label:String(p.label||p.data?.hero?.name||`勇者${i+1}`),
    data:normalizeGame(p.data||{},fallback.family.profiles[0].data)
  }));
  const active=String(raw.family.activeProfileId||profiles[0].id);
  return {
    schemaVersion:APP_CONFIG.schemaVersion,source:String(raw.source||'2.0-local'),importedAt:String(raw.importedAt||''),
    family:{
      activeProfileId:profiles.some(p=>p.id===active)?active:profiles[0].id,
      profiles,
      examSubjects:Array.isArray(raw.family.examSubjects)&&raw.family.examSubjects.length?arr(raw.family.examSubjects):clone(fallback.family.examSubjects),
      schoolTimetable:Array.isArray(raw.family.schoolTimetable)?arr(raw.family.schoolTimetable):clone(fallback.family.schoolTimetable),
      adventureCalendar:Array.isArray(raw.family.adventureCalendar)?arr(raw.family.adventureCalendar):clone(fallback.family.adventureCalendar),
      access:obj(raw.family.access)
    }
  };
}

export function initStore(){
  let saved=null;try{saved=JSON.parse(localStorage.getItem(APP_CONFIG.storageKey))}catch{}
  state=normalize(saved||readLegacyState()||createDefaultState());
  save();
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
export function update(mutator){mutator(state);save();for(const fn of [...listeners])fn(state)}
export function subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)}
export function switchProfile(id){if(!getFamily().profiles.some(p=>p.id===id))return false;update(s=>s.family.activeProfileId=id);return true}
export function resetV2(){localStorage.removeItem(APP_CONFIG.storageKey);state=null;return initStore()}
