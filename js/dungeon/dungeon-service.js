import { encounterForDate, worldForDate } from '../world/world-service.js';
import { getGame } from '../core/store.js';
import { localDateString } from '../core/date.js';
import { combatPower } from '../progression/combat-power.js';
import { calibratedDailyMonsterPower, ensureDailyBalanceSnapshot } from '../balance/daily-dungeon-power.js';

export function dailyChallengeRecord(dateStr=localDateString()){
  const records=getGame().battleRecords||[];
  for(let i=records.length-1;i>=0;i--){
    const r=records[i];
    if(r?.date===dateStr&&r?.eventType==='daily'&&(r.result==='win'||r.result==='lose'))return r;
  }
  return null;
}

export function dailyChallengeResolved(dateStr=localDateString()){
  return !!dailyChallengeRecord(dateStr);
}

export function dungeonSnapshot(dateStr=localDateString()){
  const encounter=encounterForDate(dateStr),world=worldForDate(dateStr),challenge=dailyChallengeRecord(dateStr);
  if(!encounter)return{encounter:null,world,heroPower:combatPower(),enemyPower:0,celebration:!!world?.noBattle,challenged:!!challenge,challengeResult:challenge?.result||''};
  const balance=ensureDailyBalanceSnapshot(dateStr);
  return{encounter,world,heroPower:combatPower(),enemyPower:calibratedDailyMonsterPower(dateStr),balance,celebration:false,challenged:!!challenge,challengeResult:challenge?.result||'',challengeRecord:challenge||null};
}
