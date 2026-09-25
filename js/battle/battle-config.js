export const BATTLE_CONFIG=Object.freeze({maxRounds:30,delay:220,statScale:100,baseHit:.95,blockReduction:.50,critDamage:1.50,maxEnemies:4});
export const DAMAGE_TYPES=Object.freeze({
 physical:{elemental:false},fire:{elemental:true},ice:{elemental:true},water:{elemental:true},lightning:{elemental:true},wind:{elemental:true},nature:{elemental:true},poison:{elemental:true},arcane:{elemental:false},holy:{elemental:false},shadow:{elemental:true}
});
export const STATUS_DEFS=Object.freeze({
 poison:{name:'中毒',icon:'☠️'},burn:{name:'燃燒',icon:'🔥'},bleed:{name:'流血',icon:'🩸'},curse:{name:'詛咒',icon:'💀'},paralysis:{name:'麻痺',icon:'⚡'},freeze:{name:'冰凍',icon:'🧊'},stun:{name:'暈眩',icon:'💫'},defense:{name:'防禦姿態',icon:'🛡️'},focus:{name:'專注',icon:'🎯'},slow:{name:'緩速',icon:'🐌'},bind:{name:'束縛',icon:'🌿'},weak:{name:'虛弱',icon:'📉'},disease:{name:'疾病',icon:'☣️'},blind:{name:'命中下降',icon:'👁️'},rage:{name:'狂暴',icon:'🔥'},warcry:{name:'戰吼',icon:'📣'},stone_guard:{name:'石化防禦',icon:'🗿'},golden_shield:{name:'黃金護盾',icon:'🛡️'},death_mark:{name:'死亡標記',icon:'☠️'}
});
