import { getGame, update } from '../core/store.js';
import { localDateString } from '../core/date.js';
import { adjustLotteryCoins, approveInventoryRequest, lotteryLedgerSnapshot, shopItemCategory, ensureEconomyCatalog } from '../economy/economy-service.js';

const uid=(prefix='id')=>`${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
const result=(ok,message,data={})=>({ok,message,...data});
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));

export function addShopItem(input={}){
  const name=String(input.name||'').trim();if(!name)return result(false,'請輸入商品名稱。');
  const category=['coupon','consumable','equipment','special'].includes(input.category)?input.category:'coupon';
  let item=null;
  update(()=>{
    item={
      id:uid('shop'),name,category,description:String(input.description||'').trim(),
      icon:category==='equipment'?'🛡️':category==='consumable'?'🧪':category==='coupon'?'🎟️':'✨',
      price:Math.max(0,Number(input.price)||0),dailyLimit:Math.max(1,Number(input.dailyLimit)||1),active:true
    };
    if(category==='equipment'){
      item.equipSlot=['weapon','head','body','accessory'].includes(input.equipSlot)?input.equipSlot:'weapon';
      const key=String(input.statKey||'attack');let value=Number(input.statValue)||0;
      if(['crit','evade','block'].includes(key))value/=100;
      item.stats={[key]:value};
    }
    if(category==='consumable'){
      item.subtype='battle';item.battleConsumable=true;item.effectType=String(input.effectType||'poison');
      item.effectValue=Number(input.effectValue)||0;item.effectTurns=item.effectType==='poison'?3:0;
    }
    const g=ensureEconomyCatalog();g.shopItems=g.shopItems||[];g.shopItems.push(item);
  });
  return result(true,'商品已新增。',{item});
}

export function deleteShopItem(id){
  let removed=false;
  update(()=>{const g=ensureEconomyCatalog(),n=(g.shopItems||[]).length;g.shopItems=(g.shopItems||[]).filter(x=>String(x.id)!==String(id));removed=g.shopItems.length<n});
  return removed?result(true,'商品已刪除。'):result(false,'找不到商品。');
}

export function addLotteryReward({label,weight=10,stock=0}={}){
  label=String(label||'').trim();if(!label)return result(false,'請輸入獎項名稱。');
  let reward=null;stock=Math.max(0,Math.trunc(Number(stock)||0));
  update(()=>{ensureEconomyCatalog();reward={id:uid('lottery'),label,weight:Math.max(1,Number(weight)||1),stock,unlimited:stock===0,active:true};const g=getGame();g.lotteryPool=g.lotteryPool||[];g.lotteryPool.push(reward)});
  return result(true,'抽獎獎項已新增。',{reward});
}
export function deleteLotteryReward(id){let removed=false;update(()=>{const g=ensureEconomyCatalog(),n=(g.lotteryPool||[]).length;g.lotteryPool=(g.lotteryPool||[]).filter(x=>String(x.id)!==String(id));removed=g.lotteryPool.length<n});return removed?result(true,'抽獎獎項已刪除。'):result(false,'找不到獎項。')}
export function gmAdjustLotteryCoins(delta){return adjustLotteryCoins(Math.trunc(Number(delta)||0),'gm_adjustment',{note:'家長後台調整'})}
export function reviewCouponRequest(id,approved){return approveInventoryRequest(id,approved)}

export function adjustGold(direction,amount){
  amount=Math.floor(Number(amount)||0);if(amount<=0)return result(false,'請輸入大於 0 的金幣數量。');
  const delta=direction==='subtract'?-amount:amount;let audit=null,error='';
  update(()=>{
    const g=getGame(),before=Math.max(0,Number(g.hero.gold)||0);
    if(before+delta<0){error=`金幣不足，目前只有 ${before} G。`;return}
    g.hero.gold=before+delta;
    audit={id:uid('gm'),type:'gold',date:new Date().toISOString(),delta,before,after:g.hero.gold};
    g.gmAudit=g.gmAudit||[];g.gmAudit.unshift(audit);g.gmAudit=g.gmAudit.slice(0,100);
  });
  return audit?result(true,`金幣 ${delta>=0?'+':''}${delta} G，目前 ${audit.after} G。`,{audit}):result(false,error||'調整失敗。');
}

function inventoryCategory(g,inv){return shopItemCategory(inv)}
export function assetAuditSummary(){
  const g=ensureEconomyCatalog(),lottery=lotteryLedgerSnapshot(),requests=g.couponRequests||[],inventory=g.inventory||[];
  const approved=requests.filter(r=>r.status==='approved');
  const usedCoupons=inventory.filter(inv=>inv.status==='used'&&inventoryCategory(g,inv)==='coupon');
  const issues=[];
  approved.forEach(r=>{const inv=inventory.find(x=>String(x.id)===String(r.inventoryId));if(!inv)issues.push(`${r.itemName||'兌換品'}：已核准但找不到背包項目`);else if(inv.status!=='used')issues.push(`${r.itemName||inv.name||'兌換品'}：申請已核准，但背包狀態為 ${inv.status||'未知'}`);else if(inv.usedRequestId&&String(inv.usedRequestId)!==String(r.id))issues.push(`${r.itemName||inv.name||'兌換品'}：核銷申請 ID 不一致`)});
  usedCoupons.forEach(inv=>{const req=requests.find(x=>String(x.id)===String(inv.usedRequestId))||requests.find(x=>String(x.inventoryId)===String(inv.id)&&x.status==='approved');if(!req)issues.push(`${inv.name||'兌換品'}：背包已使用，但找不到核准紀錄`)});
  return{lottery,coupon:{approved:approved.length,used:usedCoupons.length,pending:requests.filter(r=>r.status==='pending').length,issues}};
}

export function backfillCoupon({itemId,count=1,reason='舊同步遺失回補'}={}){
  count=Math.max(1,Math.min(20,Math.trunc(Number(count)||1)));reason=String(reason||'舊同步遺失回補').trim()||'舊同步遺失回補';let item=null,ids=[];
  update(()=>{
    const g=ensureEconomyCatalog();item=(g.shopItems||[]).find(x=>String(x.id)===String(itemId)&&shopItemCategory(x)==='coupon');if(!item)return;
    g.inventory=g.inventory||[];
    for(let i=0;i<count;i++){const inv={id:uid('inv'),itemId:item.id,name:item.name,status:'unused',boughtDate:localDateString(),source:'gm_backfill',category:'coupon',description:item.description||'',backfill:true,backfillReason:reason,backfilledAt:new Date().toISOString(),itemSnapshot:clone(item)};g.inventory.push(inv);ids.push(inv.id)}
    g.gmAudit=g.gmAudit||[];g.gmAudit.unshift({id:uid('gm'),type:'coupon_backfill',date:new Date().toISOString(),itemId:item.id,itemName:item.name,count,reason,inventoryIds:ids});
    g.gmAudit=g.gmAudit.slice(0,100);
  });
  return item?result(true,`已回補 ${item.name} ×${count}。`,{inventoryIds:ids}):result(false,'請選擇兌換券商品。');
}
