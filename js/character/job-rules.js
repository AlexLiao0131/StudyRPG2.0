export const JOB_RULES=Object.freeze([
  {name:'戰士',kind:'single',core:'str',secondary:'int',passive:'warrior_grit'},
  {name:'法師',kind:'single',core:'int',secondary:'will',passive:'mana_echo'},
  {name:'牧師',kind:'single',core:'virtue',secondary:'will',passive:'blessing'},
  {name:'獵人',kind:'dual',cores:['agi','int'],secondary:'will',passive:'hunter_instinct'},
  {name:'盜賊',kind:'dual',cores:['agi','str'],secondary:'int',passive:'shadow_step'},
  {name:'聖騎士',kind:'dual',cores:['str','virtue'],secondary:'will',passive:'holy_guard'},
  {name:'魔劍士',kind:'dual',cores:['str','int'],secondary:'agi',passive:'spellblade'}
]);
export const JOB_BATTLE_CONFIG=Object.freeze({combatCoreThreshold:55,overThresholdEfficiency:.40,secondaryCompensation:.35});
export function jobRuleFor(hero){return hero?.jobAwakened?JOB_RULES.find(j=>j.name===hero.heroClass)||null:null}
