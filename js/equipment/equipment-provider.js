import { APP_CONFIG } from '../data/app-config.js';
import { loadLegacyDatabaseScript } from '../data/legacy-script-loader.js';

let loading=null;

function globals(){
  return {
    // Canonical source: 1.0 affix-database.js only.
    affixes:globalThis.STUDYRPG_AFFIX_DATABASE?.affixes||null,
    // Canonical source: 1.0 tools/Equipment/equipment-database.js only.
    database:globalThis.STUDYRPG_EQUIPMENT_DATABASE||null
  };
}

export function currentEquipmentContent(){
  const now=globals();
  return now.affixes&&now.database?now:null;
}

// 裝備 instance 可保留取得時的 value / power 快照。
// 若該 affix id 仍存在於正式 1.0 Affix DB，規則欄位以 canonical DB 為準；
// 若是舊存檔中已存在、但現行 DB 沒有的歷史詞綴，保留 instance 快照以避免舊存檔損壞。
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
  if(ready)return ready;
  if(loading)return loading;

  loading=Promise.all([
    loadDatabase('affix-database.js','STUDYRPG_AFFIX_DATABASE','Affix DB'),
    loadDatabase('tools/Equipment/equipment-database.js','STUDYRPG_EQUIPMENT_DATABASE','Equipment DB')
  ]).then(()=>{
    const content=currentEquipmentContent();
    if(!content)throw new Error('Equipment DB 無法初始化');
    return content;
  }).finally(()=>{loading=null});

  return loading;
}
