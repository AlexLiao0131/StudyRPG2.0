import { getFamily, getGame, save } from '../core/store.js';
import { localDateString } from '../core/date.js';
import { examEventForDate, examEnergyReport, eventSubjectIds, examSubjectById, energyStage, energyStageText } from './exam-energy.js';

const MIN_BOSS_POWER=70;
const MULTIPLIER=Object.freeze({midterm:1.10,final:1.20});
const ROLE_TEXT=Object.freeze({hp:'最大HP',magic:'魔攻／魔防',physical:'物攻／物防'});

function subjectRole(subject,index=0){
  const id=String(subject?.id||'').toLowerCase(),name=String(subject?.name||'');
  if(id==='chinese'||/國語|中文|華語/.test(name))return'hp';
  if(id==='english'||/英語|英文|國際文化/.test(name))return'magic';
  if(id==='math'||/數學|數理/.test(name))return'physical';
  return ['hp','magic','physical'][index%3];
}
function profileId(){return String(getFamily().activeProfileId||'hero_1')}
function configSignature(evt,report){
  const g=getGame(),ids=eventSubjectIds(evt),required=ids.map(id=>`${id}:${Number(report.byCourse?.[id]?.required||0).toFixed(4)}`).join('|');
  return[
    evt.id||'',evt.type||'',evt.date||'',ids.join(','),
    g.examBossBaseline?.date||'',Number(g.examBossBaseline?.nakedPower||0).toFixed(4),required
  ].join('::');
}

export function examBossPower(evt){
  if(!evt||!['midterm','final'].includes(evt.type))return 0;
  const g=getGame(),report=examEnergyReport(evt),sig=configSignature(evt,report),key=String(evt.id||`${evt.type}_${evt.date}`),
    legacy=evt.bossPowerByProfile?.[profileId()];
  g.campaignProgress=g.campaignProgress||{};
  g.campaignProgress.examBossLocks=g.campaignProgress.examBossLocks||{};
  const old=g.campaignProgress.examBossLocks[key];
  if(old?.signature===sig&&Number(old.power)>0)return Number(old.power);
  if(legacy&&Number(legacy.power)>0&&!old){
    g.campaignProgress.examBossLocks[key]={power:Number(legacy.power),signature:sig,lockedAt:String(legacy.lockedAt||new Date().toISOString()),source:'legacy-event-lock'};
    save();return Number(legacy.power);
  }
  const base=Math.max(1,Number(g.examBossBaseline?.nakedPower)||1),
    expectedHero=base+Math.max(0,Number(report.required)||0),
    power=Math.max(MIN_BOSS_POWER,Math.round(expectedHero*(MULTIPLIER[evt.type]||1.10)));
  g.campaignProgress.examBossLocks[key]={power,signature:sig,lockedAt:new Date().toISOString(),baselineNakedPower:base,equipmentExcluded:true,source:'2.0-exam-boss-service'};
  save();return power;
}

export function examBattleContext(evt){
  if(!evt||!['midterm','final'].includes(evt.type))return null;
  const report=examEnergyReport(evt),ids=eventSubjectIds(evt),
    results=ids.map((id,index)=>{
      const subject=examSubjectById(id)||{id,name:id},r=report.byCourse?.[id]||{approved:0,required:0},stage=energyStage(r);
      return{name:subject.name,id,stage,role:subjectRole(subject,index),weaken:stage>0?.12*stage:0,required:Number(r.required)||0,approved:Number(r.approved)||0};
    }),
    eligible=results.filter(x=>x.required>0);
  return{
    eventId:String(evt.id||''),eventType:evt.type,eventDate:evt.date,eventName:evt.name||'考試 Boss',
    power:examBossPower(evt),results,allFull:eligible.length>0&&eligible.every(x=>x.stage>=1),shieldPct:.15,
    report:{required:report.required,approved:report.approved,ratio:report.ratio}
  };
}

export function currentExamBattle(dateStr=localDateString()){
  const evt=examEventForDate(dateStr);
  return evt?{event:evt,context:examBattleContext(evt)}:null;
}

export function applyExamBreakToEnemy(unit,context){
  if(!unit||!context||!['midterm','final'].includes(context.eventType))return unit;
  if(unit._examBreakEventId===context.eventId)return unit;
  for(const row of context.results||[]){
    const weaken=Math.max(0,Math.min(.50,Number(row.weaken)||0));if(weaken<=0)continue;
    if(row.role==='hp'){
      unit.maxHp=Math.max(1,Math.round(unit.maxHp*(1-weaken)));unit.hp=Math.min(unit.hp,unit.maxHp);
    }else if(row.role==='magic'){
      unit.magicAttack*=1-weaken;unit.magicDefense*=1-weaken;
    }else{
      unit.attack*=1-weaken;unit.defense*=1-weaken;
    }
  }
  unit._examBreakEventId=context.eventId;return unit;
}

export function initializeExamBattleState(state,context,log=()=>{}){
  if(!state||!context)return;
  state.examContext=context;
  for(const row of context.results||[]){
    log(`📚 ${row.name}：${energyStageText(row.stage)}${row.stage>0?`｜Boss ${ROLE_TEXT[row.role]} −${Math.round(row.weaken*100)}%`:''}`);
  }
  if(context.allFull){
    const amount=Math.max(1,Math.round(state.hero.maxHp*Number(context.shieldPct||.15)));
    state.examEnergyShield={hp:amount,maxHp:amount};
    state.hero.statuses=state.hero.statuses||[];
    state.hero.statuses.push({type:'exam_energy_shield',name:`📚 完全備戰護盾 ${amount}`,turns:999,effectType:'buff',mods:{},unstealable:true});
    log(`🌟 全部考科完全破盾：勇者獲得 ${amount} 點考前護盾！`);
  }
}

export function absorbExamShield(state,result,log=()=>{}){
  const shield=state?.examEnergyShield;
  if(!shield||shield.hp<=0||!result?.damage)return result;
  const absorbed=Math.min(Number(result.damage)||0,Number(shield.hp)||0);
  if(absorbed<=0)return result;
  shield.hp-=absorbed;result.damage=Math.max(0,(Number(result.damage)||0)-absorbed);
  const status=state.hero?.statuses?.find(s=>s.type==='exam_energy_shield');
  if(shield.hp<=0){
    state.hero.statuses=(state.hero.statuses||[]).filter(s=>s.type!=='exam_energy_shield');
    log('💫 考前護盾已耗盡。');
  }else if(status)status.name=`📚 完全備戰護盾 ${Math.round(shield.hp)}`;
  log(`🛡️ 考前護盾吸收 ${Math.round(absorbed)} 傷害。`);
  return result;
}
