import { APP_CONFIG } from './app-config.js';
import { LEGACY_MONSTER_SKILL_NORMALIZATION } from './content-normalization-database.js';

let loading=null;
let normalizedSource=null;
let normalizedDatabase=null;

function normalizeContentDatabase(source){
  if(!source)return null;
  if(source===normalizedSource&&normalizedDatabase)return normalizedDatabase;

  const monsterSkills={...(source.monsterSkills||{})};
  for(const [id,override] of Object.entries(LEGACY_MONSTER_SKILL_NORMALIZATION)){
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
