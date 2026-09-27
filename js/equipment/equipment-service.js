import { itemDefinition } from '../economy/economy-service.js';
import { currentEquipmentContent } from './equipment-provider.js';

const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
const uid=(prefix='eq')=>`${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
const pick=(rows,random=Math.random)=>rows[Math.floor(random()*rows.length)]||null;

function databaseRules(database=currentEquipmentContent()?.database){
  return database?.rules&&typeof database.rules==='object'?database.rules:{};
}
function rarityTable(database=currentEquipmentContent()?.database){
  return database?.rarities&&typeof database.rarities==='object'?database.rarities:{};
}
function powerWeights(database=currentEquipmentContent()?.database){
  const w=databaseRules(database).powerWeights;
  return w&&typeof w==='object'?w:{};
}
function classWeights(database,heroClass='初心者'){
  const all=databaseRules(database).classWeights||{};
  return all[heroClass]||all['初心者']||{};
}
function tierRules(database){
  const t=databaseRules(database).tier;
  return t&&typeof t==='object'?t:{};
}
function baseRows(database){
  return Object.values(database?.bases||{}).map(raw=>{
    const base=clone(raw),visualId=base.visualId||base.id;
    base.visualId=visualId;
    base.visual=clone(base.visual||{
      inventory:`images/equipment/t0/${base.slot}/${visualId}.png`,
      paperDollIdle:`images/equipment/paperdoll/t0/${visualId}_idle.png`,
      paperDollBattle:`images/equipment/paperdoll/t0/${visualId}_battle.png`
    });
    base.inventoryIcon=base.inventoryIcon||`images/equipment/icons/${base.slot}/${visualId}.png`;
    return base;
  });
}

export function equipmentPowerScore(item){
  const weights=powerWeights();
  if(!Object.keys(weights).length){
    const snapshot=Number(item?.powerScore);
    return Number.isFinite(snapshot)?Math.max(0,snapshot):0;
  }
  const stat=Object.entries(item?.stats||{}).reduce((sum,[key,value])=>sum+(Number(weights[key])||0)*(Number(value)||0),0);
  const special=(item?.affixes||[]).filter(a=>a?.kind!=='stat').reduce((sum,a)=>sum+(Number(a?.power)||0),0);
  return Math.max(0,Math.round((stat+special)*10)/10);
}

export function equippedEquipmentItems(game){
  if(!game)return[];
  const ids=Object.values(game.hero?.equipment||{}).map(String);
  return ids.map(id=>(game.inventory||[]).find(x=>String(x.id)===id)).filter(Boolean).map(inv=>itemDefinition(inv,game)||inv).filter(Boolean);
}

export function equippedCombatAffixes(game){
  return equippedEquipmentItems(game).flatMap(item=>(item.affixes||[]).map(a=>({...clone(a),itemName:item.name||''})));
}

export function equippedEquipmentPowerScore(game){
  return Math.round(equippedEquipmentItems(game).reduce((sum,item)=>sum+equipmentPowerScore(item),0)*10)/10;
}

export function equipmentDropSource({eventType='daily',monsterId='',dateStr=''}={}){
  if(eventType==='tower')return'tower';
  if(eventType==='replay')return'replay';
  if(eventType==='final')return'final';
  if(eventType==='midterm')return'midterm';
  if(String(monsterId).startsWith('apocalypse_'))return'apocalypse';
  if(monsterId==='demon_general')return'demon_general';
  const d=new Date(`${dateStr||new Date().toISOString().slice(0,10)}T12:00:00`);
  return d.getDay()===5?'friday':'weekday';
}

function chooseRarity(source,database,random=Math.random){
  const rates=database?.dropRates?.[source]||{};
  const entries=Object.keys(rarityTable(database)).map(id=>[id,Math.max(0,Number(rates[id])||0)]);
  const total=entries.reduce((n,x)=>n+x[1],0);
  if(total<=0)return null;
  let r=random()*Math.max(100,total);
  for(const[id,weight]of entries){r-=weight;if(r<0)return id}
  return null;
}

function reconstructBases(database){
  return baseRows(database);
}

function rollValue(a,mult=1,random=Math.random){
  const min=Number(a.min)||0,max=Number(a.max??min),step=Math.max(.0001,Number(a.step||1)),count=Math.max(0,Math.round((max-min)/step));
  const raw=min+Math.floor(random()*(count+1))*step;
  return Math.round(raw*mult/step)*step;
}

function generatedName(base,rarity,affixes,tier){
  const prefix=affixes[0]?.name||'古塔',suffix=affixes.some(a=>a.kind==='summon')?'・契靈':affixes.some(a=>a.kind==='trigger')?'・回響':'';
  return `${rarity.icon||''} ${tier}・${prefix}${base.name}${suffix}`;
}

function randomEquipment({database,affixes,rarityId,week=1,floor=0,cycle=1,heroClass='初心者',source='',random=Math.random}){
  const rarities=rarityTable(database),rarity=rarities[rarityId]||rarities.common,bases=reconstructBases(database);
  if(!rarity||!bases.length)return null;
  const tierRule=tierRules(database),weekStep=Math.max(1,Number(tierRule.weekStep)||5),floorStep=Math.max(1,Number(tierRule.floorStep)||15);
  const tierNumber=source==='replay'?0:source==='tower'
    ?Math.max(0,Math.floor(Math.max(0,floor)/floorStep)+cycle-1)
    :Math.max(0,Math.floor((Math.max(1,week)-1)/weekStep)+Math.floor(Math.max(0,floor)/floorStep)+cycle-1);
  const tier=`T${tierNumber}`,tries=Math.max(1,Number(tierRule.defaultTries)||14),weights=classWeights(database,heroClass);
  let best=null,bestScore=-Infinity;

  for(let attempt=0;attempt<tries;attempt++){
    const base=pick(bases,random);if(!base)continue;
    const stats={...base.stats};
    const pool=Object.values(affixes||{}).filter(a=>(a.slots||[]).includes(base.slot)).map(clone),chosen=[];
    let count=Number(rarity.affixCount||0)+Math.min(2,tierNumber);

    while(chosen.length<count&&pool.length){
      const idx=Math.floor(random()*pool.length),a=pool.splice(idx,1)[0];
      if(a.kind==='stat'){
        a.value=rollValue(a,Number(rarity.powerMult||1)*(1+tierNumber*Number(tierRule.tierGrowth??.18)),random);
        stats[a.stat]=(Number(stats[a.stat])||0)+a.value;
        a.power=a.value*Number(a.powerPerUnit||1);
      }
      chosen.push(a);
    }

    if(rarity.id==='epic'&&chosen.length===3&&random()<Number(tierRule.epicFourthChance??.35)){
      const used=new Set(chosen.map(a=>a.id));
      const extra=Object.values(affixes||{}).filter(a=>(a.slots||[]).includes(base.slot)&&!used.has(a.id));
      if(extra.length){
        const a=clone(pick(extra,random));
        if(a.kind==='stat'){
          a.value=rollValue(a,1,random);
          stats[a.stat]=(Number(stats[a.stat])||0)+a.value;
          a.power=a.value*Number(a.powerPerUnit||1);
        }
        chosen.push(a);
      }
    }

    const visuals=Array.isArray(database?.iconPools?.[base.slot])?database.iconPools[base.slot]:[];
    const visualId=visuals.length?(pick(visuals,random)||base.visualId||base.id):(base.visualId||base.id);
    const item={
      id:uid('equipment_instance'),generated:true,tier,rarity:rarity.id,rarityName:rarity.name,name:'',
      icon:base.icon,category:'equipment',equipSlot:base.slot,baseId:base.id,visualId,
      visual:clone(base.visual),inventoryIcon:`images/equipment/icons/${base.slot}/${visualId}.png`,
      stats,affixes:chosen,setId:null,uniqueId:null,price:0,dailyLimit:1,active:false,
      enhancementLevel:0,createdAt:new Date().toISOString()
    };
    item.name=generatedName(base,rarity,chosen,tier);
    item.powerScore=equipmentPowerScore(item);
    item.unenhancedStats={...stats};
    item.baseStatsForEnhancement={...stats};

    let score=item.powerScore;
    for(const[k,v]of Object.entries(stats))score+=(weights[k]||.45)*Math.abs(Number(v)||0);
    for(const a of chosen){
      if(a.stat)score+=(weights[a.stat]||.45)*2;
      if(a.kind==='trigger'||a.kind==='summon')score+=5;
    }
    if(chosen.some(a=>a.stat==='attack')&&chosen.some(a=>a.stat==='magicAttack'))score-=4;
    if(score>bestScore){best=item;bestScore=score}
  }

  if(best){
    best.smartGenerated=true;
    best.generationContext={week,floor,cycle,heroClass,formulaVersion:databaseRules(database).version||database?.formulaVersion||''};
    best.description=`${best.tier} ${best.rarityName}｜裝備評估 ${best.powerScore}｜${best.affixes.map(a=>a.text||a.name).join('、')}｜智慧適配：${heroClass}・第${week}週`;
  }
  return best;
}

function templateEquipment({database,source,rarityId,week=1,random=Math.random}){
  const rows=Object.values(database?.templates||{}).filter(row=>{
    const item=row?.itemData||{};
    return row?.enabled!==false&&item.rarity===rarityId&&(row.sources||[]).includes(source)&&week>=Math.max(1,Number(row.minWeek)||1)&&week<=Math.max(1,Number(row.maxWeek)||999);
  });
  const total=rows.reduce((n,row)=>n+Math.max(0,Number(row.weight??10)),0);
  if(!rows.length||total<=0)return null;

  let r=random()*total,row=rows.at(-1);
  for(const x of rows){
    r-=Math.max(0,Number(x.weight??10));
    if(r<=0){row=x;break}
  }

  const item=clone(row.itemData);
  item.id=uid('equipment_instance');
  item.enhancementLevel=0;
  item.unenhancedStats={...(item.stats||{})};
  item.baseStatsForEnhancement={...(item.stats||{})};
  item.createdAt=new Date().toISOString();
  item.powerScore=equipmentPowerScore(item);
  item.templateId=row.templateId||item.templateId||null;
  return item;
}

function uniqueEquipment({database,affixes,floor=1,random=Math.random}){
  const orange=database?.orangeDrop||{};
  const chance=floor%5===0?Number(orange.bossFloorChance||0):Number(orange.normalFloorChance||0);
  if(chance<=0||random()>=chance)return null;

  const defs=database?.uniqueEquipment||{};
  const eligible=Object.entries(defs).filter(([,def])=>Number(def?.minFloor||1)<=floor);
  if(!eligible.length)return null;

  const weighted=[];
  for(const[id,def]of eligible){
    for(let i=0;i<Math.max(1,Number(def.weight)||1);i++)weighted.push([id,def]);
  }
  const[uniqueId,def]=pick(weighted,random)||[];
  if(!def)return null;

  const bases=reconstructBases(database),base=bases.find(x=>x.id===def.baseId);
  if(!base)return null;
  const stats={...base.stats,...(def.stats||{})};
  const chosen=(def.affixIds||[]).map(id=>affixes?.[id]).filter(Boolean).map(clone);

  for(const a of chosen){
    if(a.kind==='stat'){
      const value=Number(def.affixValues?.[a.id]??a.max??a.min??0);
      a.value=value;
      a.power=value*Number(a.powerPerUnit||1);
      stats[a.stat]=(Number(stats[a.stat])||0)+value;
    }
  }

  const item={
    id:uid('unique_equipment'),generated:true,tier:def.tier||'T0',rarity:'legendary',rarityName:'傳說',
    name:`🟠 ${def.name}`,icon:def.icon||base.icon,category:'equipment',equipSlot:base.slot,baseId:base.id,
    visualId:def.visualId||base.visualId,visual:clone(def.visual||base.visual||{}),stats,affixes:chosen,
    setId:null,uniqueId,price:0,dailyLimit:1,active:false,enhancementLevel:0,
    createdAt:new Date().toISOString(),description:def.description||''
  };
  item.powerScore=equipmentPowerScore(item);
  item.unenhancedStats={...stats};
  item.baseStatsForEnhancement={...stats};
  return item;
}

export function rollEquipmentDrop({source='weekday',week=1,floor=0,cycle=1,heroClass='初心者',forcedRarity=null,random=Math.random}={}){
  const content=currentEquipmentContent();
  if(!content?.database||!content?.affixes)return null;

  if(source==='tower'&&!forcedRarity){
    const orange=uniqueEquipment({
      database:content.database,
      affixes:content.affixes,
      floor:Math.max(1,floor),
      random
    });
    if(orange)return{
      type:'equipment',source,rarity:'legendary',item:orange,
      label:`🟠 ${orange.name}｜傳說獨特裝備`,unique:true
    };
  }

  const rarityId=forcedRarity||chooseRarity(source,content.database,random);
  if(!rarityId||rarityId==='legendary')return null;

  const item=templateEquipment({database:content.database,source,rarityId,week,random})
    ||randomEquipment({database:content.database,affixes:content.affixes,rarityId,week,floor,cycle,heroClass,source,random});
  if(!item)return null;

  return{
    type:'equipment',source,rarity:rarityId,item,
    label:`${rarityTable(content.database)[rarityId]?.icon||''} ${item.name}`.trim(),unique:false
  };
}

export function grantEquipmentDrop(game,drop,{dateStr='',source=''}={}){
  if(!game||!drop?.item)return null;
  game.inventory=Array.isArray(game.inventory)?game.inventory:[];
  const item=clone(drop.item);
  const inv={
    id:uid('inv'),itemId:item.id,itemData:item,name:item.name,status:'unused',
    boughtDate:dateStr||new Date().toISOString().slice(0,10),
    source:source||drop.source||'dungeon',category:'equipment',equipSlot:item.equipSlot,
    affixes:clone(item.affixes||[]),tier:item.tier,generated:true,
    templateId:item.templateId||null,uniqueId:item.uniqueId||null,locked:false
  };
  game.inventory.push(inv);
  return{...drop,inventoryId:inv.id,itemData:item};
}

export function equipmentDropLabel(drop){
  return drop?.label||drop?.item?.name||'';
}
