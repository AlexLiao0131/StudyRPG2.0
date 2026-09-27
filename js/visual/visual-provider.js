import { APP_CONFIG } from '../data/app-config.js';
import { VISUAL_CONFIG } from './visual-config.js';

let loading=null;

export function currentVisualDatabase(){
  return globalThis.STUDYRPG_VISUAL_DATABASE||VISUAL_CONFIG;
}

function loadVisualDatabase(){
  if(globalThis.STUDYRPG_VISUAL_DATABASE)return Promise.resolve(globalThis.STUDYRPG_VISUAL_DATABASE);
  if(typeof document==='undefined')return Promise.reject(new Error('目前環境無法載入 Visual DB'));

  return new Promise((resolve,reject)=>{
    const selector='script[data-studyrpg-content="visual-database"]';
    const old=document.querySelector(selector);

    // 舊節點存在但全域 Visual DB 不存在時，load/error 已經結束。
    // 移除後重新載入，避免永遠等待舊事件。
    if(old)old.remove();

    const script=document.createElement('script');
    script.dataset.studyrpgContent='visual-database';
    script.src=APP_CONFIG.assetBase+'visual-database.js';

    script.onload=()=>{
      const db=globalThis.STUDYRPG_VISUAL_DATABASE||null;
      if(db)resolve(db);
      else reject(new Error('Visual DB 已載入，但 STUDYRPG_VISUAL_DATABASE 不存在'));
    };
    script.onerror=()=>{
      script.remove();
      reject(new Error('Visual DB 載入失敗'));
    };

    document.head.appendChild(script);
  });
}

export async function ensureVisualContent(){
  if(globalThis.STUDYRPG_VISUAL_DATABASE)return currentVisualDatabase();
  if(loading)return loading;

  loading=loadVisualDatabase()
    .then(()=>currentVisualDatabase())
    .finally(()=>{loading=null});

  return loading;
}
