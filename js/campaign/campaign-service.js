import { getFamily, getGame, save } from '../core/store.js';
import { localDateString } from '../core/date.js';
import { combatPower } from '../progression/combat-power.js';
import { equippedEquipmentPowerScore } from '../equipment/equipment-service.js';
import { currentCampaignCycle, currentCampaignMode } from './endgame-service.js';

const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
const object=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};

function visibleToActiveProfile(event){
  const profileId=getFamily()?.activeProfileId;
  return event?.targetType!=='selected'||(event?.targetProfileIds||[]).includes(profileId);
}

function semesterStarts(dateStr=localDateString()){
  return (getFamily()?.adventureCalendar||[])
    .filter(e=>e?.type==='semester_start'&&e?.date&&e.date<=dateStr&&visibleToActiveProfile(e))
    .slice()
    .sort((a,b)=>(a.date+String(a.id||'')).localeCompare(b.date+String(b.id||'')));
}

function activeSemesterEvent(dateStr=localDateString()){
  return semesterStarts(dateStr).at(-1)||null;
}

function battleRowsForPeriod(game,startDate,endDate){
  return (game?.battleRecords||[]).filter(r=>{
    const date=String(r?.date||'');
    return date&&(!startDate||date>=startDate)&&(!endDate||date<endDate);
  });
}

function archiveId(nextEvent){return `semester_archive_${String(nextEvent?.id||nextEvent?.date||'unknown')}`}

function buildArchive(game,nextEvent,{previousStart,previousCycle}={}){
  const rows=battleRowsForPeriod(game,previousStart,nextEvent.date),wins=rows.filter(r=>r?.result==='win').length,losses=rows.filter(r=>r?.result==='lose').length;
  const scopeKey=String(previousStart||'');
  return{
    id:archiveId(nextEvent),
    startDate:scopeKey,
    endedAt:String(nextEvent.date||''),
    endedBySemesterEventId:String(nextEvent.id||''),
    cycle:Math.max(1,Number(previousCycle)||1),
    hero:{
      level:Math.max(1,Number(game.hero?.level)||1),
      exp:Math.max(0,Number(game.hero?.exp)||0),
      heroClass:String(game.hero?.heroClass||'見習勇者'),
      jobAwakened:!!game.hero?.jobAwakened,
      virtue:Math.max(0,Number(game.hero?.virtue)||0),
      stats:clone(game.hero?.stats||{})
    },
    battleSummary:{count:rows.length,wins,losses},
    equipment:{
      endingPowerScore:equippedEquipmentPowerScore(game),
      semesterBaseline:clone(game.semesterGearBaseline||null)
    },
    examBossBaseline:clone(game.examBossBaseline||null),
    examBossLocks:clone(game.campaignProgress?.examBossLocks||{}),
    phaseScopeKey:scopeKey,
    phaseHistory:clone(game.campaignProgress?.phaseHistory?.[scopeKey]||{}),
    firstSemesterCleared:game.storyFlags?.firstSemesterCleared===true,
    archivedAt:new Date().toISOString()
  };
}

function captureSemesterGearBaseline(game,cycle,event){
  if(cycle<=1){game.semesterGearBaseline=null;return null}
  game.balanceSettings=object(game.balanceSettings);
  if(!Number.isFinite(Number(game.balanceSettings.gearCarryRate)))game.balanceSettings.gearCarryRate=.55;
  const snap={
    cycle,
    equipmentScore:equippedEquipmentPowerScore(game),
    carryRate:Math.max(0,Math.min(1,Number(game.balanceSettings.gearCarryRate))),
    capturedAt:new Date().toISOString(),
    date:String(event.date||''),
    semesterEventId:String(event.id||'')
  };
  game.semesterGearBaseline=snap;return snap;
}

function resetSemesterScopedRuntime(game,event,cycle){
  game.dailyBalance=null;
  game.examCompletionTargets={};
  game.examBossBaseline={
    date:String(event.date||''),
    nakedPower:Math.max(1,combatPower(game.hero)),
    createdAt:new Date().toISOString(),
    equipmentExcluded:true,
    cycle
  };
  game.campaignProgress=object(game.campaignProgress);
  game.campaignProgress.examBossLocks={};
}

function adoptExistingSemester(game,event,cycle){
  const progress=game.campaignProgress=object(game.campaignProgress);
  progress.phaseHistory=object(progress.phaseHistory);
  progress.cycle=cycle;
  progress.mode=currentCampaignMode(event.date);
  progress.semesterStartDate=String(event.date||game.semester?.startDate||'');
  progress.lastAppliedSemesterEventId=String(event.id||'');
  progress.lastAppliedSemesterEventDate=String(event.date||'');
  progress.lifecycleInitializedAt=progress.lifecycleInitializedAt||new Date().toISOString();
  game.semester=object(game.semester);
  game.semester.startDate=String(event.date||game.semester.startDate||'');
  if(cycle>1&&(!game.semesterGearBaseline||Number(game.semesterGearBaseline.cycle)!==cycle))captureSemesterGearBaseline(game,cycle,event);
}

function rebaseAppliedSemester(game,event,cycle){
  const progress=game.campaignProgress=object(game.campaignProgress);
  progress.phaseHistory=object(progress.phaseHistory);
  progress.cycle=cycle;
  progress.mode='semester';
  progress.semesterStartDate=String(event.date||'');
  progress.lastAppliedSemesterEventDate=String(event.date||'');
  progress.lastSemesterRebasedAt=new Date().toISOString();
  game.semester=object(game.semester);game.semester.startDate=String(event.date||'');
  if(game.semester?.endDate&&game.semester.endDate<event.date)game.semester.endDate='';
  game.dailyBalance=null;game.examCompletionTargets={};progress.examBossLocks={};
  if(game.examBossBaseline){game.examBossBaseline.date=String(event.date||'');game.examBossBaseline.cycle=cycle}
  if(game.semesterGearBaseline&&Number(game.semesterGearBaseline.cycle)===cycle){game.semesterGearBaseline.date=String(event.date||'');game.semesterGearBaseline.semesterEventId=String(event.id||'')}
}

function transitionToSemester(game,event,cycle){
  const progress=game.campaignProgress=object(game.campaignProgress),previousStart=String(progress.semesterStartDate||game.semester?.startDate||''),previousCycle=Math.max(1,Number(progress.cycle)||Math.max(1,cycle-1));
  game.semesterArchives=Array.isArray(game.semesterArchives)?game.semesterArchives:[];
  const id=archiveId(event);
  if(!game.semesterArchives.some(x=>String(x?.id)===id))game.semesterArchives.push(buildArchive(game,event,{previousStart,previousCycle}));

  const phaseHistory=object(progress.phaseHistory);
  game.campaignProgress={
    ...progress,
    phaseHistory,
    examBossLocks:{},
    cycle,
    mode:'semester',
    semesterStartDate:String(event.date||''),
    lastAppliedSemesterEventId:String(event.id||''),
    lastAppliedSemesterEventDate:String(event.date||''),
    lastTransitionAt:new Date().toISOString(),
    previousSemesterStartDate:previousStart,
    previousCycle
  };
  game.semester=object(game.semester);game.semester.startDate=String(event.date||'');game.semester.worldState='normal';
  if(game.semester.endDate&&game.semester.endDate<event.date)game.semester.endDate='';
  resetSemesterScopedRuntime(game,event,cycle);
  captureSemesterGearBaseline(game,cycle,event);
}

export function applyCampaignLifecycle(dateStr=localDateString()){
  const game=getGame(),event=activeSemesterEvent(dateStr);if(!game||!event)return{changed:false,reason:'no-semester-start'};
  const cycle=Math.max(1,currentCampaignCycle(dateStr)),progress=game.campaignProgress=object(game.campaignProgress),appliedId=String(progress.lastAppliedSemesterEventId||''),eventId=String(event.id||'');
  let changed=false,reason='current';

  if(!appliedId){
    const sameSemester=String(game.semester?.startDate||'')===String(event.date||'');
    if(sameSemester){adoptExistingSemester(game,event,cycle);reason='adopted-existing';changed=true}
    else{transitionToSemester(game,event,cycle);reason='transitioned';changed=true}
  }else if(appliedId!==eventId){
    transitionToSemester(game,event,cycle);reason='transitioned';changed=true;
  }else if(String(progress.lastAppliedSemesterEventDate||progress.semesterStartDate||'')!==String(event.date||'')){
    rebaseAppliedSemester(game,event,cycle);reason='rebased-current';changed=true;
  }else{
    const mode=currentCampaignMode(dateStr);if(progress.mode!==mode){progress.mode=mode;changed=true;reason='mode-synced'}
    if(Number(progress.cycle)!==cycle){progress.cycle=cycle;changed=true;reason='cycle-synced'}
  }

  if(changed)save();
  return{changed,reason,eventId:eventId||null,startDate:event.date,cycle,mode:game.campaignProgress?.mode||currentCampaignMode(dateStr),archiveCount:(game.semesterArchives||[]).length,gearBaseline:clone(game.semesterGearBaseline||null)};
}

export function campaignLifecycleSnapshot(dateStr=localDateString()){
  const game=getGame(),event=activeSemesterEvent(dateStr),cycle=Math.max(1,currentCampaignCycle(dateStr));
  return{
    cycle,
    mode:currentCampaignMode(dateStr),
    eventId:String(event?.id||''),
    startDate:String(event?.date||game.semester?.startDate||''),
    appliedEventId:String(game.campaignProgress?.lastAppliedSemesterEventId||''),
    appliedEventDate:String(game.campaignProgress?.lastAppliedSemesterEventDate||game.campaignProgress?.semesterStartDate||''),
    archiveCount:(game.semesterArchives||[]).length,
    latestArchive:(game.semesterArchives||[]).at(-1)||null,
    gearBaseline:clone(game.semesterGearBaseline||null)
  };
}
