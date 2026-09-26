import { APP_CONFIG } from '../data/app-config.js';
import { createDefaultState } from '../data/default-state.js';
import { readLegacyState, migrateLegacyFamilySnapshot, migrateLegacyGameSnapshot } from './legacy-reader.js';

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
    jobPassive:String(raw.jobPassive||''),skillUsage:obj(raw.skillUsage),skillUsageByDate:obj(raw.skillUsageByDate),jobCandidateHistory:arr(raw.jobCandidateHistory),
    pendingGoldDebt:Math.max(0,Number(raw.pendingGoldDebt)||0),lastStatGains:obj(raw.lastStatGains),equipment:obj(raw.equipment||fallback.equipment)
  };
}

function normalizeGame(raw={},fallback={}){
  const tombstones=obj(raw.inventoryTombstones),inventory=arr(raw.inventory).filter(inv=>!inv?.id||!Object.prototype.hasOwnProperty.call(tombstones,String(inv.id)));
  const sem=raw.semester&&typeof raw.semester==='object'?raw.semester:{},settings=raw.settings&&typeof raw.settings==='object'?raw.settings:{};
  return {
    ...fallback,hero:normalizeHero(raw.hero||{},fallback.hero||{}),
    semester:{...fallback.semester,startDate:String(sem.startDate||fallback.semester?.startDate||''),endDate:String(sem.endDate||fallback.semester?.endDate||''),schoolWeekdays:Array.isArray(sem.schoolWeekdays)?sem.schoolWeekdays.map(Number):clone(fallback.semester?.schoolWeekdays||[1,2,3,4,5]),worldState:String(sem.worldState||fallback.semester?.worldState||'normal')},
    tasks:arr(raw.tasks),taskRecords:arr(raw.taskRecords),activeTasks:obj(raw.activeTasks),learningProgress:arr(raw.learningProgress),
    inventory,inventoryTombstones:tombstones,shopItems:arr(raw.shopItems),lotteryPool:arr(raw.lotteryPool),lotteryCoinLedger:obj(raw.lotteryCoinLedger),assetAudit:obj(raw.assetAudit),couponRequests:arr(raw.couponRequests),battleRecords:arr(raw.battleRecords),gmAudit:arr(raw.gmAudit),semesterArchives:arr(raw.semesterArchives),campaignProgress:obj(raw.campaignProgress),
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
  const profiles=raw.family.profiles.map((p,i)=>({id:String(p.id||`hero_${i+1}`),label:String(p.label||p.data?.hero?.name||`勇者${i+1}`),data:normalizeGame(p.data||{},fallback.family.profiles[0].data)}));
  const active=String(raw.family.activeProfileId||profiles[0].id);
  return {
    schemaVersion:APP_CONFIG.schemaVersion,source:String(raw.source||'2.0-local'),importedAt:String(raw.importedAt||''),
    family:{
      activeProfileId:profiles.some(p=>p.id===active)?active:profiles[0].id,profiles,
      examSubjects:Array.isArray(raw.family.examSubjects)&&raw.family.examSubjects.length?arr(raw.family.examSubjects):clone(fallback.family.examSubjects),
      schoolTimetable:Array.isArray(raw.family.schoolTimetable)?arr(raw.family.schoolTimetable):clone(fallback.family.schoolTimetable),
      adventureCalendar:Array.isArray(raw.family.adventureCalendar)?arr(raw.family.adventureCalendar):clone(fallback.family.adventureCalendar),
      access:obj(raw.family.access),legacySeasonId:String(raw.family.legacySeasonId||APP_CONFIG.legacySeasonId)
    }
  };
}

const rowKey=(x,i)=>x?.id!=null?`id:${x.id}`:x?.date&&x?.taskId?`task:${x.date}:${x.taskId}:${x.voluntaryChallenge?'v':'n'}`:`json:${JSON.stringify(x)}:${i}`;
function mergeRows(local=[],remote=[]){
  const out=[],seen=new Set();
  (Array.isArray(remote)?remote:[]).forEach((x,i)=>{const k=rowKey(x,i);if(!seen.has(k)){out.push(clone(x));seen.add(k)}});
  (Array.isArray(local)?local:[]).forEach((x,i)=>{const k=rowKey(x,i);if(!seen.has(k)){out.push(clone(x));seen.add(k)}});
  return out;
}
function mergeCounterMap(local={},remote={}){
  const out={...obj(local)};
  for(const[k,v]of Object.entries(obj(remote)))out[k]=Math.max(Number(out[k])||0,Number(v)||0);
  return out;
}
function mergeUsageByDate(local={},remote={}){
  const out=clone(obj(local));
  for(const[day,row]of Object.entries(obj(remote)))out[day]=mergeCounterMap(out[day],row);
  return out;
}
function mergeCandidateHistory(local=[],remote=[]){
  const m=new Map();
  for(const row of [...arr(local),...arr(remote)])if(row&&Number.isFinite(Number(row.week)))m.set(Number(row.week),clone(row));
  return [...m.values()].sort((a,b)=>Number(a.week)-Number(b.week));
}
function deepMerge(remote,local){
  if(Array.isArray(remote)||Array.isArray(local))return clone(local??remote);
  if(remote&&typeof remote==='object'&&local&&typeof local==='object'){
    const out=clone(remote);
    for(const[k,v]of Object.entries(local))out[k]=k in out?deepMerge(out[k],v):clone(v);
    return out;
  }
  return clone(local??remote);
}
function mergeReadonlyGame(local={},remote={}){
  const localHero=obj(local.hero),remoteHero=obj(remote.hero);
  const tombstones={...obj(remote.inventoryTombstones),...obj(local.inventoryTombstones)};
  const inventory=mergeRows(local.inventory,remote.inventory).filter(inv=>!inv?.id||!Object.prototype.hasOwnProperty.call(tombstones,String(inv.id)));
  const settings={...obj(remote.settings),...obj(local.settings)};
  settings.cloud=obj(local.settings?.cloud||remote.settings?.cloud);
  settings.parentPinHash=String(local.settings?.parentPinHash||remote.settings?.parentPinHash||'');
  return {
    ...clone(local),...clone(remote),
    hero:{
      ...clone(localHero),...clone(remoteHero),
      skillUsage:mergeCounterMap(localHero.skillUsage,remoteHero.skillUsage),
      skillUsageByDate:mergeUsageByDate(localHero.skillUsageByDate,remoteHero.skillUsageByDate),
      jobCandidateHistory:mergeCandidateHistory(localHero.jobCandidateHistory,remoteHero.jobCandidateHistory)
    },
    tasks:mergeRows(local.tasks,remote.tasks),
    taskRecords:mergeRows(local.taskRecords,remote.taskRecords),
    learningProgress:mergeRows(local.learningProgress,remote.learningProgress),
    inventory,inventoryTombstones:tombstones,
    shopItems:mergeRows(local.shopItems,remote.shopItems),
    lotteryPool:mergeRows(local.lotteryPool,remote.lotteryPool),
    couponRequests:mergeRows(local.couponRequests,remote.couponRequests),
    battleRecords:mergeRows(local.battleRecords,remote.battleRecords),
    gmAudit:mergeRows(local.gmAudit,remote.gmAudit),
    semesterArchives:mergeRows(local.semesterArchives,remote.semesterArchives),
    lotteryCoinLedger:deepMerge(remote.lotteryCoinLedger,local.lotteryCoinLedger),
    assetAudit:deepMerge(remote.assetAudit,local.assetAudit),
    campaignProgress:deepMerge(remote.campaignProgress,local.campaignProgress),
    social:{friends:mergeRows(local.social?.friends,remote.social?.friends),inbox:mergeRows(local.social?.inbox,remote.social?.inbox)},
    settings
  };
}
function mergeReadonlyFamily(localFamily,incomingFamily){
  const localProfiles=new Map((localFamily.profiles||[]).map(p=>[String(p.id),p])),profiles=[],seen=new Set();
  for(const remote of incomingFamily.profiles||[]){
    const id=String(remote.id),local=localProfiles.get(id);seen.add(id);
    profiles.push({id,label:String(remote.label||local?.label||remote.data?.hero?.name||'勇者'),data:local?mergeReadonlyGame(local.data,remote.data):clone(remote.data)});
  }
  for(const local of localFamily.profiles||[])if(!seen.has(String(local.id)))profiles.push(clone(local));
  const active=profiles.some(p=>p.id===localFamily.activeProfileId)?localFamily.activeProfileId:(incomingFamily.activeProfileId||profiles[0]?.id);
  return {
    ...clone(localFamily),...clone(incomingFamily),
    activeProfileId:active,profiles,
    examSubjects:mergeRows(localFamily.examSubjects,incomingFamily.examSubjects),
    schoolTimetable:mergeRows(localFamily.schoolTimetable,incomingFamily.schoolTimetable),
    adventureCalendar:mergeRows(localFamily.adventureCalendar,incomingFamily.adventureCalendar),
    access:deepMerge(incomingFamily.access,localFamily.access),
    legacySeasonId:String(incomingFamily.legacySeasonId||localFamily.legacySeasonId||APP_CONFIG.legacySeasonId)
  };
}

function emit(){for(const fn of [...listeners])fn(state)}
export function initStore(){let saved=null;try{saved=JSON.parse(localStorage.getItem(APP_CONFIG.storageKey))}catch{}state=normalize(saved||readLegacyState()||createDefaultState());save();return state}
export function getState(){return state}
export function getFamily(){return state.family}
export function getActiveProfile(){const f=getFamily();let p=f.profiles.find(x=>x.id===f.activeProfileId);if(!p){p=f.profiles[0];f.activeProfileId=p.id}return p}
export function getGame(){return getActiveProfile().data}
export function save(){localStorage.setItem(APP_CONFIG.storageKey,JSON.stringify(state))}
export function update(mutator){mutator(state);save();emit()}
export function subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)}
export function switchProfile(id){if(!getFamily().profiles.some(p=>p.id===id))return false;update(s=>s.family.activeProfileId=id);return true}
export function addProfile({name,gender='male'}={}){
  name=String(name||'').trim();if(!name)return{ok:false,message:'請輸入勇者名稱。'};
  const base=createDefaultState().family.profiles[0].data,id=`hero_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
  base.hero.name=name;base.hero.gender=gender==='female'?'female':'male';
  update(s=>{s.family.profiles.push({id,label:name,data:base});s.family.activeProfileId=id});
  return{ok:true,message:`已建立 ${name}。`,profileId:id};
}
export function applyReadonlyLegacyCloudPayload(payload,meta={}){
  if(!payload||typeof payload!=='object')return false;
  let incomingFamily=null;
  if(payload.familyData?.profiles?.length)incomingFamily=migrateLegacyFamilySnapshot(payload.familyData);
  else if(payload.gameData?.hero){
    const game=migrateLegacyGameSnapshot(payload.gameData),id=String(payload.profileId||state?.family?.activeProfileId||'hero_1');
    incomingFamily={activeProfileId:id,profiles:[{id,label:game.hero?.name||'勇者',data:game}],examSubjects:state.family.examSubjects,schoolTimetable:state.family.schoolTimetable,adventureCalendar:state.family.adventureCalendar,access:{},legacySeasonId:String(meta.seasonId||APP_CONFIG.legacySeasonId)};
  }else return false;
  state.family=mergeReadonlyFamily(state.family,incomingFamily);
  state.source='1.0-firebase-readonly';
  state.importedAt=new Date().toISOString();
  save();emit();return true;
}
export function resetV2(){localStorage.removeItem(APP_CONFIG.storageKey);state=null;return initStore()}
