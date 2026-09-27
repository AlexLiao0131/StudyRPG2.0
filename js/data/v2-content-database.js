// 2.0-only content that does not exist in the legacy 1.0 Skill Database.
// This is data only. Runtime code must resolve these definitions by skill id.
const freezeSkill=skill=>Object.freeze(skill);

export const V2_MONSTER_SKILLS=Object.freeze({
  doll_counter:freezeSkill({id:'doll_counter',name:'人偶反擊',kind:'physical',target:'single',multiplier:.60,bypassHound:true}),
  pillar_order_slash:freezeSkill({id:'pillar_order_slash',name:'指令斬擊',kind:'physical',target:'single',multiplier:.50}),
  captain_cannon_impact:freezeSkill({id:'captain_cannon_impact',name:'主砲撞擊',kind:'physical',target:'all',aoe:true,multiplier:1.30}),
  captain_cannon_blast:freezeSkill({id:'captain_cannon_blast',name:'火藥爆炸',kind:'magic',element:'fire',target:'all',aoe:true,multiplier:.70,status:Object.freeze({id:'burn',chance:1,duration:3,maxHpDot:.04})}),
  pegasus_charge_lance:freezeSkill({id:'pegasus_charge_lance',name:'天翔騎槍',kind:'physical',target:'single',multiplier:1.30}),
  pegasus_charge_wind:freezeSkill({id:'pegasus_charge_wind',name:'天翔風爆',kind:'magic',element:'wind',target:'single',multiplier:.50,status:Object.freeze({id:'sky_armor_break',chance:1,duration:2,defMultiplier:.80})})
});

export const V2_MONSTER_SKILL_EXTENSIONS=Object.freeze({
  pillar_attack_order:Object.freeze({followupSkillId:'pillar_order_slash'}),
  pillar_repair_order:Object.freeze({healMaxHp:.15}),
  zombie_priest_dark_blessing:Object.freeze({atkMultiplier:1.25,matkMultiplier:1.25}),
  hydra_multi_bite:Object.freeze({dynamicHitRules:Object.freeze([
    Object.freeze({hpRatioMax:.33,hits:5}),
    Object.freeze({hpRatioMax:.66,hits:4}),
    Object.freeze({hpRatioMax:1,hits:3})
  ])}),
  reaper_soul_harvest:Object.freeze({
    harvestStatuses:Object.freeze(['disease','curse','fear','swamp_corruption']),
    harvestDamageBonusPerStatus:.25,
    harvestHealMaxHpPerStatus:.05
  }),
  captain_airship_cannon:Object.freeze({followupSkillIds:Object.freeze(['captain_cannon_impact','captain_cannon_blast'])}),
  pegasus_takeoff:Object.freeze({chargeEvadeBonus:.25}),
  pegasus_sky_charge:Object.freeze({followupSkillIds:Object.freeze(['pegasus_charge_lance','pegasus_charge_wind'])})
});
