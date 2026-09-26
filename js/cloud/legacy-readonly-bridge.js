import { APP_CONFIG } from '../data/app-config.js';
import { getState, applyReadonlyLegacyCloudPayload } from '../core/store.js';

let fb=null,auth=null,db=null,user=null,unsubscribe=null,currentRef=null,currentFamilyId='',currentSeasonId='';
let bridgeState={mode:'readonly',status:'idle',message:'尚未啟動',user:'',familyId:'',seasonId:'',lastReadAt:'',lastCloudUpdate:'',source:''};
const listeners=new Set();

function publish(patch){
  bridgeState={...bridgeState,...patch,mode:'readonly'};
  for(const fn of [...listeners])try{fn({...bridgeState})}catch{}
}
export function readonlyCloudBridgeStatus(){return{...bridgeState}}
export function subscribeReadonlyCloudBridge(fn){listeners.add(fn);return()=>listeners.delete(fn)}

function cloudConfig(){
  for(const p of getState()?.family?.profiles||[]){
    const c=p?.data?.settings?.cloud;
    if(c?.enabled&&c.apiKey&&c.authDomain&&c.projectId&&c.appId)return{...c};
  }
  return null;
}
function seasonId(){return String(getState()?.family?.legacySeasonId||APP_CONFIG.legacySeasonId)}
function timestampValue(v){
  if(!v)return'';
  if(typeof v.toDate==='function')return v.toDate().toISOString();
  if(typeof v.toMillis==='function')return new Date(v.toMillis()).toISOString();
  if(typeof v==='string')return v;
  return'';
}
function stopSnapshot(){
  if(typeof unsubscribe==='function')try{unsubscribe()}catch{}
  unsubscribe=null;currentRef=null;
}
async function ensureFirebase(){
  if(fb)return true;
  const c=cloudConfig();
  if(!c){publish({status:'disabled',message:'找不到 1.0 Firebase 設定；目前只使用本機遷移資料'});return false}
  try{
    const [appMod,authMod,fsMod]=await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js')
    ]);
    const app=appMod.getApps().find(x=>x.name==='[DEFAULT]')||appMod.initializeApp({
      apiKey:c.apiKey,authDomain:c.authDomain,projectId:c.projectId,
      storageBucket:c.storageBucket,messagingSenderId:c.messagingSenderId,appId:c.appId
    });
    auth=authMod.getAuth(app);db=fsMod.getFirestore(app);fb={authMod,fsMod};
    return true;
  }catch(error){
    publish({status:'error',message:'Firebase 唯讀初始化失敗：'+String(error?.message||error)});
    return false;
  }
}
function applyDocument(data,source,season){
  if(!data)return false;
  const ok=applyReadonlyLegacyCloudPayload(data,{source,seasonId:season});
  if(ok)publish({
    status:'synced',message:'已讀取 1.0 Firebase 最新資料（唯讀）',
    lastReadAt:new Date().toISOString(),lastCloudUpdate:timestampValue(data.updatedAt)||String(data.updatedAtClient||''),source,seasonId:season
  });
  return ok;
}
async function subscribeDocument(ref,source,season){
  stopSnapshot();currentRef=ref;currentSeasonId=season;
  const {onSnapshot}=fb.fsMod;
  unsubscribe=onSnapshot(ref,snap=>{
    if(!snap.exists()){publish({status:'waiting',message:'Firebase 目標文件尚不存在',source,seasonId:season});return}
    const data=snap.data(),redirect=String(data?.redirectSeasonId||'');
    if(redirect&&redirect!==season&&currentFamilyId){
      subscribeFamily(currentFamilyId,redirect);
      return;
    }
    applyDocument(data,source,season);
  },error=>publish({status:'error',message:'Firebase 唯讀監聽失敗：'+String(error?.message||error),source,seasonId:season}));
}
async function subscribeFamily(familyId,season){
  const {doc}=fb.fsMod;
  currentFamilyId=familyId;
  publish({status:'connecting',message:'正在讀取家庭雲端資料…',familyId,seasonId:season,source:'family'});
  await subscribeDocument(doc(db,'families',familyId,'seasons',season),'family',season);
}
async function subscribeLegacyUser(uid,season){
  const {doc}=fb.fsMod;
  currentFamilyId='';
  publish({status:'connecting',message:'正在讀取舊版個人雲端資料…',familyId:'',seasonId:season,source:'legacy-user'});
  await subscribeDocument(doc(db,'users',uid,'seasons',season),'legacy-user',season);
}
async function connectUser(nextUser){
  stopSnapshot();user=nextUser||null;
  if(!user){publish({status:'waiting-auth',message:'Firebase 設定已找到，但目前沒有可恢復的登入 session',user:'',familyId:'',source:''});return false}
  publish({status:'connecting',message:'已恢復登入，正在尋找 1.0 雲端資料…',user:user.email||user.uid});
  try{
    const {doc,getDoc}=fb.fsMod,season=seasonId();
    const userSnap=await getDoc(doc(db,'users',user.uid));
    const familyId=userSnap.exists()?String(userSnap.data()?.familyId||''):'';
    if(familyId){await subscribeFamily(familyId,season);return true}
    await subscribeLegacyUser(user.uid,season);return true;
  }catch(error){
    publish({status:'error',message:'讀取 1.0 Firebase 索引失敗：'+String(error?.message||error)});
    return false;
  }
}
export async function pullReadonlyLegacyCloudNow(){
  if(!await ensureFirebase())return false;
  if(!user){publish({status:'waiting-auth',message:'沒有已登入的 Firebase 使用者，無法讀取雲端'});return false}
  try{
    const {getDoc}=fb.fsMod;
    if(currentRef){
      const snap=await getDoc(currentRef);
      if(snap.exists())return applyDocument(snap.data(),bridgeState.source||'manual',currentSeasonId||seasonId());
    }
    return connectUser(user);
  }catch(error){
    publish({status:'error',message:'手動讀取失敗：'+String(error?.message||error)});
    return false;
  }
}
export async function startLegacyReadonlyCloudBridge(){
  if(!await ensureFirebase())return false;
  publish({status:'starting',message:'啟動 1.0 Firebase 唯讀橋接…'});
  fb.authMod.onAuthStateChanged(auth,next=>connectUser(next));
  return true;
}
export function stopLegacyReadonlyCloudBridge(){
  stopSnapshot();publish({status:'stopped',message:'唯讀橋接已停止'});
}
