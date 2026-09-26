export const EQUIPMENT_BASES=Object.freeze({
  t0_sword:{id:'t0_sword',name:'遠征長劍',slot:'weapon',icon:'🗡️',stats:{attack:7}},
  t0_staff:{id:'t0_staff',name:'星輝法杖',slot:'weapon',icon:'🪄',stats:{magicAttack:7,maxEnergy:6}},
  t0_bow:{id:'t0_bow',name:'天空戰弓',slot:'weapon',icon:'🏹',stats:{attack:5,speed:3}},
  t0_helm:{id:'t0_helm',name:'守望戰盔',slot:'head',icon:'🪖',stats:{defense:6,magicDefense:3}},
  t0_circlet:{id:'t0_circlet',name:'祕法冠冕',slot:'head',icon:'👑',stats:{magicDefense:6,maxEnergy:10}},
  t0_armor:{id:'t0_armor',name:'凱旋戰甲',slot:'body',icon:'🛡️',stats:{defense:7,maxHp:20}},
  t0_robe:{id:'t0_robe',name:'星界法袍',slot:'body',icon:'🥋',stats:{magicDefense:7,maxEnergy:12}},
  t0_ring:{id:'t0_ring',name:'王者戒指',slot:'accessory',icon:'💍',stats:{attack:2,crit:.03}},
  t0_charm:{id:'t0_charm',name:'靈魂護符',slot:'accessory',icon:'📿',stats:{magicAttack:2,maxHp:15}}
});

export function equipmentBaseRows(){
  return Object.values(EQUIPMENT_BASES).map(base=>({
    ...base,
    visualId:base.id,
    visual:{
      inventory:`images/equipment/t0/${base.slot}/${base.id}.png`,
      paperDollIdle:`images/equipment/paperdoll/t0/${base.id}_idle.png`,
      paperDollBattle:`images/equipment/paperdoll/t0/${base.id}_battle.png`
    },
    inventoryIcon:`images/equipment/icons/${base.slot}/${base.id}.png`
  }));
}
