const inflight=new Map();

function cachedGlobal(key){
  return key?globalThis[key]||null:null;
}

export async function loadLegacyDatabaseScript({url,globalKey,label='Legacy DB'}={}){
  const ready=cachedGlobal(globalKey);
  if(ready)return ready;
  if(!url||!globalKey)throw new Error(`${label} 載入設定不完整`);

  const inflightKey=`${globalKey}|${url}`;
  if(inflight.has(inflightKey))return inflight.get(inflightKey);

  const task=(async()=>{
    if(typeof fetch!=='function')throw new Error(`${label}：瀏覽器不支援 fetch`);
    if(typeof Blob==='undefined'||typeof URL==='undefined'||typeof URL.createObjectURL!=='function'){
      throw new Error(`${label}：瀏覽器不支援本地模組載入`);
    }

    let response;
    try{
      response=await fetch(url,{cache:'no-store',credentials:'omit'});
    }catch(error){
      throw new Error(`${label} 下載失敗：${String(error?.message||error||'網路錯誤')}`);
    }

    if(!response.ok)throw new Error(`${label} 下載失敗：HTTP ${response.status}`);

    const source=await response.text();
    if(!source.trim())throw new Error(`${label} 下載內容為空`);

    const blob=new Blob([source],{type:'text/javascript'});
    const blobUrl=URL.createObjectURL(blob);
    try{
      await import(blobUrl);
    }catch(error){
      throw new Error(`${label} 解析失敗：${String(error?.message||error||'JavaScript 執行錯誤')}`);
    }finally{
      URL.revokeObjectURL(blobUrl);
    }

    const db=cachedGlobal(globalKey);
    if(!db)throw new Error(`${label} 已載入，但 ${globalKey} 不存在`);
    return db;
  })();

  inflight.set(inflightKey,task);
  try{
    return await task;
  }finally{
    inflight.delete(inflightKey);
  }
}
