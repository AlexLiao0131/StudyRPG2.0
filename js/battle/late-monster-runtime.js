import { addStatus, effectMod } from './battle-math.js';

const HARVEST_STATUSES=Object.freeze(['disease','curse','fear','swamp_corruption']);
const INTERRUPTIBLE_CHARGES=Object.freeze({
  centaur_knight:'centaur_knight_charge',
  cyclops:'cyclops_devastating_swing',
  sky_pirate_captain:'captain_airship_cannon',
  pegasus_knight:'pegasus_sky_charge',
  sky_colossus:'colossus_destruction_cannon',
  demon_dragon_phase1:'dragon1_breath',
  demon_dragon_phase2:'dragon2_meteor_breath'
});

const SUPPLEMENTAL_MONSTERS=Object.freeze({
  kraken_tentacle_left:{id:'kraken_tentacle_left',name:'克拉肯左觸手',family:'sea',boss:false,finalBoss:false,mirrorHero:false},
  kraken_tentacle_right:{id:'kraken_tentacle_right',name:'克拉肯右觸手',family:'sea',boss:false,finalBoss:false,mirrorHero:false},
  skeleton_dragon:{id:'skeleton_dragon',name:'骷髏巨龍',family:'undead_dragon',boss:false,finalBoss:false,mirrorHero:false}
});

const WEEK11_SKILL_OVERRIDES=Object.freeze({
  goblin_soldier:Object.freeze([{id:'goblin_slash',weight:3},{id:'goblin_fierce_thrust',weight:2}]),
  orc_warrior:Object.freeze([{id:'orc_swing',weight:3},{id:'orc_charge',weight:1}]),
  orc_shaman:Object.freeze([{id:'staff_hit',weight:2},{id:'chain_lightning',weight:3},{id:'orc_soul_heal',weight:5,condition:'low_hp',threshold:.40}])
});

export function lateMonsterDef(id){return SUPPLEMENTAL_MONSTERS[id]||null}

export function lateSkillEntries(engine,unit,entries=[]){
  if(Number(engine?.week)!==11)return entries;
  return WEEK11_SKILL_OVERRIDES[unit?.monsterId]||entries;
}

function heroHas(engine,type){
  return !!engine?.state?.hero?.statuses?.some(s=>s.type===type&&Number(s.turns)>0);
}
function activeHarvest(engine){
  return HARVEST_STATUSES.filter(type=>heroHas(engine,type));
}
function ownedLiving(engine,owner,predicate=()=>true){
  return engine.livingEnemies().filter(x=>x.isSummon&&x.summonedBy===owner?.uid&&predicate(x));
}
function status(unit,type){return (unit?.statuses||[]).find(s=>s.type===type&&Number(s.turns)>0)}
function removeStatus(unit,type){unit.statuses=(unit.statuses||[]).filter(s=>s.type!==type)}
function permanent(unit,type,name,mods){
  removeStatus(unit,type);
  addStatus(unit,{type,name,turns:999,effectType:'buff',mods});
}
function temporary(unit,type,name,turns,mods,effectType='buff'){
  removeStatus(unit,type);
  addStatus(unit,{type,name,turns,effectType,mods});
}
function hasOwnedDamaged(engine,unit,flag){
  return ownedLiving(engine,unit,x=>x[flag]&&x.hp<x.maxHp).length>0;
}

export function lateSkillUsable(engine,unit,entry,skill){
  if(!skill)return false;
  const id=skill.id;

  if(skill.requiresHeroStatus&&!heroHas(engine,skill.requiresHeroStatus))return false;
  if(skill.requiresAnyHarvestStatus&&!activeHarvest(engine).length)return false;

  if(id==='bandit_smoke'&&heroHas(engine,'smoke_blind'))return false;
  if(id==='machine_arm_bind'&&heroHas(engine,'machine_bind'))return false;

  if(unit?.monsterId==='black_command_pillar'&&unit.coreExposed&&['pillar_attack_order','pillar_repair_order','pillar_defense_order'].includes(id))return false;
  if(['pillar_attack_order','pillar_repair_order'].includes(id)){
    const dolls=ownedLiving(engine,unit,x=>x.commandDoll);
    if(!dolls.length)return false;
    if(id==='pillar_repair_order'&&!dolls.some(x=>x.hp<x.maxHp))return false;
  }

  if(id==='murloc_slime_spit'&&heroHas(engine,'murloc_slime'))return false;
  if(id==='kraken_ink_shot'&&heroHas(engine,'kraken_ink'))return false;
  if(id==='tentacle_entangle'&&heroHas(engine,'tentacle_bind'))return false;
  if(id==='evil_murloc_heal'&&!hasOwnedDamaged(engine,unit,'week13Murloc'))return false;

  if(id==='flower_poison_pollen'&&heroHas(engine,'poison'))return false;
  if(id==='flower_vine_bind'&&heroHas(engine,'bind'))return false;
  if(id==='python_constrict'&&heroHas(engine,'python_constrict'))return false;
  if(id==='tyranno_roar'&&heroHas(engine,'primal_fear'))return false;

  if(id==='bat_disease_bite'&&heroHas(engine,'disease'))return false;
  if(['ghost_terror','banshee_scream','reaper_fear_gaze'].includes(id)&&heroHas(engine,'fear'))return false;
  if(['ghost_soul_curse','swamp_skeleton_cursed_blade','banshee_curse_song','reaper_harvest_curse'].includes(id)&&heroHas(engine,'curse'))return false;
  if(['swamp_skeleton_corrupt_dust','banshee_corrupt_wave','reaper_rotten_blade'].includes(id)&&heroHas(engine,'swamp_corruption'))return false;

  if(id==='zombie_lizard_rotten_bite'&&heroHas(engine,'disease'))return false;
  if(id==='zombie_lizard_corrupt_breath'&&heroHas(engine,'swamp_corruption'))return false;
  if(id==='hydra_venom_breath'&&heroHas(engine,'poison'))return false;
  if(id==='hydra_corrosive_breath'&&heroHas(engine,'ancient_corrosion'))return false;

  if(id==='pigman_warrior_breaker'&&heroHas(engine,'rift_armor_break'))return false;

  if(id==='flying_goblin_smoke'&&heroHas(engine,'sky_smoke'))return false;
  if(id==='wyvern_whirlwind'&&heroHas(engine,'wyvern_whirlwind'))return false;
  if(id==='sky_pirate_hook'&&heroHas(engine,'sky_hook'))return false;
  if(id==='captain_load_cannon'&&Number(unit?.cooldowns?.captain_airship_cannon||0)>0)return false;

  if(id==='sky_mage_wind_bind'&&heroHas(engine,'sky_wind_bind'))return false;
  if(id==='pegasus_wing_whirlwind'&&heroHas(engine,'slow'))return false;
  if(id==='pegasus_takeoff'&&Number(unit?.cooldowns?.pegasus_sky_charge||0)>0)return false;
  if(id==='colossus_core_charge'&&Number(unit?.cooldowns?.colossus_destruction_cannon||0)>0)return false;

  if(['final_necro_curse','skeleton_dragon_breath'].includes(id)&&heroHas(engine,'final_corruption'))return false;
  if(id==='skeleton_dragon_roar'&&heroHas(engine,'bone_roar'))return false;
  if(id==='final_necro_repair'){
    const dragon=engine.livingEnemies().find(x=>x.monsterId==='skeleton_dragon');
    if(!dragon||dragon.hp/dragon.maxHp>.85)return false;
  }
  if(id==='dragon1_breath_prep'&&Number(unit?.cooldowns?.dragon1_breath||0)>0)return false;
  if(id==='dragon2_meteor_breath_prep'&&Number(unit?.cooldowns?.dragon2_meteor_breath||0)>0)return false;

  return true;
}

function updateRebornLink(engine,boss){
  if(!boss?.week11SoulLinkActive)return;
  const left=ownedLiving(engine,boss,x=>x.week11Soul).length;
  removeStatus(boss,'week11_soul_link');
  if(left>=2){
    addStatus(boss,{type:'week11_soul_link',name:'🔗 靈魂連結 70%',turns:999,effectType:'buff',mods:{damageTaken:-.70},unstealable:true});
  }else if(left===1){
    addStatus(boss,{type:'week11_soul_link',name:'🔗 靈魂連結 35%',turns:999,effectType:'buff',mods:{damageTaken:-.35},unstealable:true});
    engine.log('🔗 只剩一隻亡魂：靈魂連結減傷降為35%。');
  }else{
    boss.week11SoulLinkActive=false;boss.week11SoulLinkBroken=true;
    addStatus(boss,{type:'week11_link_break',name:'⛓️ 靈魂連結破綻',turns:1,effectType:'debuff',mods:{damageTaken:.30}});
    addStatus(boss,{type:'stun',name:'暈眩',turns:1,effectType:'debuff',mods:{},guaranteedSkip:true});
    engine.log('⛓️ 兩隻亡魂全數擊破：死靈法師暈眩1回合，並受到30%額外傷害。');
  }
}

function summonWeek11Souls(engine,boss){
  if(boss.week11SoulsSummoned||boss.hp<=0)return;
  boss.week11SoulsSummoned=true;boss.week11SoulLinkActive=true;
  const pool=['human_bandit','goblin_soldier','orc_warrior','orc_shaman'];
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}
  const made=[];
  for(const id of pool.slice(0,2)){
    const s=engine.summonEnemy(id,boss,{statScale:.62,hpScale:.34});
    if(s){s.week11Soul=true;s.name=`亡魂・${s.name}`;made.push(s)}
  }
  if(made.length){
    updateRebornLink(engine,boss);
    engine.log(`👻 復活的死靈法師召喚「${made.map(x=>x.name).join('」與「')}」並建立靈魂連結。`);
  }else boss.week11SoulLinkActive=false;
}

function summonPillarDolls(engine,pillar){
  if(pillar.commandDollsSummoned||pillar.hp<=0)return;
  pillar.commandDollsSummoned=true;
  let count=0;
  for(let i=0;i<2;i++){
    const d=engine.summonEnemy('guardian_doll',pillar,{statScale:.62,hpScale:.34});
    if(d){d.commandDoll=true;d.name=`指令人偶 ${i+1}`;count++}
  }
  if(count)engine.log('🗿 黑色發光石柱喚醒兩具守護人偶，防衛系統啟動。');
}
function exposePillar(engine,pillar){
  if(pillar.coreExposed)return;
  if(ownedLiving(engine,pillar,x=>x.commandDoll).length)return;
  pillar.coreExposed=true;
  temporary(pillar,'pillar_core_exposed','⚫ 控制核心暴露',999,{defense:-pillar.defense*.30,magicDefense:-pillar.magicDefense*.30},'debuff');
  engine.log('⚫ 指令人偶全數停止：石柱失去指令技能，防禦與魔防永久降低30%。');
}

function summonKrakenTentacles(engine,kraken){
  if(kraken.week13TentaclesSummoned)return;
  kraken.week13TentaclesSummoned=true;
  for(const [i,id] of ['kraken_tentacle_left','kraken_tentacle_right'].entries()){
    const t=engine.summonEnemy(id,kraken,{statScale:.58,hpScale:.30});
    if(t){t.krakenTentacle=true;t.name=i===0?'克拉肯左觸手':'克拉肯右觸手'}
  }
  engine.log('🐙 克拉肯與左右觸手同時作戰；本體仍可直接鎖定。');
}
function exposeKraken(engine,kraken){
  if(kraken.week13DefenseBroken)return;
  if(ownedLiving(engine,kraken,x=>x.krakenTentacle).length)return;
  kraken.week13DefenseBroken=true;
  temporary(kraken,'kraken_exposed','⚔️ 觸手盡斷',999,{defense:-kraken.defense*.20},'debuff');
  engine.log('⚔️ 左右觸手全數斬斷：克拉肯防禦永久降低20%。');
}
function summonMurlocThreshold(engine,boss,index){
  boss.week13SummonStages=boss.week13SummonStages||{};
  if(boss.week13SummonStages[index])return;
  const s=engine.summonEnemy('murloc',boss,{statScale:.62,hpScale:.34});
  if(!s)return;
  boss.week13SummonStages[index]=true;s.week13Murloc=true;s.name=`召喚魚人 ${index}`;
  engine.log(`📣 邪惡魚人召喚師喚來第 ${index}/2 隻魚人。`);
}

function finalNecro(engine){return engine.state.enemies.find(x=>x.monsterId==='final_necromancer'&&x.hp>0&&x.alive!==false)||null}
function linkedDragon(engine){return engine.state.enemies.find(x=>x.monsterId==='skeleton_dragon'&&x.hp>0&&x.alive!==false)||null}

export function applyLateBattleStart(engine,primary){
  if(!primary)return;
  if(primary.monsterId==='kraken')summonKrakenTentacles(engine,primary);
  if(primary.monsterId==='final_necromancer'){
    const dragon=engine.summonEnemy('skeleton_dragon',primary,{statScale:.90,hpScale:.85});
    if(dragon){
      dragon.finalDragonLink=true;dragon.soulLinked=true;dragon.name='骷髏巨龍';
      addStatus(primary,{type:'dragon_soul_guard',name:'🔗 魔龍靈魂連結',turns:999,effectType:'buff',mods:{damageTaken:-.70},unstealable:true});
      engine.log('🕯️ 死靈法師復活骷髏巨龍；巨龍存在時死靈法師受到傷害降低70%。');
      engine.log('🔗 擊破骷髏巨龍會斬斷靈魂連結，死靈法師也會隨之消滅。');
    }
  }
}

export function beforeLateEnemyTurn(engine,unit){
  if(!unit||unit.hp<=0)return false;

  if(Number(engine.week)===11&&unit.monsterId==='orc_warrior'&&unit.hp/unit.maxHp<=.35&&!unit.week11RageTriggered){
    unit.week11RageTriggered=true;
    permanent(unit,'week11_rage','🔥 亡者狂暴',{attack:unit.attack*.30,defense:-unit.defense*.20});
    engine.log('🔥 獸人戰士發動亡者狂暴：攻擊+30%、防禦-20%。');
  }
  if(unit.monsterId==='tyrannosaurus'&&unit.hp/unit.maxHp<=.30&&!unit.primalRageTriggered){
    unit.primalRageTriggered=true;
    permanent(unit,'primal_rage','🔥 瀕死狂暴',{attack:unit.attack*.30});
    engine.log('🦖 霸王龍陷入瀕死狂暴：攻擊永久提高30%。');
  }
  if(unit.monsterId==='zombie_lizard_warrior'&&unit.hp/unit.maxHp<=.35&&!unit.undeadRageTriggered){
    unit.undeadRageTriggered=true;
    permanent(unit,'undead_rage','🔥 亡者狂暴',{attack:unit.attack*.25,defense:-unit.defense*.15});
    engine.log('🔥 殭屍蜥蜴人戰士：攻擊+25%、防禦-15%。');
  }
  if(unit.monsterId==='hydra'){
    const blocked=!!status(unit,'burn')||!!status(unit,'hydra_cauterized');
    if(unit.hp<unit.maxHp&&!blocked){
      const heal=Math.min(unit.maxHp-unit.hp,Math.max(1,Math.round(unit.maxHp*.04)));
      unit.hp+=heal;engine.log(`♻️ 九頭巨蛇再生 ${heal} HP。`);
    }else if(blocked&&unit.hp<unit.maxHp)engine.log('🔥 九頭巨蛇傷口灼燒，本回合無法再生。');
    if(unit.hp/unit.maxHp<=.30&&!unit.hydraRageTriggered){
      unit.hydraRageTriggered=true;
      permanent(unit,'hydra_rage','🐲 群首狂怒',{attack:unit.attack*.20,magicAttack:unit.magicAttack*.20});
      engine.log('🐲 九頭巨蛇進入群首狂怒：攻擊與魔攻永久提高20%。');
    }
  }
  if(unit.monsterId==='pigman_warrior'&&unit.hp/unit.maxHp<=.35&&!unit.riftRageTriggered){
    unit.riftRageTriggered=true;
    permanent(unit,'rift_rage','🔥 戰鬥狂怒',{attack:unit.attack*.25});
    engine.log('🔥 豬頭人戰士發動戰鬥狂怒：攻擊永久提高25%。');
  }
  if(unit.monsterId==='cyclops'&&unit.hp/unit.maxHp<=.30&&!unit.cyclopsRageTriggered){
    unit.cyclopsRageTriggered=true;
    permanent(unit,'cyclops_rage','👁️ 獨眼狂怒',{attack:unit.attack*.25,defense:-unit.defense*.20});
    engine.log('👁️ 獨眼巨人進入狂怒：攻擊+25%、防禦-20%。');
  }
  if(unit.monsterId==='sky_pirate_captain'&&unit.hp/unit.maxHp<=.30&&!unit.desperateCaptainTriggered){
    unit.desperateCaptainTriggered=true;
    permanent(unit,'captain_desperate','🏴‍☠️ 亡命狀態',{attack:unit.attack*.20,magicAttack:unit.magicAttack*.20,speed:unit.speed*.20,defense:-unit.defense*.20});
    engine.log('🏴‍☠️ 天空海盜船長進入亡命狀態：攻/魔攻/速度+20%、防禦-20%。');
  }
  if(unit.monsterId==='sky_colossus'&&unit.hp/unit.maxHp<=.30&&!unit.coreOverloadTriggered){
    unit.coreOverloadTriggered=true;
    permanent(unit,'colossus_overload','⚡ 核心超載',{attack:unit.attack*.25,magicAttack:unit.magicAttack*.25,speed:unit.speed*.15,defense:-unit.defense*.20});
    engine.log('⚡ 天空巨像核心超載：攻/魔攻+25%、速度+15%、防禦-20%。');
  }
  return false;
}

export function afterLateStatusTick(engine,unit,isHero,{skip=false,hadControl=false,hadFear=false}={}){
  let extraSkip=false;
  if(isHero&&hadFear&&Math.random()<.35){
    extraSkip=true;engine.log(`😱 ${unit.name}受到恐懼影響，本回合無法行動。`);
  }
  if(!isHero&&skip&&hadControl&&unit?.chargedSkill&&INTERRUPTIBLE_CHARGES[unit.monsterId]===unit.chargedSkill){
    const old=unit.chargedSkill;unit.chargedSkill=null;
    removeStatus(unit,'pegasus_takeoff');
    engine.log(`💥 ${unit.name}受到控制，「${engine.skillFor(old)?.name||'蓄力攻擊'}」被打斷。`);
  }
  return{skip:extraSkip};
}

export function afterLateEnemyDamaged(engine,unit){
  if(!unit)return;

  if(unit.monsterId==='wandering_zombie_lizardman'&&unit.hp<=0&&!unit.reviveUsed){
    unit.reviveUsed=true;unit.hp=Math.max(1,Math.round(unit.maxHp*.30));unit.alive=true;
    engine.log('🧟 遊蕩的殭屍蜥蜴人第一次死亡後，以30% HP復生。');
    return;
  }

  if(unit.monsterId==='reborn_necromancer'&&unit.hp>0&&unit.hp/unit.maxHp<=.70&&!unit.week11SoulsSummoned)summonWeek11Souls(engine,unit);
  if(unit.week11Soul&&unit.hp<=0){
    const boss=engine.state.enemies.find(x=>x.uid===unit.summonedBy&&x.monsterId==='reborn_necromancer'&&x.hp>0);
    if(boss)updateRebornLink(engine,boss);
  }

  if(unit.monsterId==='black_command_pillar'&&unit.hp>0&&unit.hp/unit.maxHp<=.70&&!unit.commandDollsSummoned)summonPillarDolls(engine,unit);
  if(unit.commandDoll&&unit.hp<=0){
    const pillar=engine.state.enemies.find(x=>x.uid===unit.summonedBy&&x.monsterId==='black_command_pillar'&&x.hp>0);
    if(pillar)exposePillar(engine,pillar);
  }

  if(unit.monsterId==='evil_murloc_summoner'&&unit.hp>0){
    const ratio=unit.hp/unit.maxHp;
    if(ratio<=.70)summonMurlocThreshold(engine,unit,1);
    if(ratio<=.40)summonMurlocThreshold(engine,unit,2);
  }
  if(unit.krakenTentacle&&unit.hp<=0){
    const kraken=engine.state.enemies.find(x=>x.uid===unit.summonedBy&&x.monsterId==='kraken'&&x.hp>0);
    if(kraken)exposeKraken(engine,kraken);
  }

  if(unit.monsterId==='skeleton_dragon'&&unit.hp<=0&&unit.finalDragonLink&&!unit.linkBacklashDone){
    unit.linkBacklashDone=true;
    const boss=finalNecro(engine);
    if(boss){
      removeStatus(boss,'dragon_soul_guard');
      boss.hp=0;boss.alive=false;boss.dragonLinkBroken=true;
      engine.log('💥 靈魂連結斷裂！骷髏巨龍與死靈法師一同消滅。');
    }
  }
}

export async function afterLateHeroHit(engine,target,action,result,presenter){
  if(!target||!result?.damage)return;

  if(target.monsterId==='hydra'&&target.hp>0&&(action?.damageType||action?.type)==='fire'){
    addStatus(target,{type:'hydra_cauterized',name:'🔥 傷口灼燒',turns:2,effectType:'debuff',mods:{}});
    engine.log('🔥 火焰灼燒九頭巨蛇傷口：再生暫停2回合。');
  }

  if(target.monsterId==='guardian_doll'&&target.hp>0){
    const stance=status(target,'doll_counter_stance');
    if(stance){
      target.statuses=target.statuses.filter(s=>s!==stance);
      engine.log(`🪆 ${target.name}發動反擊姿態。`);
      await engine.executeEnemyDamage(target,{id:'doll_counter',name:'人偶反擊',kind:'physical',target:'single',multiplier:.60,bypassHound:true},presenter);
    }
  }
}

export function afterLateChargeStarted(engine,unit,skill){
  if(skill?.id==='pegasus_takeoff'){
    temporary(unit,'pegasus_takeoff','🪽 飛馬升空',1,{evade:.25});
    engine.log('🪽 飛馬騎士升空：蓄力期間閃避率提高25%。');
  }
}

function directHeal(engine,target,pct,label){
  const heal=Math.max(1,Math.round(target.maxHp*Number(pct||0)));
  target.hp=Math.min(target.maxHp,target.hp+heal);
  engine.log(`💚 ${label||target.name}恢復 ${heal} HP。`);
  engine.emit({type:'enemy-state',unitUid:target.uid});
}

export async function executeLateEnemySkill(engine,unit,skill,presenter){
  if(!skill)return{handled:false};

  if(skill.id==='pillar_attack_order'){
    const dolls=ownedLiving(engine,unit,x=>x.commandDoll);
    engine.log(`⚔️ 攻擊指令：${dolls.length}具守護人偶立即追加攻擊。`);
    for(const d of dolls)await engine.executeEnemyDamage(d,{id:'pillar_order_slash',name:'指令斬擊',kind:'physical',target:'single',multiplier:.50},presenter);
    return{handled:true};
  }
  if(skill.id==='pillar_repair_order'){
    const dolls=ownedLiving(engine,unit,x=>x.commandDoll);
    for(const d of dolls)directHeal(engine,d,.15,d.name);
    return{handled:true};
  }
  if(skill.id==='evil_murloc_heal'){
    const target=ownedLiving(engine,unit,x=>x.week13Murloc).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
    if(target)directHeal(engine,target,.15,target.name);
    return{handled:true};
  }
  if(skill.id==='zombie_priest_dark_blessing'){
    temporary(unit,'zombie_priest_dark_blessing','🌑 黑暗祝福',3,{attack:unit.attack*.25,magicAttack:unit.magicAttack*.25});
    engine.log('🌑 黑暗祝福：攻擊與魔攻提高25%，持續3回合。');
    return{handled:true};
  }
  if(skill.dynamicHydraHeads&&unit.monsterId==='hydra'){
    const ratio=unit.hp/unit.maxHp,hits=ratio<=.33?5:ratio<=.66?4:3;
    await engine.executeEnemyDamage(unit,{...skill,hits,multiplierPerHit:.45,dynamicHydraHeads:false},presenter);
    engine.log(`🐲 九頭巨蛇以 ${hits} 組蛇首連續撕咬。`);
    return{handled:true};
  }
  if(skill.id==='reaper_soul_harvest'){
    const consumed=activeHarvest(engine);
    if(!consumed.length)return{handled:true};
    const before=Number(engine.state.heroHp)||0;
    await engine.executeEnemyDamage(unit,{...skill,multiplier:1+.25*consumed.length,bypassHound:true,requiresAnyHarvestStatus:false},presenter);
    if(before>Number(engine.state.heroHp||0)){
      engine.state.hero.statuses=(engine.state.hero.statuses||[]).filter(s=>!consumed.includes(s.type));
      const heal=Math.max(1,Math.round(unit.maxHp*.05*consumed.length));unit.hp=Math.min(unit.maxHp,unit.hp+heal);
      engine.log(`🌾 靈魂收割消耗 ${consumed.length} 種負面狀態，恢復 ${heal} HP。`);
    }
    return{handled:true};
  }
  if(skill.combinedCannon){
    engine.log('💥 飛空艇主砲命中後引爆火藥。');
    await engine.executeEnemyDamage(unit,{id:'captain_cannon_impact',name:'主砲撞擊',kind:'physical',target:'all',aoe:true,multiplier:1.30},presenter);
    if(engine.state.heroHp>0)await engine.executeEnemyDamage(unit,{id:'captain_cannon_blast',name:'火藥爆炸',kind:'magic',element:'fire',target:'all',aoe:true,multiplier:.70,status:{id:'burn',chance:1,duration:3,maxHpDot:.04}},presenter);
    return{handled:true};
  }
  if(skill.combinedPegasusCharge){
    engine.log('🪽 飛馬騎士自高空俯衝，騎槍後接風爆。');
    await engine.executeEnemyDamage(unit,{id:'pegasus_charge_lance',name:'天翔騎槍',kind:'physical',target:'single',multiplier:1.30},presenter);
    if(engine.state.heroHp>0)await engine.executeEnemyDamage(unit,{id:'pegasus_charge_wind',name:'天翔風爆',kind:'magic',element:'wind',target:'single',multiplier:.50,status:{id:'sky_armor_break',chance:1,duration:2,defMultiplier:.80}},presenter);
    removeStatus(unit,'pegasus_takeoff');
    return{handled:true};
  }
  if(skill.id==='final_necro_repair'){
    const dragon=linkedDragon(engine);if(dragon)directHeal(engine,dragon,.15,'骷髏巨龍');
    return{handled:true};
  }

  return{handled:false};
}

export function afterLateEnemySkill(engine,unit,skill){
  if(!unit||!skill)return;
  if(skill.id==='core_overheat'&&unit.hp>0){
    temporary(unit,'core_overheat','♨️ 核心過熱',1,{defense:-unit.defense*.25,magicDefense:-unit.magicDefense*.25},'debuff');
    engine.log(`♨️ ${unit.name}核心過熱：防禦與魔防降低25%。`);
  }
  if(Number(skill.speedAfter)>0&&unit.hp>0){
    temporary(unit,'charge_speed','💨 衝鋒加速',1,{speed:unit.speed*Number(skill.speedAfter)});
    engine.log(`💨 ${unit.name}衝鋒後速度提高${Math.round(Number(skill.speedAfter)*100)}%。`);
  }
  if(skill.colossusCannon&&unit.hp>0){
    temporary(unit,'colossus_cannon_overheat','🔥 核心過熱',1,{damageTaken:.30},'debuff');
    engine.log('🔥 天空巨像砲擊後核心過熱：受到傷害增加30%，持續1回合。');
  }
}

export function applyLateHealingReceived(engine,amount){
  const mult=Math.max(.10,1+effectMod(engine?.state?.hero||{statuses:[]},'healingReceived'));
  return Math.max(0,Number(amount)||0)*mult;
}
