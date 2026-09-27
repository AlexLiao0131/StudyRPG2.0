import { APP_CONFIG } from './app-config.js';
import { V2_MONSTER_SKILLS, V2_MONSTER_SKILL_EXTENSIONS } from './v2-content-database.js';

let loading=null;
let normalizedSource=null;
let normalizedDatabase=null;

const SCRIPT_TIMEOUT_MS=6000;

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

  // 2.0-only content absent from the legacy Skill DB. Never overwrites a real legacy definition.
  for(const [id,definition] of Object.entries(V2_MONSTER_SKILLS)){
    if(monsterSkills[id]==null)monsterSkills[id]={...definition};
  }
  // Fields that legacy data intentionally lacks but the 2.0 runtime needs.
  for(const [id,extension] of Object.entries(V2_MONSTER_SKILL_EXTENSIONS)){
    if(monsterSkills[id])monsterSkills[id]={...monsterSkills[id],...extension};
  }

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

function loadLegacySkillDatabase(){
  if(globalThis.STUDYRPG_SKILL_DATABASE)return Promise.resolve(globalThis.STUDYRPG_SKILL_DATABASE);
  if(typeof document==='undefined')return Promise.resolve(null);

  return new Promise(resolve=>{
    const selector='script[data-studyrpg-content="skill-database"]';
    const old=document.querySelector(selector);

    // 舊節點若已觸發過 load/error，再掛 listener 會永久等待。
    // Battle 開啟時寧可移除舊節點重新載入，也不能讓 Promise 卡死。
    if(old)old.remove();

    const script=document.createElement('script');
    script.dataset.studyrpgContent='skill-database';
    script.src=APP_CONFIG.assetBase+'skill-database.js';

    let settled=false;
    const finish=()=>{
      if(settled)return;
      settled=true;
      clearTimeout(timer);
      resolve(globalThis.STUDYRPG_SKILL_DATABASE||null);
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

export async function ensureContentDatabase(){
  const ready=currentContentDatabase();
  if(ready)return ready;
  if(loading)return loading;

  loading=loadLegacySkillDatabase()
    .then(()=>currentContentDatabase())
    .finally(()=>{loading=null});

  return loading;
}
