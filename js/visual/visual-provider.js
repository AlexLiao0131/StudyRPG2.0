import { APP_CONFIG } from '../data/app-config.js';
import { VISUAL_CONFIG } from './visual-config.js';

let loading=null;
const SCRIPT_TIMEOUT_MS=6000;

export function currentVisualDatabase(){
  return globalThis.STUDYRPG_VISUAL_DATABASE||VISUAL_CONFIG;
}

export async function ensureVisualContent(){
  if(globalThis.STUDYRPG_VISUAL_DATABASE)return currentVisualDatabase();
  if(loading)return loading;
  if(typeof document==='undefined')return currentVisualDatabase();

  loading=new Promise(resolve=>{
    const selector='script[data-studyrpg-content="visual-database"]';
    const old=document.querySelector(selector);

    // 防止舊節點的 load/error 已經發生，造成後來的 listener 永遠等不到。
    if(old)old.remove();

    const script=document.createElement('script');
    script.dataset.studyrpgContent='visual-database';
    script.src=APP_CONFIG.assetBase+'visual-database.js';

    let settled=false;
    const finish=()=>{
      if(settled)return;
      settled=true;
      clearTimeout(timer);
      resolve(currentVisualDatabase());
    };

    script.onload=finish;
    script.onerror=finish;
    const timer=setTimeout(()=>{
      script.remove();
      finish();
    },SCRIPT_TIMEOUT_MS);

    document.head.appendChild(script);
  }).finally(()=>{loading=null});

  return loading;
}
