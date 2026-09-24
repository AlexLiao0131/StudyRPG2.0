export function quickBattle(heroPower,enemyPower){
 const ratio=heroPower/Math.max(1,enemyPower);
 if(ratio>=1.05)return {result:"win",text:"勝利"};
 if(ratio>=.85)return {result:"close",text:"勢均力敵"};
 return {result:"lose",text:"戰敗"};
}