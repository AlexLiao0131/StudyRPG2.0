import { getGame, update } from '../core/store.js';
import { itemDefinition, shopItemCategory } from '../economy/economy-service.js';
import { equipmentPowerScore } from './equipment-service.js';

export const ENHANCE_COST=Object.freeze([0,2,3,4,5,6,8,10,12,15,20]);
const ENHANCE_KEYS=new Set(['attack','magicAttack','defense','magicDefense','maxHp','maxEnergy','speed']);
const SELL_MULT=Object.freeze({common:.6,uncommon:1,rare:1.8,epic:3.5,legendary:8});
const DISMANTLE_SHARDS=Object.freeze({common:1,uncommon:3,rare:8,epic:20});
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
const result=(ok,message,data={})=>({ok,message,...data});
const rarityOf=item=>String(item?.rarity||'common');

export function equipmentIsEquipped(inventoryId,game=getGame()){
  return Object.values(game.hero?.equipment||{}).some(id=>String(id)===String(inventoryId));
}

export function equipmentSellValue(item){
  const score=Math.max(1,Number(equipmentPowerScore(item))||1),mult=SELL_MULT[rarityOf(item)]||1;
  return Math.max(1,Math.round(score*mult));
}

export function equipmentDismantleValue(item){
  return Math.max(0,Number(DISMANTLE_SHARDS[rarityOf(item)])||0);
}

export function equipmentEnhanceCost(item){
  const lv=Math.max(0,Number(item?.enhancementLevel)||0);
  return lv>=10?0:Number(ENHANCE_COST[lv+1])||0;
}

function removeInventory(game,id,reason){
  const index=(game.inventory||[]).findIndex(x=>String(x.id)===String(id));
  if(index<0)return false;
  game.inventoryTombstones=game.inventoryTombstones&&typeof game.inventoryTombstones==='object'&&!Array.isArray(game.inventoryTombstones)?game.inventoryTombstones:{};
  game.inventoryTombstones[String(id)]={reason:String(reason||'removed'),removedAt:new Date().toISOString()};
  game.inventory.splice(index,1);
  return true;
}

function mutableItem(inv,game){
  if(inv.itemData&&typeof inv.itemData==='object')return inv.itemData;
  if(inv.itemSnapshot&&typeof inv.itemSnapshot==='object')return inv.itemSnapshot;
  const shared=itemDefinition(inv,game);
  if(!shared)return null;
  inv.itemSnapshot=clone(shared);
  return inv.itemSnapshot;
}

export function equipmentManagementInfo(inv,game=getGame()){
  const item=itemDefinition(inv,game)||inv||{},rarity=rarityOf(item),lv=Math.max(0,Number(item.enhancementLevel)||0);
  return {
    equipped:equipmentIsEquipped(inv?.id,game),
    locked:!!inv?.locked,
    rarity,
    legendary:rarity==='legendary',
    enhancementLevel:lv,
    enhancementCost:lv>=10?0:Number(ENHANCE_COST[lv+1])||0,
    sellValue:equipmentSellValue(item),
    dismantleValue:equipmentDismantleValue(item),
    canDismantle:rarity!=='legendary'
  };
}

export function toggleEquipmentLock(inventoryId){
  let locked=false,error='';
  update(()=>{
    const g=getGame(),inv=(g.inventory||[]).find(x=>String(x.id)===String(inventoryId));
    if(!inv||shopItemCategory(inv)!=='equipment'){error='找不到這件裝備。';return}
    inv.locked=!inv.locked;locked=!!inv.locked;
  });
  return error?result(false,error):result(true,locked?'🔒 已鎖定裝備。':'🔓 已解除裝備鎖定。',{locked});
}

export function sellEquipment(inventoryId){
  let value=0,error='';
  update(()=>{
    const g=getGame(),inv=(g.inventory||[]).find(x=>String(x.id)===String(inventoryId)),item=inv&&itemDefinition(inv,g);
    if(!inv||!item||shopItemCategory(inv)!=='equipment'){error='找不到這件裝備。';return}
    if(equipmentIsEquipped(inv.id,g)){error='使用中的裝備不能出售。';return}
    if(inv.locked){error='已鎖定的裝備不能出售。';return}
    value=equipmentSellValue(item);
    if(!removeInventory(g,inv.id,'sold')){error='裝備已不存在，未發放金幣。';value=0;return}
    g.hero.gold=Math.max(0,Number(g.hero.gold)||0)+value;
  });
  return error?result(false,error):result(true,`已出售裝備，獲得 ${value} G。`,{gold:value});
}

export function dismantleEquipment(inventoryId){
  let shards=0,error='';
  update(()=>{
    const g=getGame(),inv=(g.inventory||[]).find(x=>String(x.id)===String(inventoryId)),item=inv&&itemDefinition(inv,g);
    if(!inv||!item||shopItemCategory(inv)!=='equipment'){error='找不到這件裝備。';return}
    if(equipmentIsEquipped(inv.id,g)){error='使用中的裝備不能分解。';return}
    if(inv.locked){error='已鎖定的裝備不能分解。';return}
    if(rarityOf(item)==='legendary'){error='橘色傳說裝備無法分解。';return}
    shards=equipmentDismantleValue(item);
    if(shards<=0){error='這件裝備不能分解。';return}
    if(!removeInventory(g,inv.id,'dismantled')){error='裝備已不存在，未發放碎片。';shards=0;return}
    g.hero.enhancementShards=Math.max(0,Number(g.hero.enhancementShards)||0)+shards;
  });
  return error?result(false,error):result(true,`已分解裝備，獲得 ${shards} 強化碎片。`,{shards});
}

export function enhanceEquipment(inventoryId){
  let next=0,cost=0,error='';
  update(()=>{
    const g=getGame(),inv=(g.inventory||[]).find(x=>String(x.id)===String(inventoryId));
    if(!inv||shopItemCategory(inv)!=='equipment'){error='找不到這件裝備。';return}
    const item=mutableItem(inv,g);if(!item){error='找不到裝備資料。';return}
    const lv=Math.max(0,Number(item.enhancementLevel)||0);if(lv>=10){error='這件裝備已經強化到＋10。';return}
    next=lv+1;cost=Number(ENHANCE_COST[next])||0;
    if((Number(g.hero.enhancementShards)||0)<cost){error=`強化碎片不足，需要 ${cost}。`;return}
    const original=clone(item.unenhancedStats||item.stats||{});
    if(!item.baseStatsForEnhancement)item.baseStatsForEnhancement=clone(original);
    const base=item.baseStatsForEnhancement||{};
    item.unenhancedStats=clone(original);item.stats=clone(original);
    for(const [k,v] of Object.entries(base))if(ENHANCE_KEYS.has(k))item.stats[k]=Math.round(((Number(original[k])||0)+(Number(v)||0)*.03*next)*100)/100;
    item.enhancementLevel=next;item.powerScore=equipmentPowerScore(item);
    g.hero.enhancementShards=Math.max(0,(Number(g.hero.enhancementShards)||0)-cost);
  });
  return error?result(false,error):result(true,`強化成功：＋${next}（消耗 ${cost} 碎片）。`,{level:next,cost});
}

export function bulkLowEquipmentCount(game=getGame()){
  return (game.inventory||[]).filter(inv=>{
    const item=itemDefinition(inv,game),rarity=rarityOf(item);
    return shopItemCategory(inv)==='equipment'&&['common','uncommon'].includes(rarity)&&!equipmentIsEquipped(inv.id,game)&&!inv.locked;
  }).length;
}

export function bulkProcessLowEquipment(mode='sell'){
  if(!['sell','dismantle'].includes(mode))return result(false,'不支援的批量處理方式。');
  let count=0,gain=0,error='';
  update(()=>{
    const g=getGame(),targets=(g.inventory||[]).filter(inv=>{
      const item=itemDefinition(inv,g),rarity=rarityOf(item);
      return shopItemCategory(inv)==='equipment'&&['common','uncommon'].includes(rarity)&&!equipmentIsEquipped(inv.id,g)&&!inv.locked;
    });
    if(!targets.length){error='沒有可批量處理的未鎖定白色或綠色裝備。';return}
    for(const inv of targets){
      const item=itemDefinition(inv,g);if(!item)continue;
      const amount=mode==='sell'?equipmentSellValue(item):equipmentDismantleValue(item);
      if(removeInventory(g,inv.id,mode==='sell'?'sold':'dismantled')){count++;gain+=amount}
    }
    if(count<=0){error='沒有成功處理任何裝備。';return}
    if(mode==='sell')g.hero.gold=Math.max(0,Number(g.hero.gold)||0)+gain;
    else g.hero.enhancementShards=Math.max(0,Number(g.hero.enhancementShards)||0)+gain;
  });
  return error?result(false,error):result(true,`已${mode==='sell'?'出售':'分解'} ${count} 件白綠裝，獲得 ${gain} ${mode==='sell'?'G':'強化碎片'}。`,{count,gain,mode});
}
