export const JOB_RULES=Object.freeze([
  {name:'戰士',kind:'single',core:'str',secondary:'int',passive:'warrior_grit'},
  {name:'法師',kind:'single',core:'int',secondary:'will',passive:'mana_echo'},
  {name:'牧師',kind:'single',core:'virtue',secondary:'will',passive:'blessing'},
  {name:'獵人',kind:'dual',cores:['agi','int'],secondary:'will',passive:'hunter_instinct'},
  {name:'盜賊',kind:'dual',cores:['agi','str'],secondary:'int',passive:'shadow_step'},
  {name:'聖騎士',kind:'dual',cores:['str','virtue'],secondary:'will',passive:'holy_guard'},
  {name:'魔劍士',kind:'dual',cores:['str','int'],secondary:'agi',passive:'spellblade'}
]);

export const JOB_AWAKEN_CONFIG=Object.freeze({
  observationDays:28,
  minTaskRecords:20,
  stableWeeks:2,
  leadRatio:1.10,
  minCoreGrowthShare:.32,
  dualMinEachShare:.20,
  dualBalanceRatio:.70,
  safetyDays:42
});

export const BEGINNER_SKILL_JOB_WEIGHTS=Object.freeze({
  power_strike:Object.freeze({'戰士':1.00,'盜賊':.65,'聖騎士':.65,'魔劍士':.60}),
  ember:Object.freeze({'法師':1.00,'魔劍士':.85,'獵人':.55}),
  defense_stance:Object.freeze({'聖騎士':1.00,'戰士':.65,'牧師':.60}),
  focus:Object.freeze({'獵人':1.00,'盜賊':.85,'法師':.35,'牧師':.35})
});

export const FORMAL_CLASS_SKILL_IDS=Object.freeze({
  '戰士':Object.freeze(['war_heroic','war_shockwave','war_laststand','war_ragefill','war_charge','war_blade_storm','war_execute','war_bloodstrike']),
  '法師':Object.freeze(['mage_blast','mage_missile','mage_mana_shield','mage_meditation','mage_haste','mage_blizzard','mage_burn','mage_icefire']),
  '牧師':Object.freeze(['priest_smite','priest_lightbolt','priest_protection','priest_grace','priest_exorcism','priest_holy_prayer','priest_cleanse','priest_miracle']),
  '獵人':Object.freeze(['hunter_trip','hunter_magic_arrow','hunter_counter','hunter_focus','hunter_explosive','hunter_hound','hunter_deadly','hunter_snipe']),
  '盜賊':Object.freeze(['rogue_ambush','rogue_poison','rogue_evade','rogue_burst','rogue_rupture','rogue_steal','rogue_cloak','rogue_frenzy']),
  '聖騎士':Object.freeze(['pal_crusader','pal_shock','pal_divine_shield','pal_wings','pal_blade','pal_freedom','pal_consecrate','pal_verdict']),
  '魔劍士':Object.freeze(['sb_arcane_strike','sb_element_bolt','sb_barrier','sb_disrupt','sb_accel','sb_frost_armor','sb_firestorm','sb_element_burst'])
});

export const JOB_BATTLE_CONFIG=Object.freeze({
  combatCoreThreshold:55,
  overThresholdEfficiency:.40,
  secondaryCompensation:.35
});

export function jobRuleFor(hero){
  return hero?.jobAwakened?JOB_RULES.find(j=>j.name===hero.heroClass)||null:null;
}
