import { APP_CONFIG } from './app-config.js';
import { V2_MONSTER_SKILLS, V2_MONSTER_SKILL_EXTENSIONS } from './v2-content-database.js';
import { loadLegacyDatabaseScript } from './legacy-script-loader.js';

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

async function loadSkillDatabase(){
  if(globalThis.STUDYRPG_SKILL_DATABASE)return globalThis.STUDYRPG_SKILL_DATABASE;
  return loadLegacyDatabaseScript({
    url:APP_CONFIG.assetBase+'skill-database.js',
    globalKey:'STUDYRPG_SKILL_DATABASE',
    label:'Skill DB'
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
