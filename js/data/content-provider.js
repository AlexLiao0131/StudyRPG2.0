import { APP_CONFIG } from './app-config.js';
import { V2_MONSTER_SKILLS, V2_MONSTER_SKILL_EXTENSIONS } from './v2-content-database.js';

let loading=null;
let normalizedSource=null;
let normalizedDatabase=null;

const FETCH_TIMEOUT_MS=15000;

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

function parseSkillDatabaseSource(text){
  const source=String(text||'');
  const assignAt=source.indexOf('=');
  const firstBrace=source.indexOf('{',assignAt);
  const lastBrace=source.lastIndexOf('}');
  if(assignAt<0||firstBrace<0||lastBrace<=firstBrace)throw new Error('Skill DB 格式無法辨識');
  const parsed=JSON.parse(source.slice(firstBrace,lastBrace+1));
  if(!Array.isArray(parsed?.beginner)||!parsed?.monsterSkills||!parsed?.monsterAI){
    throw new Error('Skill DB 結構不完整');
  }
  return parsed;
}

async function fetchSkillDatabase(){
  if(globalThis.STUDYRPG_SKILL_DATABASE)return globalThis.STUDYRPG_SKILL_DATABASE;
  if(typeof fetch!=='function')throw new Error('目前環境不支援 Skill DB 載入');

  const controller=typeof AbortController!=='undefined'?new AbortController():null;
  const timer=controller?setTimeout(()=>controller.abort(),FETCH_TIMEOUT_MS):null;

  try{
    const response=await fetch(APP_CONFIG.assetBase+'skill-database.js',{
      cache:'no-store',
      signal:controller?.signal
    });
    if(!response.ok)throw new Error(`Skill DB HTTP ${response.status}`);
    const parsed=parseSkillDatabaseSource(await response.text());
    globalThis.STUDYRPG_SKILL_DATABASE=parsed;
    return parsed;
  }catch(error){
    if(error?.name==='AbortError')throw new Error('Skill DB 載入逾時');
    throw error;
  }finally{
    if(timer)clearTimeout(timer);
  }
}

export async function ensureContentDatabase(){
  const ready=currentContentDatabase();
  if(ready)return ready;
  if(loading)return loading;

  loading=fetchSkillDatabase()
    .then(source=>{
      const db=normalizeContentDatabase(source);
      if(!db)throw new Error('Skill DB 載入失敗');
      return db;
    })
    .finally(()=>{loading=null});

  return loading;
}
