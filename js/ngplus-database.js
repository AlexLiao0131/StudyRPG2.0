// New Game+ monster content. Runtime only consumes these IDs/effects.
export const NGPLUS_MONSTER_DATABASE=Object.freeze({
  bonusSkillChance:.25,
  maxAffixes:3,
  skillPool:Object.freeze([
    'goblin_heavy_slash',
    'spider_poison_fang',
    'goblin_guard',
    'shadow_arrow',
    'chain_lightning'
  ]),
  affixes:Object.freeze({
    ferocious:Object.freeze({id:'ferocious',name:'狂暴',statMultipliers:Object.freeze({attack:1.10,magicAttack:1.10})}),
    armored:Object.freeze({id:'armored',name:'裝甲',statMultipliers:Object.freeze({defense:1.12,magicDefense:1.12})}),
    swift:Object.freeze({id:'swift',name:'迅捷',statMultipliers:Object.freeze({speed:1.10})}),
    regeneration:Object.freeze({id:'regeneration',name:'再生',turnStart:Object.freeze({healMaxHp:.02})})
  })
});
