import { APP_CONFIG } from './app-config.js';
import { V2_MONSTER_SKILLS, V2_MONSTER_SKILL_EXTENSIONS } from './v2-content-database.js';

let loading=null;
let normalizedSource=null;
let normalizedDatabase=null;

const LEGACY_MONSTER_SKILL_OVERRIDES=Object.freeze({
  golden_shield:{damageTakenMultiplier:.65,duration:2},
  mana_shield:{damageTakenMultiplier:.65,duration:2}
});

function normalizeContentDatabase(source){
  if(!source)return null;
  if(source===normalizedSource&&normalizedDatabase)return normalizedDatabase;

  const monsterSkills={...(source.monsterSkills||{})};

  for(const [id,definition] of Object.entries(V2_MONSTER_SKILLS)){
    if(monsterSkills[id]==null)monsterSkills[id]={...definition};
  }
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

function loadSkillDatabase(){
  if(globalThis.STUDYRPG_SKILL_DATABASE)return Promise.resolve(globalThis.STUDYRPG_SKILL_DATABASE);
  if(typeof document==='undefined')return Promise.reject(new Error('目前環境無法載入 Skill DB'));

  return new Promise((resolve,reject)=>{
    const selector='script[data-studyrpg-content="skill-database"]';
    const old=document.querySelector(selector);

    // 若節點存在但 DB 不存在，代表它的 load/error 已經發生過。
    // 不能再掛 listener 等舊事件，直接移除並重新正式載入。
    if(old)old.remove();

    const script=document.createElement('script');
    script.dataset.studyrpgContent='skill-database';
    script.src=APP_CONFIG.assetBase+'skill-database.js';

    script.onload=()=>{
      const db=globalThis.STUDYRPG_SKILL_DATABASE||null;
      if(db)resolve(db);
      else reject(new Error('Skill DB 已載入，但 STUDYRPG_SKILL_DATABASE 不存在'));
    };
    script.onerror=()=>{
      script.remove();
      reject(new Error('Skill DB 載入失敗'));
    };

    document.head.appendChild(script);
  });
}

export async function ensureContentDatabase(){
  const ready=currentContentDatabase();
  if(ready)return ready;
  if(loading)return loading;

  loading=loadSkillDatabase()
    .then(source=>{
      const db=normalizeContentDatabase(source);
      if(!db)throw new Error('Skill DB 無法初始化');
      return db;
    })
    .finally(()=>{loading=null});

  return loading;
}
