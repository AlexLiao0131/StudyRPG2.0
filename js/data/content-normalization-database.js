// 1.0 已知資料缺口只集中在這裡做 migration normalization。
// Runtime / Provider 不再自行宣告技能數值。
export const LEGACY_MONSTER_SKILL_NORMALIZATION=Object.freeze({
  golden_shield:Object.freeze({damageTakenMultiplier:.65,duration:2}),
  mana_shield:Object.freeze({damageTakenMultiplier:.65,duration:2})
});
