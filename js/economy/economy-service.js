import { getGame, save, update } from '../core/store.js';
import { localDateString } from '../core/date.js';

const uid=(prefix='id')=>`${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
const result=(ok,message,data={})=>({ok,message,...data});
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));

export const ITEM_CATEGORY_LABELS=Object.freeze({all:'全部',consumable:'消耗品',equipment:'裝備',coupon:'兌換券',special:'特殊'});
export const EQUIP_SLOT_LABELS=Object.freeze({weapon:'⚔️ 武器',head:'🪖 頭部',body:'👕 身體',accessory:'💍 飾品'});
const STARTER_SHOP=Object.freeze([
  {id:'starter_coupon_ns30',name:'NS 30分鐘兌換券',icon:'🎟️',category:'coupon',price:20,description:'Nintendo Switch 30 分鐘',dailyLimit:1,active:true},
  {id:'starter_coupon_tv30',name:'電視 30分鐘兌換券',icon:'🎟️',category:'coupon',price:16,description:'看電視 30 分鐘',dailyLimit:1,active:true},
  {id:'starter_small_hp',name:'小型生命藥水',icon:'❤️',category:'consumable',subtype:'battle',effectType:'heal_hp',effectValue:60,price:10,description:'戰鬥中恢復 60 HP。',dailyLimit:2,active:true,battleConsumable:true},
  {id:'starter_small_energy',name:'小型能量藥水',icon:'⚡',category:'consumable',subtype:'battle',effectType:'heal_energy',effectValue:35,price:10,description:'戰鬥中恢復 35 能量。',dailyLimit:2,active:true,battleConsumable:true},
  {id:'starter_wood_sword',name:'木製短劍',icon:'🗡️',category:'equipment',equipSlot:'weapon',price:18,description:'初心者武器。ATK +4',dailyLimit:1,active:true,stats:{attack:4}},
  {id:'starter_leather_hat',name:'旅行皮帽',icon:'🎩',category:'equipment',equipSlot:'head',price:15,description:'初心者頭部裝備。MDEF +3',dailyLimit:1,active:true,stats:{magicDefense:3}},
  {id:'starter_cloth_armor',name:'冒險者布衣',icon:'👕',category:'equipment',equipSlot:'body',price:18,description:'初心者身體裝備。DEF +4',dailyLimit:1,active:true,stats:{defense:4}},
  {id:'starter_lucky_charm',name:'幸運護符',icon:'💍',category:'equipment',equipSlot:'accessory',price:22,description:'初心者飾品。暴擊 +2%',dailyLimit:1,active:true,stats:{crit:.02}}
]);
const DEFAULT_LOTTERY=Object.freeze([
  {id:'lottery_icecream',label:'🍦 吃冰淇淋',weight:35,stock:0,unlimited:true,active:true},
  {id:'lottery_ns1h',label:'🎮 NS 1小時',weight:30,stock:0,unlimited:true,active:true},
  {id:'lottery_steak',label:'🥩 吃牛排',weight:15,stock:1,unlimited:false,active:true},
  {id:'lottery_lalaport',label:'🛍️ 逛 LaLaport',weight:10,stock:1,unlimited:false,active:true}
]);

function normalizeItem(item){
  if(!item||typeof item!=='object')return item;
  if(!item.category)item.category=item.battleConsumable?'consumable':'coupon';
  if(!item.icon)item.icon=item.category==='equipment'?'🛡️':item.category==='consumable'?'🧪':item.category==='coupon'?'🎟️':'✨';
  if(item.category==='consumable'&&item.subtype==='battle')item.battleConsumable=true;
  if(item.category==='equipment'&&!item.stats)item.stats={};
  return item;
}

export function ensureEconomyCatalog(){
  const g=getGame();let changed=false;
  g.hero.equipment=g.hero.equipment&&typeof g.hero.equipment==='object'?g.hero.equipment:{weapon:null,head:null,body:null,accessory:null};
  for(const slot of Object.keys(EQUIP_SLOT_LABELS))if(!(slot in g.hero.equipment)){g.hero.equipment[slot]=null;changed=true}
  g.shopItems=Array.isArray(g.shopItems)?g.shopItems:[];
  for(const i of g.shopItems)normalizeItem(i);
  for(const starter of STARTER_SHOP){if(!g.shopItems.some(x=>x.name===starter.name)){g.shopItems.push(clone(starter));changed=true}}
  g.lotteryPool=Array.isArray(g.lotteryPool)?g.lotteryPool:[];
  if(!g.lotteryPool.length){g.lotteryPool=clone(DEFAULT_LOTTERY);changed=true}
  g.inventory=Array.isArray(g.inventory)?g.inventory:[];
  g.couponRequests=Array.isArray(g.couponRequests)?g.couponRequests:[];
  g.inventoryTombstones=g.inventoryTombstones&&typeof g.inventoryTombstones==='object'&&!Array.isArray(g.inventoryTombstones)?g.inventoryTombstones:{};
  if(changed)save();
  return g;
}

export function itemDefinition(inv,game=getGame()){
  if(!inv)return null;
  return inv.itemSnapshot||inv.itemData||(game.shopItems||[]).find(x=>String(x.id)===String(inv.itemId))||null;
}
export function shopItemCategory(item={}){
  const game=getGame();
  if(item?.itemId||item?.itemSnapshot||item?.itemData){const def=itemDefinition(item,game);return String(item.category||def?.category||(item.battleConsumable?'consumable':item.lotteryReward?'coupon':'coupon'))}
  return String(item.category||(item.battleConsumable?'consumable':'coupon'));
}
export function inventoryStackKey(inv,game=getGame()){
  const def=itemDefinition(inv,game);return String(inv?.definitionId||inv?.itemId||def?.id||inv?.name||inv?.id||'');
}
export function inventoryGroups(items,game=getGame()){
  const groups=new Map();
  for(const inv of items||[]){
    const key=inventoryStackKey(inv,game),cat=shopItemCategory(inv),stackable=['coupon','consumable'].includes(cat),mapKey=stackable?key:String(inv.id||key);
    let group=groups.get(mapKey);
    if(!group){group={key,inv,item:itemDefinition(inv,game),category:cat,count:0,unusedCount:0,pendingCount:0,sources:[],instances:[]};groups.set(mapKey,group)}
    group.count++;group.instances.push(inv);if(inv.status==='unused')group.unusedCount++;if(inv.status==='pending')group.pendingCount++;
    if(inv.source&&!group.sources.includes(inv.source))group.sources.push(inv.source);
    if(group.inv?.status!=='unused'&&inv.status==='unused')group.inv=inv;
  }
  return [...groups.values()];
}
export function equipmentStatText(item){
  const s=item?.stats||{},labels={attack:'ATK',magicAttack:'MATK',defense:'DEF',magicDefense:'MDEF',speed:'SPD',maxHp:'HP',maxEnergy:'EN'},out=[];
  for(const [k,l] of Object.entries(labels))if(Number(s[k]))out.push(`${l} +${Number(s[k])}`);
  if(Number(s.crit))out.push(`暴擊 +${Math.round(Number(s.crit)*100)}%`);if(Number(s.evade))out.push(`閃避 +${Math.round(Number(s.evade)*100)}%`);if(Number(s.block))out.push(`格擋 +${Math.round(Number(s.block)*100)}%`);
  return out.join('、')||'無額外能力';
}
export function equipmentTotals(game=getGame()){
  const out={attack:0,magicAttack:0,defense:0,magicDefense:0,speed:0,maxHp:0,maxEnergy:0,crit:0,evade:0,block:0};
  for(const id of Object.values(game.hero?.equipment||{})){const inv=(game.inventory||[]).find(x=>String(x.id)===String(id));if(!inv)continue;const s=itemDefinition(inv,game)?.stats||inv.stats||{};for(const k of Object.keys(out))out[k]+=Number(s[k])||0}
  return out;
}
export function equipInventory(inventoryId){
  let equipped=false,error='';update(()=>{const g=ensureEconomyCatalog(),inv=(g.inventory||[]).find(x=>String(x.id)===String(inventoryId));const item=itemDefinition(inv,g);if(!inv||shopItemCategory(inv)!=='equipment'||!item?.equipSlot){error='這不是可裝備物品。';return}const slot=item.equipSlot;if(g.hero.equipment[slot]===inv.id){g.hero.equipment[slot]=null;equipped=false}else{g.hero.equipment[slot]=inv.id;equipped=true}});
  return error?result(false,error):result(true,equipped?'已裝備。':'已卸下。',{equipped});
}

function ensureLotteryLedger(g){
  g.lotteryCoinLedger=g.lotteryCoinLedger&&typeof g.lotteryCoinLedger==='object'&&!Array.isArray(g.lotteryCoinLedger)?g.lotteryCoinLedger:{};
  const legacy=g.assetAudit?.lotteryCoins;
  if(!Number.isFinite(Number(g.lotteryCoinLedger.baseline)))g.lotteryCoinLedger.baseline=Number.isFinite(Number(legacy?.baseline))?Number(legacy.baseline):Math.max(0,Number(g.hero?.lotteryCoins)||0);
  if(!g.lotteryCoinLedger.initializedAt)g.lotteryCoinLedger.initializedAt=legacy?.initializedAt||new Date().toISOString();
  if(!Array.isArray(g.lotteryCoinLedger.entries))g.lotteryCoinLedger.entries=Array.isArray(legacy?.entries)?clone(legacy.entries):[];
  return g.lotteryCoinLedger;
}
function changeLotteryCoinsInPlace(g,delta,source='system',meta={}){delta=Math.trunc(Number(delta)||0);const before=Math.max(0,Number(g.hero?.lotteryCoins)||0);if(before+delta<0)return null;const ledger=ensureLotteryLedger(g);g.hero.lotteryCoins=before+delta;ledger.entries.push({id:uid('coin'),at:new Date().toISOString(),date:localDateString(),delta,before,after:g.hero.lotteryCoins,source,...clone(meta)});if(ledger.entries.length>500)ledger.entries=ledger.entries.slice(-500);return{before,after:g.hero.lotteryCoins,delta}}
export function adjustLotteryCoins(delta,source='system',meta={}){let changed=null;update(()=>{changed=changeLotteryCoinsInPlace(ensureEconomyCatalog(),delta,source,meta)});return changed?result(true,`抽獎幣 ${changed.delta>=0?'+':''}${changed.delta}，目前 ${changed.after} 枚。`,{change:changed}):result(false,'抽獎幣不足。')}

export function buyShopItem(itemId){
  let purchased=null,error='';update(()=>{const g=ensureEconomyCatalog(),item=(g.shopItems||[]).find(x=>String(x.id)===String(itemId)&&x.active!==false);if(!item){error='找不到商品。';return}const today=localDateString(),limit=Math.max(1,Number(item.dailyLimit)||1),bought=(g.inventory||[]).filter(x=>String(x.itemId)===String(item.id)&&x.boughtDate===today&&x.source==='shop').length;if(bought>=limit){error='今天已達購買上限。';return}const price=Math.max(0,Number(item.price)||0);if((Number(g.hero.gold)||0)<price){error='金幣不足。';return}g.hero.gold=Math.max(0,Number(g.hero.gold)||0)-price;purchased={id:uid('inv'),itemId:item.id,name:item.name,status:'unused',boughtDate:today,source:'shop',category:shopItemCategory(item),description:item.description||'',itemSnapshot:clone(item)};if(item.battleConsumable)purchased.battleConsumable=true;if(item.equipSlot)purchased.equipSlot=item.equipSlot;if(item.stats)purchased.stats=clone(item.stats);if(item.effectType)Object.assign(purchased,{effectType:item.effectType,effectValue:Number(item.effectValue)||0,effectTurns:Number(item.effectTurns)||0});g.inventory.push(purchased)});
  return purchased?result(true,`已購買【${purchased.name}】。`,{item:purchased}):result(false,error||'購買失敗。');
}
function lotteryAvailable(item){if(item?.active===false)return false;if(item?.unlimited===true)return true;if(item?.unlimited===false)return Number(item.stock)>0;return Number(item?.stock)>=0}
function weightedPick(items){const rows=items.map(x=>({item:x,weight:Math.max(0,Number(x.weight)||0)})).filter(x=>x.weight>0),total=rows.reduce((n,x)=>n+x.weight,0);if(total<=0)return null;let r=Math.random()*total;for(const row of rows){r-=row.weight;if(r<=0)return row.item}return rows.at(-1)?.item||null}
export function drawLottery(){
  let reward=null,error='';update(()=>{const g=ensureEconomyCatalog();if((Number(g.hero.lotteryCoins)||0)<1){error='沒有抽獎幣。';return}const picked=weightedPick((g.lotteryPool||[]).filter(lotteryAvailable));if(!picked){error='抽獎池目前沒有可抽獎項。';return}if(!changeLotteryCoinsInPlace(g,-1,'lottery_draw',{rewardId:picked.id||'',rewardLabel:picked.label||picked.name||''})){error='沒有抽獎幣。';return}if(picked.unlimited==null)picked.unlimited=Number(picked.stock)===0;if(picked.unlimited!==true){picked.stock=Math.max(0,Number(picked.stock)||0)-1;if(picked.stock<=0){picked.stock=0;picked.unlimited=false}}const name=picked.label||picked.name||'神秘獎勵';reward={id:uid('inv'),itemId:`lottery_reward_${picked.id}`,name,status:'unused',boughtDate:localDateString(),source:'lottery',lotteryReward:true,category:'coupon',itemSnapshot:{id:`lottery_reward_${picked.id}`,name,label:name,icon:'🎁',category:'coupon',description:'抽獎獎勵，需由家長核准兌換。'}};g.inventory.push(reward)});
  return reward?result(true,`🎉 抽中了：${reward.name}\n已放入背包，可向家長申請兌換。`,{reward}):result(false,error||'抽獎失敗。');
}
export function requestInventoryUse(inventoryId){let req=null,error='';update(()=>{const g=ensureEconomyCatalog(),inv=(g.inventory||[]).find(x=>String(x.id)===String(inventoryId));if(!inv){error='找不到背包物品。';return}if(inv.status!=='unused'){error=inv.status==='pending'?'這個物品已在等待家長核准。':'這個物品目前不能申請使用。';return}if(inv.battleConsumable||shopItemCategory(inv)==='consumable'){error='戰鬥消耗品請在戰鬥中使用。';return}inv.status='pending';req={id:uid('coupon'),inventoryId:inv.id,itemId:inv.itemId||'',itemName:inv.name,date:localDateString(),createdAt:new Date().toISOString(),status:'pending'};g.couponRequests.push(req)});return req?result(true,'已送出兌換申請。',{request:req}):result(false,error||'申請失敗。')}
export function approveInventoryRequest(requestId,approved){let changed=null,error='';update(()=>{const g=ensureEconomyCatalog(),req=(g.couponRequests||[]).find(x=>String(x.id)===String(requestId));if(!req){error='找不到兌換申請。';return}if(req.status!=='pending'){error='這筆申請已處理。';return}const inv=(g.inventory||[]).find(x=>String(x.id)===String(req.inventoryId));req.status=approved?'approved':'rejected';req.reviewedAt=new Date().toISOString();if(approved){req.approvedDate=req.approvedDate||localDateString();if(inv){inv.status='used';inv.usedDate=inv.usedDate||req.approvedDate;inv.usedRequestId=req.id}}else if(inv)inv.status='unused';changed=req});return changed?result(true,approved?'已核准並核銷。':'已退回兌換申請。',{request:changed}):result(false,error||'處理失敗。')}
export function lotteryLedgerSnapshot(){const g=getGame(),ledger=g.lotteryCoinLedger&&typeof g.lotteryCoinLedger==='object'?g.lotteryCoinLedger:{},actual=Math.max(0,Number(g.hero?.lotteryCoins)||0),baseline=Number.isFinite(Number(ledger.baseline))?Number(ledger.baseline):actual,entries=Array.isArray(ledger.entries)?ledger.entries:[],expected=baseline+entries.reduce((n,e)=>n+(Number(e.delta)||0),0);return{actual,baseline,expected,diff:actual-expected,entries:entries.length}}

export function battleConsumableGroups(){const g=ensureEconomyCatalog(),rows=(g.inventory||[]).filter(inv=>inv.status==='unused'&&(inv.battleConsumable||shopItemCategory(inv)==='consumable'));return inventoryGroups(rows,g).map(group=>{const inv=group.instances.find(x=>x.status==='unused')||group.inv,item=itemDefinition(inv,g)||inv;return{stackKey:group.key,count:group.count,inventoryId:inv.id,name:inv.name,item:{...clone(item),effectType:inv.effectType||item.effectType,effectValue:Number(inv.effectValue??item.effectValue)||0,effectTurns:Number(inv.effectTurns??item.effectTurns)||0}}})}
export function consumeBattleConsumable(stackKey){
  let consumed=null;update(()=>{const g=ensureEconomyCatalog(),idx=(g.inventory||[]).findIndex(inv=>inv.status==='unused'&&(inv.battleConsumable||shopItemCategory(inv)==='consumable')&&inventoryStackKey(inv,g)===String(stackKey));if(idx<0)return;consumed=g.inventory[idx];g.inventory.splice(idx,1);g.inventoryTombstones[String(consumed.id)]={id:consumed.id,itemId:consumed.itemId||'',name:consumed.name||'',removedAt:new Date().toISOString(),reason:'battle_consumed'}});
  return consumed?result(true,`已消耗 ${consumed.name}。`,{item:consumed}):result(false,'道具數量不足。');
}
