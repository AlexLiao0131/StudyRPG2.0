import { APP_CONFIG } from '../data/app-config.js';
import { createDefaultState } from '../data/default-state.js';

function clone(v){return v==null?v:JSON.parse(JSON.stringify(v))}
function safeParse(raw){try{return JSON.parse(raw)}catch{return null}}
function array(v){return Array.isArray(v)?clone(v):[]}
function object(v){return v&&typeof v==='object'&&!Array.isArray(v)?clone(v):{}}
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

function migrateHero(raw={},fallback={}){
  const stats=raw.stats&&typeof raw.stats==='object'?raw.stats:{};
  return {
    ...fallback,
    name:String(raw.name||fallback.name||'勇者'),
    gender:raw.gender==='female'?'female':'male',
    heroClass:String(raw.heroClass||fallback.heroClass||'見習勇者'),
    jobAwakened:!!raw.jobAwakened,
    level:Math.max(1,Number(raw.level)||1),exp:Math.max(0,Number(raw.exp)||0),maxExp:Math.max(1,Number(raw.maxExp)||100),
    gold:Math.max(0,Number(raw.gold)||0),lotteryCoins:Math.max(0,Number(raw.lotteryCoins)||0),virtue:Math.max(0,Number(raw.virtue)||0),
    stats:{str:Number(stats.str)||0,agi:Number(stats.agi)||0,int:Number(stats.int)||0,will:Number(stats.will)||0},
    jobScores:object(raw.jobScores),knownSkills:array(raw.knownSkills),skills:array(raw.skills),equippedSkills:array(raw.equippedSkills),
    jobPassive:String(raw.jobPassive||''),pendingGoldDebt:Math.max(0,Number(raw.pendingGoldDebt)||0),lastStatGains:object(raw.lastStatGains),equipment:object(raw.equipment||fallback.equipment)
  };
}

function migrateCampaignProgress(raw={}){
  const progress=object(raw.campaignProgress);
  if(!progress.phaseHistory||typeof progress.phaseHistory!=='object'||Array.isArray(progress.phaseHistory))progress.phaseHistory={};
  const legacyRatio=Number(raw.storyFlags?.demonKingPhase1DamageRatio);
  if(Number.isFinite(legacyRatio)){
    const scopeKey=String(raw.semester?.startDate||'legacy'),scoped=progress.phaseHistory[scopeKey]=object(progress.phaseHistory[scopeKey]),chain=scoped.demon_king=object(scoped.demon_king);
    chain.chainId='demon_king';chain.scopeKey=scopeKey;chain.phases=object(chain.phases);
    if(!chain.phases.demon_king_phase1){
      chain.phases.demon_king_phase1={monsterId:'demon_king_phase1',phaseNumber:1,result:'legacy',date:'',eventType:'daily',rounds:0,enemyHp:0,enemyMaxHp:0,enemyDamageRatio:clamp(legacyRatio,0,1),heroHp:0,heroMaxHp:0,recordedAt:new Date().toISOString(),importedFrom:'storyFlags.demonKingPhase1DamageRatio'};
      chain.lastMonsterId='demon_king_phase1';chain.lastPhaseNumber=1;chain.updatedAt=chain.phases.demon_king_phase1.recordedAt;
    }
  }
  return progress;
}

function migrateGame(raw={},fallback={}){
  const tombstones=object(raw.inventoryTombstones),inventory=array(raw.inventory).filter(inv=>!inv?.id||!Object.prototype.hasOwnProperty.call(tombstones,String(inv.id)));
  const semester=raw.semester&&typeof raw.semester==='object'?raw.semester:{};
  const settings=raw.settings&&typeof raw.settings==='object'?raw.settings:{};
  return {
    ...fallback,
    hero:migrateHero(raw.hero||{},fallback.hero||{}),
    semester:{
      ...fallback.semester,
      startDate:String(semester.startDate||fallback.semester?.startDate||''),
      endDate:String(semester.endDate||fallback.semester?.endDate||''),
      schoolWeekdays:Array.isArray(semester.schoolWeekdays)?semester.schoolWeekdays.map(Number):clone(fallback.semester?.schoolWeekdays||[1,2,3,4,5]),
      worldState:String(semester.worldState||fallback.semester?.worldState||'normal')
    },
    tasks:array(raw.tasks),taskRecords:array(raw.taskRecords),activeTasks:{},learningProgress:array(raw.learningProgress),
    inventory,inventoryTombstones:tombstones,shopItems:array(raw.shopItems),lotteryPool:array(raw.lotteryPool),lotteryCoinLedger:object(raw.lotteryCoinLedger),assetAudit:object(raw.assetAudit),couponRequests:array(raw.couponRequests),battleRecords:array(raw.battleRecords),gmAudit:array(raw.gmAudit),semesterArchives:array(raw.semesterArchives),campaignProgress:migrateCampaignProgress(raw),
    social:{friends:array(raw.social?.friends),inbox:array(raw.social?.inbox)},
    settings:{parentPinHash:String(settings.parentPinHash||''),cloud:object(settings.cloud),familyAccess:object(settings.familyAccess||{enabled:true}),holidayTower:object(settings.holidayTower||{dailyLimit:3})},
    dailyBalance:clone(raw.dailyBalance||raw.dailyBalanceV10114||null),
    examBossBaseline:clone(raw.examBossBaseline||raw.examBossBaselineV10158||fallback.examBossBaseline),
    examCompletionTargets:object(raw.examCompletionTargets||raw.examCompletionTargetsV101716)
  };
}

function migrateFamily(rawFamily){
  const base=createDefaultState();
  const baseGame=base.family.profiles[0].data;
  const profiles=(rawFamily.profiles||[]).map((p,i)=>({
    id:String(p.id||`hero_${i+1}`),
    label:String(p.label||p.data?.hero?.name||`勇者${i+1}`),
    data:migrateGame(p.data||{},baseGame)
  }));
  const safeProfiles=profiles.length?profiles:base.family.profiles;
  const wanted=String(sessionStorage.getItem('activeHeroProfile')||rawFamily.activeProfileId||safeProfiles[0].id);
  return {
    activeProfileId:safeProfiles.some(p=>p.id===wanted)?wanted:safeProfiles[0].id,
    profiles:safeProfiles,
    examSubjects:Array.isArray(rawFamily.examSubjects)&&rawFamily.examSubjects.length?array(rawFamily.examSubjects):clone(base.family.examSubjects),
    schoolTimetable:Array.isArray(rawFamily.schoolTimetable)?array(rawFamily.schoolTimetable):clone(base.family.schoolTimetable),
    adventureCalendar:Array.isArray(rawFamily.adventureCalendar)?array(rawFamily.adventureCalendar):clone(base.family.adventureCalendar),
    access:object(rawFamily.access)
  };
}

export function readLegacyState(){
  const family=safeParse(localStorage.getItem(APP_CONFIG.legacyFamilyKey));
  if(family?.profiles?.length){
    return {schemaVersion:2,source:'1.0-localStorage-readonly',importedAt:new Date().toISOString(),family:migrateFamily(family)};
  }
  const single=safeParse(localStorage.getItem(APP_CONFIG.legacySingleKey));
  if(single?.hero){
    const state=createDefaultState();
    state.source='1.0-single-save-readonly';state.importedAt=new Date().toISOString();
    state.family.profiles[0].data=migrateGame(single,state.family.profiles[0].data);
    state.family.profiles[0].label=state.family.profiles[0].data.hero.name||'勇者';
    return state;
  }
  return null;
}
