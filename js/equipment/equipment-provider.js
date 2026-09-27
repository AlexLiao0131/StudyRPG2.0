import { APP_CONFIG } from '../data/app-config.js';
import { loadLegacyDatabaseScript } from '../data/legacy-script-loader.js';

let loading=null;
let legacyRuleCache=null;

function globals(){
  return {
    // Canonical source: 1.0 affix-database.js only.
    affixes:globalThis.STUDYRPG_AFFIX_DATABASE?.affixes||null,
    // Canonical template/drop/unique source: 1.0 Equipment DB.
    database:globalThis.STUDYRPG_EQUIPMENT_DATABASE||null
  };
}

function balancedObject(text,start){
  let depth=0,q=null,escape=false,line=false,block=false;
  for(let i=start;i<text.length;i++){
    const c=text[i],n=text[i+1];
    if(line){if(c==='\n')line=false;continue}
    if(block){if(c==='*'&&n==='/'){block=false;i++}continue}
    if(q){
      if(escape){escape=false;continue}
      if(c==='\\'){escape=true;continue}
      if(c===q)q=null;
      continue;
    }
    if(c==='/'&&n==='/'){line=true;i++;continue}
    if(c==='/'&&n==='*'){block=true;i++;continue}
    if(c==='"'||c==="'"||c==='`'){q=c;continue}
    if(c==='{')depth++;
    else if(c==='}'){
      depth--;
      if(depth===0)return text.slice(start,i+1);
    }
  }
  return null;
}

function literalAfter(text,tokens){
  for(const token of tokens){
    const i=text.indexOf(token);
    if(i<0)continue;
    const s=text.indexOf('{',i+token.length);
    if(s<0)continue;
    const raw=balancedObject(text,s);
    if(!raw)continue;
    try{return Function('"use strict";return ('+raw+')')()}catch{}
  }
  return {};
}

function literalAfterAnchor(text,anchor,tokens){
  const a=text.indexOf(anchor);
  if(a<0)return {};
  for(const token of tokens){
    const i=text.indexOf(token,a+anchor.length);
    if(i<0)continue;
    const s=text.indexOf('{',i+token.length);
    if(s<0)continue;
    const raw=balancedObject(text,s);
    if(!raw)continue;
    try{return Function('"use strict";return ('+raw+')')()}catch{}
  }
  return {};
}

function parseLegacyEquipmentRules(text){
  const legacy=literalAfter(text,['window.EQUIPMENT_GENERATION_RULES=']);
  if(legacy?.version)return legacy;

  const version=(text.match(/STUDYRPG_ITEM_EQUIPMENT_DB\s*=\s*\{version:['"]([^'"]+)['"]/i)||[])[1]||'';
  const powerWeights=literalAfterAnchor(text,'function statPower(stats={})',['const w=']);
  const classWeights=literalAfterAnchor(text,'function classWeights()',['return ']);
  const tierExpr=text.match(/Math\.floor\(\(week-1\)\/(\d+)\)\+Math\.floor\(floor\/(\d+)\)\+cycle-1/);
  const growthExpr=text.match(/rarity\.powerMult\*\(1\+tier\*([.\d]+)\)/);
  const epicExpr=text.match(/item\?\.rarity!==['"]epic['"][\s\S]{0,120}?Math\.random\(\)>=([.\d]+)/);
  const triesExpr=text.match(/Math\.max\(6,Number\(opts\.tries\)\|\|(\d+)\)/);

  if(!version||!Object.keys(powerWeights).length||!Object.keys(classWeights).length||!tierExpr||!growthExpr||!triesExpr){
    throw new Error('1.0 Equipment 規則解析失敗');
  }

  return {
    version,
    powerWeights,
    classWeights,
    tier:{
      weekStep:Number(tierExpr[1]),
      floorStep:Number(tierExpr[2]),
      tierGrowth:Number(growthExpr[1]),
      epicFourthChance:epicExpr?Number(epicExpr[1]):.35,
      defaultTries:Number(triesExpr[1])
    }
  };
}

async function loadLegacyEquipmentRules(){
  if(legacyRuleCache)return legacyRuleCache;
  if(typeof fetch!=='function')throw new Error('Equipment 規則：瀏覽器不支援 fetch');

  const response=await fetch(APP_CONFIG.assetBase+'index.html',{cache:'no-store',credentials:'omit'});
  if(!response.ok)throw new Error(`Equipment 規則下載失敗：HTTP ${response.status}`);
  const text=await response.text();

  const rarities=literalAfter(text,['const RARITIES=','window.EQUIPMENT_RARITY_DATABASE=']);
  const bases=literalAfter(text,['const BASES=','window.EQUIPMENT_BASE_DATABASE_T0=']);
  const iconPools=literalAfter(text,[
    'DB.iconPools=window.EQUIPMENT_ICON_POOLS=',
    'window.EQUIPMENT_ICON_POOLS=',
    'DB.iconPools='
  ]);
  const rules=parseLegacyEquipmentRules(text);

  if(!Object.keys(rarities).length||!Object.keys(bases).length||!Object.keys(iconPools).length){
    throw new Error('1.0 Equipment 基底／稀有度／圖示池解析失敗');
  }

  legacyRuleCache={rarities,bases,iconPools,rules};
  return legacyRuleCache;
}

export function currentEquipmentContent(){
  const now=globals();
  if(!now.affixes||!now.database)return null;
  return {affixes:now.affixes,database:now.database};
}

export function canonicalEquipmentAffix(affix={}){
  const def=currentEquipmentContent()?.affixes?.[String(affix?.id||'')];
  return def?{...affix,...def}:affix;
}

async function loadDatabase(path,key,label){
  if(globalThis[key])return globalThis[key];
  return loadLegacyDatabaseScript({
    url:APP_CONFIG.assetBase+path,
    globalKey:key,
    label
  });
}

export async function ensureEquipmentContent(){
  const ready=currentEquipmentContent();
  if(ready?.database?.bases&&ready?.database?.rarities&&ready?.database?.rules&&ready?.database?.iconPools)return ready;
  if(loading)return loading;

  loading=Promise.all([
    loadDatabase('affix-database.js','STUDYRPG_AFFIX_DATABASE','Affix DB'),
    loadDatabase('tools/Equipment/equipment-database.js','STUDYRPG_EQUIPMENT_DATABASE','Equipment DB'),
    loadLegacyEquipmentRules()
  ]).then(([affixDb,equipmentDb,legacyRules])=>{
    // 不建立第二份 Database；只把 1.0 index.html 中原本的正式規則
    // 掛回同一個 STUDYRPG_EQUIPMENT_DATABASE 物件供 2.0 Runtime 解讀。
    if(!equipmentDb.bases)equipmentDb.bases=legacyRules.bases;
    if(!equipmentDb.rarities)equipmentDb.rarities=legacyRules.rarities;
    if(!equipmentDb.rules)equipmentDb.rules=legacyRules.rules;
    if(!equipmentDb.iconPools)equipmentDb.iconPools=legacyRules.iconPools;

    const content={
      affixes:affixDb?.affixes||null,
      database:equipmentDb||null
    };
    if(!content.affixes||!content.database)throw new Error('Equipment DB 無法初始化');
    return content;
  }).finally(()=>{loading=null});

  return loading;
}
