export const MULTI_ENEMY_RULES=Object.freeze({maxEnemies:4,maxSummons:3,removeSummonsWhenBossDies:true});

export const MIRROR_RULES=Object.freeze({
  hpScale:.95,
  defensePierce:.50,
  minDamagePct:.02
});

export const SUMMON_RULES=Object.freeze({
  goblin_king:Object.freeze({
    maxActiveSummons:2,maxTotalSummons:2,mpCost:40,
    candidates:Object.freeze([
      Object.freeze({id:'goblin_slave',weight:50}),
      Object.freeze({id:'goblin_soldier',weight:35}),
      Object.freeze({id:'goblin_shaman',weight:15,maxActive:1})
    ])
  })
});

export const APOCALYPSE_POWER_LABELS=Object.freeze({war:'戰爭',plague:'瘟疫',famine:'饑荒',death:'死亡'});

export const BATTLE_START_MECHANICS=Object.freeze({
  plague_field:Object.freeze({kind:'plague_field'}),
  death_mark:Object.freeze({kind:'death_mark'}),
  roll_two_apocalypse_powers:Object.freeze({kind:'apocalypse_roll',rollCount:2,pool:Object.freeze(['war','plague','famine','death'])})
});
