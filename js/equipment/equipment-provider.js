import { APP_CONFIG } from '../data/app-config.js';
import { EQUIPMENT_SKILL_AFFIXES } from './equipment-skill-affix-database.js';

let loading=null;
const SCRIPT_TIMEOUT_MS=6000;

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

function loadScript(path,key){
  if(globalThis[key])return Promise.resolve(globalThis[key]);
  if(typeof document==='undefined')return Promise.resolve(null);

  return new Promise(resolve=>{
    const selector=`script[data-studyrpg-content="${key}"]`;
    const old=document.querySelector(selector);

    // 舊 script 可能早已 load/error；此時再等事件會讓 openBattle 永久卡住。
    if(old)old.remove();

    const script=document.createElement('script');
    script.dataset.studyrpgContent=key;
    script.src=APP_CONFIG.assetBase+path;

    let settled=false;
    const finish=()=>{
      if(settled)return;
      settled=true;
      clearTimeout(timer);
      resolve(globalThis[key]||null);
    };

    script.onload=finish;
    script.onerror=finish;
    const timer=setTimeout(()=>{
      script.remove();
      finish();
    },SCRIPT_TIMEOUT_MS);

    document.head.appendChild(script);
  });
}

export async function ensureEquipmentContent(){
  const ready=currentEquipmentContent();
  if(ready)return ready;
  if(loading)return loading;

  loading=Promise.all([
    loadScript('affix-database.js','STUDYRPG_AFFIX_DATABASE'),
    loadScript('tools/Equipment/equipment-database.js','STUDYRPG_EQUIPMENT_DATABASE')
  ]).then(()=>currentEquipmentContent()).finally(()=>{loading=null});

  return loading;
}
