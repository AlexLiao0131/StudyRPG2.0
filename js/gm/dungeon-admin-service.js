import { getGame, update } from '../core/store.js';
import { localDateString } from '../core/date.js';

const result=(ok,message,data={})=>({ok,message,...data});
const uid=()=>`battle_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`;

export function resetDailyChallenge(dateStr=localDateString()){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr||'')))return result(false,'日期格式不正確。');
  let ignoredCount=0;
  update(()=>{
    const g=getGame();g.campaignProgress=g.campaignProgress||{};g.campaignProgress.dailyChallengeResets=g.campaignProgress.dailyChallengeResets||{};
    const records=(g.battleRecords||[]).filter(r=>r?.date===dateStr&&['daily','midterm','final'].includes(r?.eventType)&&(r.result==='win'||r.result==='lose'));
    for(const r of records)if(!r.id)r.id=uid();
    const old=g.campaignProgress.dailyChallengeResets[dateStr]||{},ids=new Set(Array.isArray(old.ignoredRecordIds)?old.ignoredRecordIds:[]);
    for(const r of records)ids.add(String(r.id));
    ignoredCount=ids.size;
    g.campaignProgress.dailyChallengeResets[dateStr]={resetAt:new Date().toISOString(),ignoredRecordIds:[...ids]};
    g.gmAudit=g.gmAudit||[];g.gmAudit.unshift({id:`gm_${Date.now().toString(36)}`,type:'daily_dungeon_reset',date:new Date().toISOString(),targetDate:dateStr,ignoredBattleRecordIds:[...ids]});g.gmAudit=g.gmAudit.slice(0,100);
  });
  return result(true,ignoredCount?`已重置 ${dateStr} 的副本挑戰狀態；保留 ${ignoredCount} 筆舊戰鬥紀錄，可重新挑戰。`:`${dateStr} 尚無正式挑戰紀錄，目前可直接挑戰。`,{ignoredCount});
}
