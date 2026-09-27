import { APP_CONFIG } from './app-config.js';

let loading=null;
let normalizedSource=null;
let normalizedDatabase=null;

const LEGACY_MONSTER_SKILL_OVERRIDES=Object.freeze({
  // 1.0 Runtime 對這兩個護盾固定套用 35% 減傷，但舊 skill-database 缺少宣告欄位。
  // Migration 階段在 Provider 補成正式資料，避免 BattleEngine 再靠 skill id 判斷。
  golden_shield:{damageTakenMultiplier:.65,duration:2},
  mana_shield:{damageTakenMultiplier:.65,duration:2}
});

function normalizeContentDatabase(source){
  if(!source)return null;
  if(source===normalizedSource&&normalizedDatabase)return normalizedDatabase;

  const monsterSkills={...(source.monsterSkills||{})};
  for(const [id,override] of Object.entries(LEGACY_MONSTER_SKILL_OVERRIDES)){
    const original=monsterSkills[id];
    if(!original)continue;
    const normalized={...original};
    for(const [key,value] of Object.entries(override)){
      if(normalized[key]==null)normalized[key]=value;
    }
    monsterSkills[id]=normalized;
  }

  normalizedSource=source;
  normalizedDatabase={...source,monsterSkills};
  return normalizedDatabase;
}

export function currentContentDatabase(){
  return normalizeContentDatabase(globalThis.STUDYRPG_SKILL_DATABASE||null);
}

export async function ensureContentDatabase(){
  const ready=currentContentDatabase();
  if(ready)return ready;
  if(loading)return loading;
  loading=new Promise(resolve=>{
    if(typeof document==='undefined'){resolve(null);return;}
    const old=document.querySelector('script[data-studyrpg-content="skill-database"]');
    if(old){
      old.addEventListener('load',()=>resolve(currentContentDatabase()),{once:true});
      old.addEventListener('error',()=>resolve(null),{once:true});
      return;
    }
    const script=document.createElement('script');
    script.dataset.studyrpgContent='skill-database';
    script.src=APP_CONFIG.assetBase+'skill-database.js';
    script.onload=()=>resolve(currentContentDatabase());
    script.onerror=()=>resolve(null);
    document.head.appendChild(script);
  });
  return loading;
}
