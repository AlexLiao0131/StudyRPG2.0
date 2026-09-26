import { APP_CONFIG } from '../data/app-config.js';
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

function loadScript(path,key){
  if(globalThis[key])return Promise.resolve(globalThis[key]);
  if(typeof document==='undefined')return Promise.resolve(null);
  return new Promise(resolve=>{
    const selector=`script[data-studyrpg-content="${key}"]`;
    const old=document.querySelector(selector);
    if(old){
      old.addEventListener('load',()=>resolve(globalThis[key]||null),{once:true});
      old.addEventListener('error',()=>resolve(null),{once:true});
      return;
    }
    const script=document.createElement('script');
    script.dataset.studyrpgContent=key;
    script.src=APP_CONFIG.assetBase+path;
    script.onload=()=>resolve(globalThis[key]||null);
    script.onerror=()=>resolve(null);
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
