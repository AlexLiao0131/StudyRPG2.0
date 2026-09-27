import { APP_CONFIG } from '../data/app-config.js';
import { loadLegacyDatabaseScript } from '../data/legacy-script-loader.js';
import { VISUAL_CONFIG } from './visual-config.js';

let loading=null;

export function currentVisualDatabase(){
  return globalThis.STUDYRPG_VISUAL_DATABASE||VISUAL_CONFIG;
}

async function loadVisualDatabase(){
  if(globalThis.STUDYRPG_VISUAL_DATABASE)return globalThis.STUDYRPG_VISUAL_DATABASE;
  return loadLegacyDatabaseScript({
    url:APP_CONFIG.assetBase+'visual-database.js',
    globalKey:'STUDYRPG_VISUAL_DATABASE',
    label:'Visual DB'
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
