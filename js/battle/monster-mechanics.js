import { addStatus } from './battle-math.js';

export const MULTI_ENEMY_RULES=Object.freeze({maxEnemies:4,maxSummons:3,removeSummonsWhenBossDies:true});

export const MIRROR_RULES=Object.freeze({
  hpScale:.95,
  defensePierce:.50,
  minDamagePct:.02
});

const SUMMON_RULES=Object.freeze({
  goblin_king:{maxActiveSummons:2,maxTotalSummons:2,mpCost:40,candidates:[{id:'goblin_slave',weight:50},{id:'goblin_soldier',weight:35},{id:'goblin_shaman',weight:15,maxActive:1}]}
});

const APOCALYPSE_POWER_LABELS=Object.freeze({
  war:'戰爭',
  plague:'瘟疫',
  famine:'饑荒',
  death:'死亡'
});

const BATTLE_START_MECHANICS=Object.freeze({
  plague_field:{kind:'plague_field'},
  death_mark:{kind:'death_mark'},
  roll_two_apocalypse_powers:{kind:'apocalypse_roll',rollCount:2,pool:['war','plague','famine','death']}
});

function weightedCandidate(rule,engine){
  const live=engine.livingEnemies(),pool=[];
  for(const c of rule.candidates||[]){
    const active=live.filter(x=>x.isSummon&&x.monsterId===c.id).length;
    if(c.maxActive!=null&&active>=Number(c.maxActive))continue;
    pool.push({item:c,weight:Number(c.weight||1)});
  }
  if(!pool.length)return null;
  let r=Math.random()*pool.reduce((n,x)=>n+x.weight,0);
  for(const x of pool){r-=x.weight;if(r<=0)return x.item}
  return pool.at(-1)?.item||null;
}

function applyPlagueField(engine){
  addStatus(engine.state.hero,{type:'disease',name:'疾病',effectType:'debuff',turns:99,mods:{healingReceived:-.50}});
}

function shuffledUnique(values=[]){
  const result=[...values];
  for(let i=result.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [result[i],result[j]]=[result[j],result[i]];
  }
  return result;
}

export function applyBattleStartMechanics(engine,unit){
  const id=engine.aiFor(unit.monsterId)?.battleStartMechanic;
  const mechanic=BATTLE_START_MECHANICS[id];
  if(!mechanic)return;

  if(mechanic.kind==='plague_field'){
    applyPlagueField(engine);
    engine.log('☣️ 瘟疫領域展開：勇者受到疾病影響。');
    return;
  }

  if(mechanic.kind==='death_mark'){
    unit.apocalypsePowers=['death'];
    addStatus(engine.state.hero,{type:'death_mark',name:'死亡標記',effectType:'debuff',turns:10,mods:{}});
    engine.log('☠️ 死亡標記：死亡之力會隨戰鬥回合提高傷害。');
    return;
  }

  if(mechanic.kind==='apocalypse_roll'){
    unit.apocalypsePowers=shuffledUnique(mechanic.pool).slice(0,Number(mechanic.rollCount||2));
    const labels=unit.apocalypsePowers.map(x=>APOCALYPSE_POWER_LABELS[x]||x);
    engine.log(`🎲 ${unit.name}取得天啟能力：${labels.join('＋')}`);
    if(unit.apocalypsePowers.includes('plague'))applyPlagueField(engine);
  }
}

export function canUseSummonSkill(engine,unit,skill){
  if(engine.livingEnemies().length>=MULTI_ENEMY_RULES.maxEnemies)return false;
  if(engine.livingEnemies().filter(x=>x.isSummon).length>=MULTI_ENEMY_RULES.maxSummons)return false;
  const rule=SUMMON_RULES[unit.monsterId];if(!rule)return true;
  const owned=engine.livingEnemies().filter(x=>x.isSummon&&x.summonedBy===unit.uid);
  if(owned.length>=Number(rule.maxActiveSummons||99))return false;
  if(Number(unit.summonTotal||0)>=Number(rule.maxTotalSummons||99))return false;
  if(Number(unit.mp||0)<Number(skill.mpCost??rule.mpCost??0))return false;
  return !!weightedCandidate(rule,engine);
}

export function executeSummonSkill(engine,unit,skill){
  const rule=SUMMON_RULES[unit.monsterId];
  if(!rule)return null;
  const pick=weightedCandidate(rule,engine);if(!pick)return null;
  const cost=Number(skill.mpCost??rule.mpCost??0);if(Number(unit.mp||0)<cost)return null;
  const summon=engine.summonEnemy(pick.id,unit,{statScale:.82,hpScale:.52});if(!summon)return null;
  unit.mp=Math.max(0,Number(unit.mp||0)-cost);unit.summonTotal=Number(unit.summonTotal||0)+1;
  engine.log(`📣 ${unit.name}消耗${cost} MP，召喚「${summon.name}」！本場 ${unit.summonTotal}/${rule.maxTotalSummons}。`);
  return summon;
}

function necromancerBoss(engine){return engine.livingEnemies().find(x=>x.monsterId==='necromancer')||null}
function linkedSkeleton(engine,boss){return engine.livingEnemies().find(x=>x.isSummon&&x.summonedBy===boss?.uid&&x.soulLinked)||null}

export function afterEnemyDamaged(engine,unit){
  if(unit.monsterId==='zombie'&&unit.hp<=0&&!unit.reviveUsed){
    unit.reviveUsed=true;unit.hp=Math.max(1,Math.round(unit.maxHp*.30));unit.alive=true;engine.log(`🧟 ${unit.name}死而復生！恢復30% HP。`);return;
  }
  if(unit.monsterId==='necromancer'&&unit.hp>0&&!unit.ritualTriggered&&unit.hp/unit.maxHp<=.70){
    unit.ritualTriggered=true;unit.ritualActive=true;unit.ritualStartRound=engine.state.round;unit.ritualSecondSummoned=false;
    const linked=engine.summonEnemy('skeleton',unit,{statScale:.55,hpScale:.42,forceBasicOnly:true,name:'靈魂連結骷髏',soulLinked:true});
    if(linked){engine.log('🕯️ 死靈法師 HP 降至70%：開始「靈魂儀式」！');engine.log('🔗 靈魂連結骷髏現身；儀式期間死靈法師停止攻擊。')}
  }
  if(unit.hp<=0&&unit.soulLinked){
    const boss=necromancerBoss(engine);
    if(boss){
      boss.ritualActive=false;
      addStatus(boss,{type:'stun',name:'暈眩',turns:1,power:0,mods:{},effectType:'debuff',guaranteedSkip:true});
      addStatus(boss,{type:'ritual_break',name:'儀式破綻',turns:2,power:0,mods:{damageTaken:.30},effectType:'debuff'});
      engine.log('⛓️ 靈魂連結被打破！死靈法師暈眩，並承受30%額外傷害。');
    }
  }
}

export function beforeEnemyStatusTick(engine,unit){
  const ai=engine.aiFor(unit.monsterId);
  if(ai.passive?.healMaxHpPerTurn&&unit.hp>0&&unit.hp<unit.maxHp){
    const heal=Math.max(1,Math.round(unit.maxHp*Number(ai.passive.healMaxHpPerTurn)));
    unit.hp=Math.min(unit.maxHp,unit.hp+heal);
    engine.log(`♻️ ${unit.name}再生 ${heal} HP。`);
    engine.emit({type:'enemy-state',unitUid:unit.uid});
  }
}

export function beforeEnemyTurn(engine,unit){
  if(unit.monsterId==='necromancer'&&unit.ritualActive&&linkedSkeleton(engine,unit)){
    engine.log('🕯️ 死靈法師正在維持靈魂儀式，本回合停止攻擊！');return true;
  }
  return false;
}

export function executeTriggerSkill(engine,unit,skill){
  let changed=false;
  if(Number(skill.healMaxHp)>0){
    const heal=Math.max(1,Math.round(unit.maxHp*Number(skill.healMaxHp)));
    unit.hp=Math.min(unit.maxHp,unit.hp+heal);
    engine.log(`💚 ${unit.name}恢復 ${heal} HP。`);
    changed=true;
  }

  const mods={};
  if(skill.speedMultiplier!=null)mods.speed=unit.speed*(Number(skill.speedMultiplier)-1);
  if(skill.atkMultiplier!=null)mods.attack=unit.attack*(Number(skill.atkMultiplier)-1);
  if(skill.matkMultiplier!=null)mods.magicAttack=unit.magicAttack*(Number(skill.matkMultiplier)-1);
  if(Object.keys(mods).length){
    addStatus(unit,{type:skill.id,name:skill.name,effectType:'buff',turns:Number(skill.duration||99),mods});
    changed=true;
  }

  if(changed)engine.emit({type:'enemy-state',unitUid:unit.uid});
  return changed;
}

export function enemyDamageMultiplier(engine,unit){
  const powers=unit.apocalypsePowers||[];
  let multiplier=1;
  if(powers.includes('death'))multiplier*=1+.05*Math.min(10,Math.max(0,Number(engine.state.round)-1));
  if(powers.includes('war'))multiplier*=1.30;
  return multiplier;
}

export function afterEnemyDamageResolved(engine,unit,skill){
  const faminePct=Number(skill.resourceDamageMaxPct||0)||((unit.apocalypsePowers||[]).includes('famine') ? .05 : 0);
  if(faminePct>0){
    const cut=Math.max(1,Math.round(engine.state.hero.maxEnergy*faminePct));
    engine.state.heroEnergy=Math.max(0,engine.state.heroEnergy-cut);
    engine.log(`⚡ ${engine.state.hero.name}被削減 ${cut} 點能量。`);
    engine.emit({type:'hero-resource',value:engine.state.heroEnergy});
  }
}

export function afterRound(engine){
  const boss=necromancerBoss(engine);if(!boss?.ritualActive)return;
  const linked=linkedSkeleton(engine,boss);if(!linked)return;
  const elapsed=Math.max(0,Number(engine.state.round)-Number(boss.ritualStartRound||engine.state.round));
  const left=Math.max(0,5-elapsed);if(elapsed>0&&left>0)engine.log(`⏳ 靈魂儀式倒數：剩 ${left} 回合！`);
  if(left<=0&&!boss.ritualSecondSummoned){
    boss.ritualSecondSummoned=true;
    const second=engine.summonEnemy('skeleton',boss,{statScale:.55,hpScale:.38,forceBasicOnly:true,name:'儀式增援骷髏'});
    if(second)engine.log('☠️ 儀式失控！第2隻骷髏甦醒！');
  }
}

export function afterEnemyDefeated(engine,unit){
  if(unit.isSummon)return;
  if(!MULTI_ENEMY_RULES.removeSummonsWhenBossDies)return;
  for(const s of engine.state.enemies){if(s.isSummon){s.hp=0;s.alive=false}}
}
