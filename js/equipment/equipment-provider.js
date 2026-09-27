import { APP_CONFIG } from '../data/app-config.js';
import { loadLegacyDatabaseScript } from '../data/legacy-script-loader.js';
import { EQUIPMENT_SKILL_AFFIXES } from './equipment-skill-affix-database.js';

let loading=null;

function globals(){
  const legacy=globalThis.STUDYRPG_AFFIX_DATABASE?.affixes||null;
  return {
    affixes:legacy?{...legacy,...EQUIPMENT_SKILL_AFFIXES}:null,
    database:globalThis.STUDYRPG_EQUIPMENT_DATABASE||null
  };
}

export function currentEquipmentContent(){
  const now=globals();
  return now.affixes&&now.database?now:null;
}

// 裝備 instance 可保留 roll 出來的 value/power，但規則欄位永遠以目前 Affix DB 為準。
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
