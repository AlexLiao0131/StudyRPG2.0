import { getGame, update } from '../core/store.js';
import { localDateString } from '../core/date.js';
import { grantRewardBundle } from '../progression/reward-service.js';
import { monsterDef } from './monster-database.js';
import { recordPhaseBattle } from './phase-service.js';
import { equipmentDropSource, grantEquipmentDrop, rollEquipmentDrop } from '../equipment/equipment-service.js';
import { currentCampaignCycle, markFirstSemesterClear, recordTowerFloorClear } from '../campaign/endgame-service.js';

function rewardFor(engine){
  if(engine.eventType==='replay')return{gold:5,exp:10};
  if(engine.eventType==='tower'){const floor=Math.max(1,Number(engine.towerFloor)||1);return{gold:Math.max(2,Math.floor(floor/3)),exp:Math.max(10,floor*3)}}
  return{gold:15,exp:15};
}

export function settleBattle(engine,result){
  if(!engine?.state)return null;const date=localDateString(),s=engine.state,reward=rewardFor(engine);let settlement=null;
  update(()=>{
    const g=getGame(),h=g.hero,primary=s.enemies.find(x=>!x.isSummon&&x.monsterId===engine.monsterId)||s.enemies.find(x=>!x.isSummon)||s.enemies[0]||null;
    for(const loot of s.battleLoot||[]){
      if(loot?.type==='gold')h.gold=Math.max(0,Number(h.gold)||0)+Math.max(0,Number(loot.amount)||0);
      if(loot?.type==='item'&&loot.item){g.inventory=Array.isArray(g.inventory)?g.inventory:[];g.inventory.push({id:`steal_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`,...loot.item,itemSnapshot:{...loot.item}})}
    }
    let drop=null;if(result==='win'){
      grantRewardBundle(h,reward);
      const source=equipmentDropSource({eventType:engine.eventType,monsterId:engine.monsterId,dateStr:date}),rolled=rollEquipmentDrop({source,week:engine.week||1,floor:engine.towerFloor||0,cycle:currentCampaignCycle(date),heroClass:h.heroClass||'初心者',uniqueEquipmentDefinitions:g.uniqueEquipmentDefinitions||{}});if(rolled)drop=grantEquipmentDrop(g,rolled,{dateStr:date,source});
      if(engine.eventType==='tower')recordTowerFloorClear(g,engine.towerFloor||1);
    }
    g.campaignProgress=g.campaignProgress||{};let phaseRecord=null;if(['daily','midterm','final'].includes(engine.eventType))phaseRecord=recordPhaseBattle({campaignProgress:g.campaignProgress,monsterId:engine.monsterId,result,rounds:s.round,enemyHp:primary?.hp||0,enemyMaxHp:primary?.maxHp||0,heroHp:s.heroHp,heroMaxHp:s.hero.maxHp,date,eventType:engine.eventType,scopeKey:engine.phaseScopeKey});
    const record={id:`battle_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`,date,monsterId:engine.monsterId,enemyName:monsterDef(engine.monsterId).name,enemyPower:engine.enemyPower,result,eventType:engine.eventType,rounds:s.round,battleV2:true,heroHp:Math.max(0,Number(s.heroHp)||0),heroMaxHp:Number(s.hero.maxHp)||0,enemyHp:Math.max(0,Number(primary?.hp)||0),enemyMaxHp:Number(primary?.maxHp)||0,drop:drop?{type:'equipment',label:drop.label||drop.itemData?.name||'',inventoryId:drop.inventoryId,rarity:drop.rarity,unique:!!drop.unique}:null,phase:phaseRecord?{chainId:phaseRecord.chainId,phaseNumber:phaseRecord.phaseNumber,enemyDamageRatio:phaseRecord.enemyDamageRatio,scopeKey:phaseRecord.scopeKey}:null};
    if(engine.eventType==='replay')record.replayBossId=engine.monsterId;if(engine.eventType==='tower')record.towerFloor=Math.max(1,Number(engine.towerFloor)||1);g.battleRecords=g.battleRecords||[];g.battleRecords.push(record);const unlocked=markFirstSemesterClear(g,record);settlement={record,drop,reward:result==='win'?reward:{gold:0,exp:0},unlocked};
  });
  return settlement;
}
