import { getFamily, getGame, save } from '../core/store.js';
import { localDateString } from '../core/date.js';
import { WEEKLY_WORLDS } from '../world/world-database.js';
import { monsterDef } from '../battle/monster-database.js';
import { combatPower } from '../progression/combat-power.js';
import { equippedEquipmentPowerScore } from '../equipment/equipment-service.js';

const CAMPAIGN_TYPES=new Set(['winter_break_start','summer_break_start','semester_start']);

function campaignEvents(dateStr=localDateString()){
  const family=getFamily(),profileId=family?.activeProfileId;
  return (family?.adventureCalendar||[]).filter(e=>e?.date&&e.date<=dateStr&&CAMPAIGN_TYPES.has(e.type)&&(e.targetType!=='selected'||(e.targetProfileIds||[]).includes(profileId))).slice().sort((a,b)=>(a.date+String(a.id||'')).localeCompare(b.date+String(b.id||'')));
}

export function currentCampaignMode(dateStr=localDateString()){
  const events=campaignEvents(dateStr),latest=events.at(-1);if(!latest)return String(getGame().campaignProgress?.mode||'semester');
  return ['winter_break_start','summer_break_start'].includes(latest.type)?'holidayTower':'semester';
}

export function currentCampaignCycle(dateStr=localDateString()){
  const starts=campaignEvents(dateStr).filter(e=>e.type==='semester_start'),stored=Math.max(1,Number(getGame().campaignProgress?.cycle)||1);if(!starts.length)return stored;
  let cycle=1;for(let i=1;i<starts.length;i++)cycle=starts[i].semesterMode==='standard'?1:cycle+1;
  return starts.length<2&&stored>1?stored:cycle;
}

export function isEquipmentEndgameUnlocked(game=getGame()){
  if(game.storyFlags?.firstSemesterCleared===true)return true;
  return (game.battleRecords||[]).some(r=>r?.result==='win'&&(r.monsterId==='final_necromancer'||r.replayBossId==='final_necromancer'||String(r.enemyName||'').includes('最終死靈法師')));
}

export function markFirstSemesterClear(game,record={}){
  if(!game||record?.result!=='win'||record?.monsterId!=='final_necromancer')return false;game.storyFlags=game.storyFlags&&typeof game.storyFlags==='object'?game.storyFlags:{};if(game.storyFlags.firstSemesterCleared)return false;game.storyFlags.firstSemesterCleared=true;game.storyFlags.firstSemesterClearedAt=new Date().toISOString();return true;
}

export function replayBossIds(){
  const ids=[];for(const world of WEEKLY_WORLDS.filter(w=>w.week<=20))for(const id of world.monsters||[]){if(id&&id!=='grim_reaper'&&monsterDef(id)?.boss&&!ids.includes(id))ids.push(id)}return ids;
}

export function replayBossPower(monsterId,game=getGame()){
  const name=monsterDef(monsterId)?.name||monsterId,records=(game.battleRecords||[]).filter(r=>Number(r?.enemyPower)>0&&(r.monsterId===monsterId||String(r.enemyName||'').includes(name)));return records.length?Math.round(Number(records.at(-1).enemyPower)):Math.max(40,Math.round(combatPower(game.hero)*1.10));
}

export function ensureHolidayTower(dateStr=localDateString(),game=getGame()){
  game.holidayTower=game.holidayTower&&typeof game.holidayTower==='object'?game.holidayTower:{};let changed=false;if(game.holidayTower.date!==dateStr){game.holidayTower.date=dateStr;game.holidayTower.runsUsed=0;changed=true}game.holidayTower.runsUsed=Math.max(0,Number(game.holidayTower.runsUsed)||0);game.holidayTower.bestFloor=Math.max(0,Number(game.holidayTower.bestFloor)||0);if(changed)save();return game.holidayTower;
}

export function towerRunsLeft(dateStr=localDateString(),game=getGame()){
  const state=ensureHolidayTower(dateStr,game),limit=Math.max(1,Number(game.settings?.holidayTower?.dailyLimit)||3);return Math.max(0,limit-state.runsUsed);
}

export function nextTowerFloor(dateStr=localDateString(),game=getGame()){return Math.max(1,ensureHolidayTower(dateStr,game).bestFloor+1)}

export function towerMonsterForFloor(floor,dateStr=localDateString()){
  const pool=WEEKLY_WORLDS.filter(w=>w.week<=20).flatMap(w=>w.monsters||[]).filter(id=>id&&monsterDef(id)),bosses=pool.filter(id=>monsterDef(id)?.boss),normal=pool.filter(id=>!monsterDef(id)?.boss),source=floor%5===0?(bosses.length?bosses:pool):(normal.length?normal:pool);let seed=floor*37+currentCampaignCycle(dateStr)*101;return source[Math.abs(seed)%source.length]||'slime_water';
}

export function towerPower(floor,dateStr=localDateString(),game=getGame()){
  return Math.max(18,Math.round(combatPower(game.hero)*(.78+Math.max(1,floor)*.055+(currentCampaignCycle(dateStr)-1)*.08)));
}

export function consumeTowerRun(dateStr=localDateString(),game=getGame()){
  const state=ensureHolidayTower(dateStr,game);if(towerRunsLeft(dateStr,game)<=0)return false;state.runsUsed++;save();return true;
}

export function recordTowerFloorClear(game,floor){
  game.holidayTower=game.holidayTower&&typeof game.holidayTower==='object'?game.holidayTower:{};game.holidayTower.bestFloor=Math.max(Number(game.holidayTower.bestFloor)||0,Math.max(1,Number(floor)||1));
}

export function ensureSemesterGearBaseline(dateStr=localDateString(),game=getGame()){
  const cycle=currentCampaignCycle(dateStr);if(cycle<=1)return null;game.balanceSettings=game.balanceSettings&&typeof game.balanceSettings==='object'?game.balanceSettings:{};if(!Number.isFinite(Number(game.balanceSettings.gearCarryRate)))game.balanceSettings.gearCarryRate=.55;
  if(!game.semesterGearBaseline||Number(game.semesterGearBaseline.cycle)!==cycle){game.semesterGearBaseline={cycle,equipmentScore:equippedEquipmentPowerScore(game),capturedAt:new Date().toISOString(),date:dateStr};save()}
  return game.semesterGearBaseline;
}

export function semesterEquipmentPowerBonus(dateStr=localDateString(),game=getGame()){
  const cycle=currentCampaignCycle(dateStr);if(cycle<=1)return 0;const snap=ensureSemesterGearBaseline(dateStr,game),rate=Math.max(0,Math.min(1,Number(game.balanceSettings?.gearCarryRate)??.55));return Math.round(Number(snap?.equipmentScore||0)*rate);
}
