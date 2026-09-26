import { encounterForDate, worldForDate } from '../world/world-service.js';
import { getGame } from '../core/store.js';
import { localDateString } from '../core/date.js';
import { combatPower } from '../progression/combat-power.js';
import { calibratedDailyMonsterPower, ensureDailyBalanceSnapshot } from '../balance/daily-dungeon-power.js';
import { currentExamBattle } from '../exam/exam-boss-service.js';

function ignoredRecordIds(dateStr){
  const reset=getGame().campaignProgress?.dailyChallengeResets?.[dateStr];
  return new Set(Array.isArray(reset?.ignoredRecordIds)?reset.ignoredRecordIds.map(String):[]);
}
export function dungeonChallengeRecord(dateStr=localDateString()){
  const records=getGame().battleRecords||[],ignored=ignoredRecordIds(dateStr);
  for(let i=records.length-1;i>=0;i--){
    const r=records[i];
    if(r?.date===dateStr&&['daily','midterm','final'].includes(r?.eventType)&&(r.result==='win'||r.result==='lose')&&!ignored.has(String(r.id||'')))return r;
  }
  return null;
}
export function dailyChallengeRecord(dateStr=localDateString()){return dungeonChallengeRecord(dateStr)}
export function dailyChallengeResolved(dateStr=localDateString()){return !!dungeonChallengeRecord(dateStr)}

export function dungeonSnapshot(dateStr=localDateString()){
  const world=worldForDate(dateStr),challenge=dungeonChallengeRecord(dateStr),exam=currentExamBattle(dateStr),encounter=encounterForDate(dateStr);
  if(exam){
    if(!encounter)return{encounter:null,world,heroPower:combatPower(),enemyPower:exam.context.power,celebration:false,challenged:!!challenge,challengeResult:challenge?.result||'',exam};
    return{
      encounter:{...encounter,name:exam.event.name||encounter.name},
      world,heroPower:combatPower(),enemyPower:exam.context.power,balance:null,celebration:false,
      challenged:!!challenge,challengeResult:challenge?.result||'',challengeRecord:challenge||null,
      eventType:exam.event.type,exam
    };
  }
  if(!encounter)return{encounter:null,world,heroPower:combatPower(),enemyPower:0,celebration:!!world?.noBattle,challenged:!!challenge,challengeResult:challenge?.result||''};
  const balance=ensureDailyBalanceSnapshot(dateStr);
  return{encounter,world,heroPower:combatPower(),enemyPower:calibratedDailyMonsterPower(dateStr),balance,celebration:false,challenged:!!challenge,challengeResult:challenge?.result||'',challengeRecord:challenge||null,eventType:'daily',exam:null};
}
