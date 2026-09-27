import { APP_CONFIG } from '../data/app-config.js';
import { VISUAL_CONFIG } from './visual-config.js';

let loading=null;

export function currentVisualDatabase(){
  return globalThis.STUDYRPG_VISUAL_DATABASE||VISUAL_CONFIG;
}

export async function ensureVisualContent(){
  if(globalThis.STUDYRPG_VISUAL_DATABASE)return currentVisualDatabase();
  if(loading)return loading;
  if(typeof document==='undefined')return currentVisualDatabase();
  loading=new Promise(resolve=>{
    const old=document.querySelector('script[data-studyrpg-content="visual-database"]');
    if(old){
      if(globalThis.STUDYRPG_VISUAL_DATABASE){resolve(currentVisualDatabase());return}
      old.addEventListener('load',()=>resolve(currentVisualDatabase()),{once:true});
      old.addEventListener('error',()=>resolve(currentVisualDatabase()),{once:true});
      return;
    }
    const script=document.createElement('script');
    script.dataset.studyrpgContent='visual-database';
    script.src=APP_CONFIG.assetBase+'visual-database.js';
    script.onload=()=>resolve(currentVisualDatabase());
    script.onerror=()=>resolve(currentVisualDatabase());
    document.head.appendChild(script);
  }).finally(()=>{loading=null});
  return loading;
}
