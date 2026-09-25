export const BATTLE_PHASE_CHAINS=Object.freeze({
  demon_king:Object.freeze({
    id:'demon_king',
    phases:Object.freeze(['demon_king_phase1','demon_king_phase2']),
    combatProfile:Object.freeze({magicRoleScale:1.60}),
    entryRules:Object.freeze({
      demon_king_phase2:Object.freeze({
        startsAtFullHp:true,
        inheritRemainingHp:false,
        inheritPreviousAI:true,
        modifiers:Object.freeze([
          Object.freeze({sourceMetric:'enemyDamageRatio',targetStat:'magicAttack',maxReduction:.30})
        ])
      })
    }),
    storyAfterFinalPhase:'魔王化為魔龍並飛往火焰山脈'
  }),
  demon_dragon:Object.freeze({
    id:'demon_dragon',
    phases:Object.freeze(['demon_dragon_phase1','demon_dragon_phase2']),
    entryRules:Object.freeze({
      demon_dragon_phase2:Object.freeze({startsAtFullHp:true,inheritRemainingHp:false})
    })
  })
});

function entries(){return Object.values(BATTLE_PHASE_CHAINS)}

export function phaseDescriptorForMonster(monsterId){
  for(const chain of entries()){
    const index=chain.phases.indexOf(monsterId);
    if(index>=0)return {chain,chainId:chain.id,phaseIndex:index,phaseNumber:index+1,monsterId};
  }
  return null;
}

export function previousPhaseMonsterId(monsterId){
  const d=phaseDescriptorForMonster(monsterId);
  return d&&d.phaseIndex>0?d.chain.phases[d.phaseIndex-1]:null;
}

export function phaseEntryRule(monsterId){
  const d=phaseDescriptorForMonster(monsterId);
  return d?.chain?.entryRules?.[monsterId]||null;
}

export function phaseCombatProfile(monsterId){
  return phaseDescriptorForMonster(monsterId)?.chain?.combatProfile||{};
}
