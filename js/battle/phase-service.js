import { phaseDescriptorForMonster, phaseEntryRule, previousPhaseMonsterId } from './phase-database.js';

const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const object=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const scope=v=>String(v||'default');

function historyRoot(campaignProgress={}){
  if(!campaignProgress.phaseHistory||typeof campaignProgress.phaseHistory!=='object'||Array.isArray(campaignProgress.phaseHistory))campaignProgress.phaseHistory={};
  return campaignProgress.phaseHistory;
}

function scopedHistory(campaignProgress={},scopeKey='',create=false){
  const root=historyRoot(campaignProgress),key=scope(scopeKey);
  if(create&&!root[key])root[key]={};
  return {key,history:object(root[key])};
}

export function phaseHistoryFor(campaignProgress,monsterId,scopeKey=''){
  const d=phaseDescriptorForMonster(monsterId);if(!d)return null;
  const scoped=scopedHistory(campaignProgress,scopeKey,false);
  return scoped.history[d.chainId]||null;
}

export function applyPhaseEntryModifiers(unit,{monsterId,campaignProgress={},scopeKey=''}={}){
  const d=phaseDescriptorForMonster(monsterId);if(!d)return null;
  const rule=phaseEntryRule(monsterId)||{},previousMonsterId=previousPhaseMonsterId(monsterId),chainHistory=phaseHistoryFor(campaignProgress,monsterId,scopeKey),previousRecord=previousMonsterId?chainHistory?.phases?.[previousMonsterId]||null:null;
  const appliedModifiers=[];

  if(rule.startsAtFullHp)unit.hp=unit.maxHp;
  for(const modifier of rule.modifiers||[]){
    const raw=previousRecord?.[modifier.sourceMetric];
    if(!Number.isFinite(Number(raw)))continue;
    const metric=clamp(Number(raw),0,1),maxReduction=clamp(Number(modifier.maxReduction)||0,0,.95),factor=1-maxReduction*metric;
    if(modifier.targetStat&&Number.isFinite(Number(unit[modifier.targetStat]))){
      unit[modifier.targetStat]=Number(unit[modifier.targetStat])*factor;
      appliedModifiers.push({sourceMetric:modifier.sourceMetric,targetStat:modifier.targetStat,metric,maxReduction,factor});
    }
  }

  let message='';
  if(appliedModifiers.length){
    const m=appliedModifiers[0];
    message=`👿 上一階段造成 ${Math.round(m.metric*100)}% 傷害｜本階段 ${m.targetStat==='magicAttack'?'魔力':'能力'}倍率 ${Math.round(m.factor*100)}%。`;
  }
  return {chainId:d.chainId,phaseNumber:d.phaseNumber,phaseCount:d.chain.phases.length,scopeKey:scope(scopeKey),previousMonsterId,previousRecord:previousRecord?{...previousRecord}:null,appliedModifiers,message};
}

export function recordPhaseBattle({campaignProgress={},monsterId,result='',rounds=0,enemyHp=0,enemyMaxHp=0,heroHp=0,heroMaxHp=0,date='',eventType='',scopeKey=''}={}){
  const d=phaseDescriptorForMonster(monsterId);if(!d)return null;
  const scoped=scopedHistory(campaignProgress,scopeKey,true),root=historyRoot(campaignProgress);
  const scopedObject=root[scoped.key]=object(root[scoped.key]),chain=scopedObject[d.chainId]=object(scopedObject[d.chainId]);
  chain.chainId=d.chainId;chain.scopeKey=scoped.key;chain.phases=object(chain.phases);
  const maxHp=Math.max(0,Number(enemyMaxHp)||0),hp=clamp(Number(enemyHp)||0,0,Math.max(0,maxHp));
  const record={
    monsterId,phaseNumber:d.phaseNumber,result:String(result||''),date:String(date||''),eventType:String(eventType||''),rounds:Math.max(0,Number(rounds)||0),
    enemyHp:hp,enemyMaxHp:maxHp,enemyDamageRatio:maxHp>0?clamp(1-hp/maxHp,0,1):0,
    heroHp:Math.max(0,Number(heroHp)||0),heroMaxHp:Math.max(0,Number(heroMaxHp)||0),recordedAt:new Date().toISOString()
  };
  chain.phases[monsterId]=record;chain.lastMonsterId=monsterId;chain.lastPhaseNumber=d.phaseNumber;chain.updatedAt=record.recordedAt;
  return {...record,chainId:d.chainId,scopeKey:scoped.key};
}
