import { getGame, save } from '../core/store.js';
import { localDateString } from '../core/date.js';
import { semesterWeekIndex } from '../world/world-service.js';
import { JOB_RULES, JOB_AWAKEN_CONFIG, BEGINNER_SKILL_JOB_WEIGHTS } from './job-rules.js';

const result=(ok,message,data={})=>({ok,message,...data});

function approvalRatio(record){
  if(record?.approvalStatus!=='approved')return 0;
  if(Number.isFinite(Number(record.approvalRatio)))return Math.max(0,Math.min(1,Number(record.approvalRatio)));
  if(Number.isFinite(Number(record.approvalPercent)))return Math.max(0,Math.min(1,Number(record.approvalPercent)/100));
  return 1;
}

function statMap(value){
  if(!value||typeof value!=='object')return{};
  if(value.multi&&value.gains&&typeof value.gains==='object')return value.gains;
  if(value.stat)return{[value.stat]:Number(value.value)||0};
  return value;
}

export function approvedAwakeningRecords(game=getGame()){
  return (game.taskRecords||[]).filter(r=>
    r?.status==='completed' &&
    r.approvalStatus==='approved' &&
    approvalRatio(r)>0 &&
    r.voluntaryChallenge!==true
  );
}

export function jobGrowthValue(key,game=getGame()){
  return approvedAwakeningRecords(game).reduce((sum,r)=>{
    const saved=statMap(r.approvedRewards?.statGain);
    if(Number.isFinite(Number(saved?.[key])))return sum+Math.max(0,Number(saved[key]));
    const raw=Number(statMap(r.rollback?.statGain||r.rewards?.statGain)?.[key])||0;
    return sum+Math.max(0,Math.round(raw*approvalRatio(r)));
  },0);
}

function totalGrowth(game){return['str','int','agi','will','virtue'].reduce((n,k)=>n+jobGrowthValue(k,game),0)}
function growthShare(key,game){const total=totalGrowth(game);return total>0?jobGrowthValue(key,game)/total:0}
function dualQualified(rule,game){
  if(rule.kind!=='dual')return true;
  const[a,b]=rule.cores,sa=growthShare(a,game),sb=growthShare(b,game),va=jobGrowthValue(a,game),vb=jobGrowthValue(b,game);
  const balance=Math.max(va,vb)>0?Math.min(va,vb)/Math.max(va,vb):0;
  return sa>=JOB_AWAKEN_CONFIG.dualMinEachShare&&sb>=JOB_AWAKEN_CONFIG.dualMinEachShare&&balance>=JOB_AWAKEN_CONFIG.dualBalanceRatio;
}
function coreShare(rule,game){return rule.kind==='dual'?Math.min(...rule.cores.map(k=>growthShare(k,game))):growthShare(rule.core,game)}

function beginnerSkillAffinity(jobName,game){
  const usage=game.hero?.skillUsage||{},ids=Object.keys(BEGINNER_SKILL_JOB_WEIGHTS);
  const total=ids.reduce((n,id)=>n+(Number(usage[id])||0),0);
  if(total<=0)return 0;
  return ids.reduce((n,id)=>n+((Number(usage[id])||0)/total)*(BEGINNER_SKILL_JOB_WEIGHTS[id]?.[jobName]||0),0);
}

function jobScore(rule,game){
  if(rule.kind==='dual'){
    if(!dualQualified(rule,game))return-1;
    const[a,b]=rule.cores.map(k=>jobGrowthValue(k,game)),balanced=(2*a*b)/(a+b||1);
    return balanced*1.45+Math.min(a,b)*.20;
  }
  return jobGrowthValue(rule.core,game)+jobGrowthValue(rule.secondary,game)*.10;
}
function blendedScore(rule,game){
  const reality=Math.max(0,jobScore(rule,game)),usage=game.hero?.skillUsage||{};
  if(!Object.values(usage).some(v=>Number(v)>0))return reality;
  return reality*(.75+.25*beginnerSkillAffinity(rule.name,game));
}

export function currentJobCandidate(game=getGame()){
  const dual=JOB_RULES
    .filter(j=>j.kind==='dual'&&dualQualified(j,game))
    .map(j=>({j,score:blendedScore(j,game)})).sort((a,b)=>b.score-a.score);
  if(dual.length&&(dual.length===1||dual[0].score>=dual[1].score*JOB_AWAKEN_CONFIG.leadRatio))return dual[0].j;

  const single=JOB_RULES
    .filter(j=>j.kind==='single'&&coreShare(j,game)>=JOB_AWAKEN_CONFIG.minCoreGrowthShare)
    .map(j=>({j,score:blendedScore(j,game)})).sort((a,b)=>b.score-a.score);
  if(!single.length)return null;
  if(single.length===1||single[0].score>=single[1].score*JOB_AWAKEN_CONFIG.leadRatio)return single[0].j;
  return null;
}

export function daysSinceSemesterStart(game=getGame(),dateStr=localDateString()){
  const start=String(game.semester?.startDate||dateStr),a=new Date(start+'T12:00:00'),b=new Date(dateStr+'T12:00:00');
  return Number.isFinite(a.getTime())&&Number.isFinite(b.getTime())?Math.max(0,Math.floor((b-a)/86400000)):0;
}

function recordCandidateSnapshot(game,candidate){
  if(!candidate)return false;
  const week=semesterWeekIndex(localDateString()),history=game.hero.jobCandidateHistory||(game.hero.jobCandidateHistory=[]);
  const found=history.find(x=>Number(x.week)===Number(week));
  if(found){found.job=candidate.name;found.date=localDateString()}
  else history.push({week,job:candidate.name,date:localDateString()});
  return true;
}

export function stableCandidateWeeks(name,game=getGame()){
  const history=[...(game.hero?.jobCandidateHistory||[])].sort((a,b)=>Number(b.week)-Number(a.week));
  let count=0,last=null;
  for(const row of history){
    if(row.job!==name)break;
    if(last!==null&&Number(row.week)!==last-1)break;
    count++;last=Number(row.week);
  }
  return count;
}

function strongestFallback(game){
  const ranked=JOB_RULES.map(j=>({
    j,score:blendedScore(j,game),
    qualified:j.kind==='dual'?dualQualified(j,game):coreShare(j,game)>=JOB_AWAKEN_CONFIG.minCoreGrowthShare
  })).sort((a,b)=>b.score-a.score);
  return(ranked.find(x=>x.qualified)||ranked[0]||{}).j||null;
}

export function awakeningDiagnostic(game=getGame()){
  const days=daysSinceSemesterStart(game),records=approvedAwakeningRecords(game).length,candidate=currentJobCandidate(game),stable=candidate?stableCandidateWeeks(candidate.name,game):0;
  const safetyReady=days>=JOB_AWAKEN_CONFIG.safetyDays&&records>=JOB_AWAKEN_CONFIG.minTaskRecords;
  let reason='';
  if(game.hero?.jobAwakened)reason='已完成覺醒';
  else if(days<JOB_AWAKEN_CONFIG.observationDays)reason=`觀察天數不足（還差 ${JOB_AWAKEN_CONFIG.observationDays-days} 天）`;
  else if(records<JOB_AWAKEN_CONFIG.minTaskRecords)reason=`任務紀錄不足（還差 ${JOB_AWAKEN_CONFIG.minTaskRecords-records} 筆）`;
  else if(!candidate)reason=safetyReady?'候選仍接近，已可啟動最晚覺醒保險':'候選職業尚未拉開差距';
  else if(stable<JOB_AWAKEN_CONFIG.stableWeeks)reason=safetyReady?'候選尚未穩定，已可啟動最晚覺醒保險':`候選穩定度不足（${stable}/${JOB_AWAKEN_CONFIG.stableWeeks}週）`;
  else reason='自然覺醒條件已滿足';
  return{days,records,candidate,stable,safetyReady,reason,fallback:strongestFallback(game)};
}

export function evaluateNaturalAwakening(){
  const game=getGame(),hero=game.hero;
  if(!hero||hero.jobAwakened)return result(false,'已完成覺醒。',{awakened:false});
  hero.heroClass='見習勇者';

  const diagnostic=awakeningDiagnostic(game);
  if(diagnostic.days<JOB_AWAKEN_CONFIG.observationDays||diagnostic.records<JOB_AWAKEN_CONFIG.minTaskRecords)return result(false,diagnostic.reason,{awakened:false,diagnostic});

  const candidate=currentJobCandidate(game);
  let changed=recordCandidateSnapshot(game,candidate),chosen=null,safety=false;
  if(candidate&&stableCandidateWeeks(candidate.name,game)>=JOB_AWAKEN_CONFIG.stableWeeks)chosen=candidate;
  else if(diagnostic.days>=JOB_AWAKEN_CONFIG.safetyDays){chosen=strongestFallback(game);safety=!!chosen}

  if(!chosen){if(changed)save();return result(false,awakeningDiagnostic(game).reason,{awakened:false,diagnostic:awakeningDiagnostic(game)})}

  hero.heroClass=chosen.name;
  hero.jobAwakened=true;
  hero.jobPassive=chosen.passive;
  save();
  return result(true,`✨ ${hero.name} 自然覺醒為【${chosen.name}】！${safety?'（最晚覺醒保險判定）':''}`,{awakened:true,className:chosen.name,safety,diagnostic:awakeningDiagnostic(game)});
}

export function recordBeginnerSkillUsage(skillId){
  const game=getGame(),hero=game.hero;
  if(!hero||hero.jobAwakened||!BEGINNER_SKILL_JOB_WEIGHTS[skillId])return false;
  hero.skillUsage=hero.skillUsage&&typeof hero.skillUsage==='object'?hero.skillUsage:{};
  hero.skillUsage[skillId]=(Number(hero.skillUsage[skillId])||0)+1;
  hero.skillUsageByDate=hero.skillUsageByDate&&typeof hero.skillUsageByDate==='object'?hero.skillUsageByDate:{};
  const day=localDateString(),row=hero.skillUsageByDate[day]||(hero.skillUsageByDate[day]={});
  row[skillId]=(Number(row[skillId])||0)+1;
  save();
  return true;
}
