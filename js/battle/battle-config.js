export const BATTLE_CONFIG=Object.freeze({maxRounds:30,delay:220,statScale:100,baseHit:.95,blockReduction:.50,critDamage:1.50,maxEnemies:4});
export const DAMAGE_TYPES=Object.freeze({
 physical:{elemental:false},fire:{elemental:true},ice:{elemental:true},water:{elemental:true},lightning:{elemental:true},wind:{elemental:true},nature:{elemental:true},poison:{elemental:true},arcane:{elemental:false},holy:{elemental:false},shadow:{elemental:true}
});
export const STATUS_DEFS=Object.freeze({
 poison:{name:'中毒',icon:'☠️'},burn:{name:'燃燒',icon:'🔥'},bleed:{name:'流血',icon:'🩸'},curse:{name:'詛咒',icon:'💀'},paralysis:{name:'麻痺',icon:'⚡'},freeze:{name:'冰凍',icon:'🧊'},stun:{name:'暈眩',icon:'💫'},defense:{name:'防禦姿態',icon:'🛡️'},focus:{name:'專注',icon:'🎯'}
});
