import { getFamily, getGame, update } from '../core/store.js';
import { localDateString } from '../core/date.js';
import { isTaskScheduled, reviewTaskRecord } from '../tasks/task-service.js';
import { reconcileDailyBalanceSnapshot } from '../balance/daily-dungeon-power.js';

const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
const uid=()=>`task_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
const validDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||''));
const result=(ok,message,data={})=>({ok,message,...data});

function normalizeTaskInput(input={},existing=null){
  const start=String(input.activeFrom||input.date||localDateString()),end=String(input.activeUntil||'');
  if(!String(input.name||'').trim())throw new Error('請輸入任務名稱。');
  if(!validDate(start))throw new Error('任務日期格式不正確。');
  if(end&&(!validDate(end)||end<start))throw new Error('結束日期不能早於開始日期。');
  const recurring=!!input.recurring,weekdays=Array.isArray(input.weekdays)?[...new Set(input.weekdays.map(Number).filter(n=>n>=0&&n<=6))]:[];
  if(recurring&&!weekdays.length)throw new Error('重複任務至少要選一天。');
  const rewardMode=input.rewardMode==='manual'?'manual':'auto',manual={};
  if(rewardMode==='manual'){
    const a=String(input.fixedStat||'will'),av=Math.max(0,Number(input.fixedStatValue)||0),b=String(input.fixedStat2||''),bv=Math.max(0,Number(input.fixedStatValue2)||0);
    if(av)manual[a]=av;if(b&&bv)manual[b]=(manual[b]||0)+bv;
  }
  return {
    ...(existing||{}),id:existing?.id||uid(),name:String(input.name).trim(),taskType:String(input.taskType||'complete'),rewardMode,
    category:String(input.category||'custom'),difficulty:String(input.difficulty||'normal'),description:String(input.description||'').trim(),
    courseId:String(input.courseId||''),subject:String(input.subject||''),progressType:String(input.progressType||'').trim(),progressValue:String(input.progressValue||'').trim(),
    goldReward:Math.max(0,Number(input.goldReward)||0),expReward:Math.max(0,Number(input.expReward)||0),dailyLimit:Math.max(1,Number(input.dailyLimit)||1),
    active:true,archived:false,recurring,createdDate:existing?.createdDate||localDateString(),date:recurring?'':start,activeFrom:start,activeUntil:end,
    weekdays:recurring?weekdays:[],cancelledDates:Array.isArray(existing?.cancelledDates)?[...existing.cancelledDates]:[],
    timerMode:input.timerMode==='duration'?'duration':'deadline',fastMinutes:Math.max(1,Number(input.fastMinutes)||30),standardMinutes:Math.max(1,Number(input.standardMinutes)||60),
    fixedStat:String(input.fixedStat||'will'),fixedStatValue:rewardMode==='manual'?Math.max(0,Number(input.fixedStatValue)||0):0,
    fixedStat2:String(input.fixedStat2||''),fixedStatValue2:rewardMode==='manual'?Math.max(0,Number(input.fixedStatValue2)||0):0,
    manualStatRewards:rewardMode==='manual'?manual:{},quantityTarget:Math.max(1,Number(input.quantityTarget)||1),quantityUnit:String(input.quantityUnit||'次').trim()||'次',
    scoreMax:Math.max(1,Number(input.scoreMax)||100),allowCorrection:existing?.allowCorrection!==false,correctionExp:Math.max(0,Number(existing?.correctionExp)||0)
  };
}
function invalidateExamTargets(g){g.examCompletionTargets={}}

export function saveTaskDefinition(input,{editingId='',assignAll=false}={}){
  let saved=null;
  try{
    update(()=>{
      const family=getFamily(),g=getGame(),existing=editingId?(g.tasks||[]).find(t=>String(t.id)===String(editingId)):null,subject=(family.examSubjects||[]).find(s=>String(s.id)===String(input.courseId||''));
      const next=normalizeTaskInput({...input,subject:subject?.name||''},existing||null);
      if(existing)Object.assign(existing,next);else g.tasks.push(next);
      invalidateExamTargets(g);saved=next;
      if(!existing&&assignAll){
        for(const p of family.profiles){if(p.id===family.activeProfileId)continue;p.data.tasks=Array.isArray(p.data.tasks)?p.data.tasks:[];p.data.tasks.push({...clone(next),id:uid()});p.data.examCompletionTargets={};}
      }
    });
  }catch(e){return result(false,e?.message||'任務儲存失敗。')}
  reconcileDailyBalanceSnapshot(localDateString(),{allowDecrease:false,reason:editingId?'task-edited':'task-added'});
  return result(true,editingId?'任務已更新。':'任務已新增。',{task:saved});
}

export function removeTaskDefinition(id){
  let mode='';update(()=>{const g=getGame(),t=(g.tasks||[]).find(x=>String(x.id)===String(id));if(!t)return;const hasHistory=(g.taskRecords||[]).some(r=>String(r.taskId)===String(id));if(hasHistory){t.archived=true;t.active=false;t.archivedAt=new Date().toISOString();t.activeUntil=t.activeUntil||localDateString();mode='archived'}else{g.tasks=g.tasks.filter(x=>String(x.id)!==String(id));mode='deleted'}invalidateExamTargets(g)});
  return mode?result(true,mode==='archived'?'任務已有歷史紀錄，已改為封存。':'任務已刪除。',{mode}):result(false,'找不到任務。');
}

export function toggleTaskDateCancellation(id,dateStr=localDateString()){
  if(!validDate(dateStr))return result(false,'日期格式不正確。');const g=getGame(),t=(g.tasks||[]).find(x=>String(x.id)===String(id));if(!t)return result(false,'找不到任務。');
  const cancelled=Array.isArray(t.cancelledDates)&&t.cancelledDates.includes(dateStr);
  if(!cancelled){
    if((g.taskRecords||[]).some(r=>String(r.taskId)===String(id)&&r.date===dateStr&&r.status==='completed'))return result(false,'這天已有完成紀錄，不能再用取消排程移除；請用家長核定處理成果。');
    if(!isTaskScheduled(t,dateStr))return result(false,'這個任務在指定日期原本就沒有排程。');
  }
  update(()=>{const live=(getGame().tasks||[]).find(x=>String(x.id)===String(id));live.cancelledDates=Array.isArray(live.cancelledDates)?live.cancelledDates:[];live.cancelledDates=cancelled?live.cancelledDates.filter(d=>d!==dateStr):[...new Set([...live.cancelledDates,dateStr])].sort();invalidateExamTargets(getGame())});
  if(dateStr===localDateString())reconcileDailyBalanceSnapshot(dateStr,{allowDecrease:true,reason:cancelled?'task-date-restored':'task-date-cancelled'});
  return result(true,cancelled?`已恢復 ${dateStr} 的任務。`:`已取消 ${dateStr} 的任務。`,{cancelled:!cancelled});
}

export function pendingTaskReviews(){return(getGame().taskRecords||[]).filter(r=>r.approvalStatus==='pending').slice().sort((a,b)=>String(b.completedAt||b.createdAt||b.id).localeCompare(String(a.completedAt||a.createdAt||a.id)))}
export function reviewPendingTask(recordId,ratio){return reviewTaskRecord(recordId,ratio)}
