import { APP_CONFIG } from './app-config.js';

let loading=null;

export function currentContentDatabase(){
  return globalThis.STUDYRPG_SKILL_DATABASE||null;
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
