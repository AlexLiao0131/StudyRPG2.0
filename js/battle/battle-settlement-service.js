import { getGame, update } from '../core/store.js';
import { localDateString } from '../core/date.js';
import { grantRewardBundle } from '../progression/reward-service.js';
import { ensureEconomyCatalog, shopItemCategory, adjustLotteryCoins } from '../economy/economy-service.js';
import { monsterDef } from './monster-database.js';
import { recordPhaseBattle } from './phase-service.js';
import { equipmentDropSource, grantEquipmentDrop, rollEquipmentDrop } from '../equipment/equipment-service.js';
import { currentCampaignCycle, markFirstSemesterClear, recordTowerFloorClear } from '../campaign/endgame-service.js';

function rewardFor(engine){
  if(engine.eventType==='replay')return{gold:5,exp:10};
  if(engine.eventType==='tower'){
    const floor=Math.max(1,Number(engine.towerFloor)||1);
    return{gold:Math.max(2,Math.floor(floor/3)),exp:Math.max(10,floor*3)};
  }
  return{gold:15,exp:15};
}

// Canonical 1.0 battle rating formula.
// Do not change thresholds without changing the 1.0 rule first.
export function calculateBattleRating(win,heroHp,heroMaxHp,rounds){
  if(!win)return 0;
  const hpPct=Number(heroHp)/Math.max(1,Number(heroMaxHp)||1);
  if(hpPct>=.70&&Number(rounds)<=12)return 3;
  if(hpPct>=.40)return 2;
  return 1;
}

const uid=(prefix='drop')=>`${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;

// Canonical 1.0 fallback drop, used only when the formal Equipment DB
// did not produce an equipment drop.
// Lottery coin mutation is applied after the settlement update through
// the existing Economy ledger API.
function legacyRatingFallbackDrop(game,rating,date,random=Math.random){
  const lotteryChance=rating===3?.10:rating===2?.05:0;
  if(lotteryChance>0&&random()<lotteryChance){
    return{type:'lottery',label:'稀有抽獎幣 ×1',value:1};
  }

  const roll=random();
  const itemChance=rating===3?.72:rating===2?.50:.28;
  if(roll<itemChance){
    const pool=(game.shopItems||[]).filter(x=>
      x?.active!==false&&['equipment','consumable','coupon'].includes(shopItemCategory(x))
    );
    if(pool.length){
      const weighted=pool.flatMap(item=>{
        const category=shopItemCategory(item);
        const weight=category==='equipment'?(rating===3?4:2):category==='consumable'?3:2;
        return Array(weight).fill(item);
      });
      const item=weighted[Math.floor(random()*weighted.length)];
      if(item){
        const inv={
          id:uid('dungeon'),
          itemId:item.id,
          name:item.name,
          status:'unused',
          boughtDate:date,
          source:'dungeon'
        };
        game.inventory=Array.isArray(game.inventory)?game.inventory:[];
        game.inventory.push(inv);
        return{
          type:shopItemCategory(item),
          label:`${item.icon||'🎁'} ${item.name}`,
          value:item.id,
          inventoryId:inv.id
        };
      }
    }
  }

  const amount=rating===3
    ?5+Math.floor(random()*6)
    :rating===2
      ?3+Math.floor(random()*3)
      :1+Math.floor(random()*3);
  game.hero.gold=Math.max(0,Number(game.hero.gold)||0)+amount;
  return{type:'gold',label:`金幣 +${amount} G`,value:amount};
}

export function settleBattle(engine,result){
  if(!engine?.state)return null;

  // 1.0 rollDungeonDrop() begins by ensuring the item system exists.
  // This is the 2.0 equivalent and keeps the same shop/fallback pool available.
  ensureEconomyCatalog();

  const date=localDateString(),s=engine.state,reward=rewardFor(engine);
  const win=result==='win';
  const rating=calculateBattleRating(win,s.heroHp,s.hero.maxHp,s.round);
  let settlement=null;

  update(()=>{
    const g=getGame(),h=g.hero;
    const primary=s.enemies.find(x=>!x.isSummon&&x.monsterId===engine.monsterId)
      ||s.enemies.find(x=>!x.isSummon)
      ||s.enemies[0]
      ||null;

    for(const loot of s.battleLoot||[]){
      if(loot?.type==='gold')h.gold=Math.max(0,Number(h.gold)||0)+Math.max(0,Number(loot.amount)||0);
      if(loot?.type==='item'&&loot.item){
        g.inventory=Array.isArray(g.inventory)?g.inventory:[];
        g.inventory.push({
          id:`steal_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`,
          ...loot.item,
          itemSnapshot:{...loot.item}
        });
      }
    }

    let drop=null;
    if(win){
      grantRewardBundle(h,reward);

      const source=equipmentDropSource({
        eventType:engine.eventType,
        monsterId:engine.monsterId,
        dateStr:date
      });

      // Same order as 1.0 final runtime:
      // formal Equipment DB first; rating-based legacy fallback only if no equipment dropped.
      const rolled=rollEquipmentDrop({
        source,
        week:engine.week||1,
        floor:engine.towerFloor||0,
        cycle:currentCampaignCycle(date),
        heroClass:h.heroClass||'初心者'
      });

      if(rolled){
        drop=grantEquipmentDrop(g,rolled,{dateStr:date,source});
      }else{
        drop=legacyRatingFallbackDrop(g,rating,date);
      }

      if(engine.eventType==='tower')recordTowerFloorClear(g,engine.towerFloor||1);
    }

    g.campaignProgress=g.campaignProgress||{};
    let phaseRecord=null;
    if(['daily','midterm','final'].includes(engine.eventType)){
      phaseRecord=recordPhaseBattle({
        campaignProgress:g.campaignProgress,
        monsterId:engine.monsterId,
        result,
        rounds:s.round,
        enemyHp:primary?.hp||0,
        enemyMaxHp:primary?.maxHp||0,
        heroHp:s.heroHp,
        heroMaxHp:s.hero.maxHp,
        date,
        eventType:engine.eventType,
        scopeKey:engine.phaseScopeKey
      });
    }

    const record={
      id:`battle_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`,
      date,
      monsterId:engine.monsterId,
      enemyName:monsterDef(engine.monsterId).name,
      enemyPower:engine.enemyPower,
      result,
      eventType:engine.eventType,
      rounds:s.round,
      rating,
      battleV2:true,
      heroHp:Math.max(0,Number(s.heroHp)||0),
      heroMaxHp:Number(s.hero.maxHp)||0,
      enemyHp:Math.max(0,Number(primary?.hp)||0),
      enemyMaxHp:Number(primary?.maxHp)||0,
      drop:drop?{
        type:drop.type||'',
        label:drop.label||drop.itemData?.name||'',
        value:drop.value??null,
        inventoryId:drop.inventoryId||null,
        rarity:drop.rarity||null,
        unique:!!drop.unique
      }:null,
      phase:phaseRecord?{
        chainId:phaseRecord.chainId,
        phaseNumber:phaseRecord.phaseNumber,
        enemyDamageRatio:phaseRecord.enemyDamageRatio,
        scopeKey:phaseRecord.scopeKey
      }:null
    };

    if(engine.eventType==='replay')record.replayBossId=engine.monsterId;
    if(engine.eventType==='tower')record.towerFloor=Math.max(1,Number(engine.towerFloor)||1);

    g.battleRecords=g.battleRecords||[];
    g.battleRecords.push(record);

    const unlocked=markFirstSemesterClear(g,record);
    settlement={
      record,
      rating,
      drop,
      reward:win?reward:{gold:0,exp:0},
      unlocked
    };
  });

  // Keep the existing 2.0 lottery ledger authoritative.
  // The selection itself already happened inside the settlement transaction.
  if(settlement?.drop?.type==='lottery'){
    adjustLotteryCoins(1,'dungeon_drop',{rating:Number(settlement.rating)||1});
  }

  return settlement;
}
