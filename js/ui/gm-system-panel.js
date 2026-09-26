import { getState, getGame, resetV2 as resetStore } from '../core/store.js';
import { changeParentPin, lockParent } from '../gm/parent-access-service.js';
import { resetDailyChallenge } from '../gm/dungeon-admin-service.js';
import { ensureDailyBalanceSnapshot } from '../balance/daily-dungeon-power.js';
import { localDateString } from '../core/date.js';
import { readonlyCloudBridgeStatus, pullReadonlyLegacyCloudNow } from '../cloud/legacy-readonly-bridge.js';
import { awakeningDiagnostic, jobEvaluationReport } from '../character/job-awakening-service.js';
import { JOB_AWAKEN_CONFIG } from '../character/job-rules.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=v=>`${Math.round(Math.max(0,Number(v)||0)*100)}%`;
const STAT_LABEL={str:'力量',agi:'敏捷',int:'智力',will:'意志',virtue:'美德'};
const SKILL_LABEL={power_strike:'奮力一擊',ember:'魔力彈',defense_stance:'防禦姿態',focus:'專注'};
const notify=r=>{if(r?.message)alert(r.message);return!!r?.ok};

function cloudStatusCard(){
  const c=readonlyCloudBridgeStatus(),label={
    synced:'✅ 已同步',connecting:'🔄 讀取中',starting:'🔄 啟動中','waiting-auth':'⏸ 未登入',
    waiting:'⏸ 等待資料',disabled:'○ 未啟用',error:'⚠️ 錯誤',stopped:'⏹ 已停止',idle:'○ 尚未啟動'
  }[c.status]||c.status;
  return`<div class="card"><h3>☁️ 1.0 Firebase 唯讀橋接</h3>
    <div><b>${esc(label)}</b>｜<span class="good">只允許讀取，不具備雲端寫入功能</span></div>
    <div class="small">${esc(c.message||'')}</div>
    ${c.user?`<div class="small">登入：${esc(c.user)}</div>`:''}
    ${c.familyId?`<div class="small">家庭：${esc(c.familyId)}｜Season：${esc(c.seasonId)}</div>`:c.seasonId?`<div class="small">Season：${esc(c.seasonId)}</div>`:''}
    ${c.lastReadAt?`<div class="small">2.0 最後讀取：${esc(new Date(c.lastReadAt).toLocaleString())}</div>`:''}
    <button id="gmPullReadonlyCloud" class="action-button blue" style="margin-top:8px">重新讀取 1.0 Firebase</button>
  </div>`;
}

function awakeningCard(){
  const g=getGame(),h=g.hero||{},d=awakeningDiagnostic(g),report=jobEvaluationReport(g);
  const growth=Object.entries(report.growth).map(([k,v])=>`${STAT_LABEL[k]||k} ${Number(v.value||0)}（${pct(v.share)}）`).join('｜');
  const usage=Object.entries(SKILL_LABEL).map(([id,name])=>`${name} ${Number(report.skillUsage?.[id]||0)}`).join('｜');
  const rows=report.rows.map(row=>{
    const core=row.cores.map((k,i)=>`${STAT_LABEL[k]||k} ${Number(row.coreValues[i]||0)} / ${pct(row.coreShares[i])}`).join('＋');
    const gate=row.kind==='dual'
      ?`雙核心各≥${Math.round(JOB_AWAKEN_CONFIG.dualMinEachShare*100)}%｜平衡 ${pct(row.balance)} / ${Math.round(JOB_AWAKEN_CONFIG.dualBalanceRatio*100)}%`
      :`核心占比需≥${Math.round(JOB_AWAKEN_CONFIG.minCoreGrowthShare*100)}%`;
    return`<div class="list-row">
      <span><b>${row.isCandidate?'⭐ ':''}${esc(row.name)}</b><small>${esc(core)}｜${esc(gate)}${Object.values(report.skillUsage||{}).some(v=>Number(v)>0)?`｜技能偏好 ${pct(row.skillAffinity)}`:''}</small></span>
      <b class="${row.qualified?'good':'warn'}">${row.qualified?'符合條件':'未達門檻'}<br><small>分數 ${row.blendedScore.toFixed(2)}</small></b>
    </div>`;
  }).join('');
  return`<div class="card"><h3>🧭 轉職評估／自然覺醒預測</h3>
    <div class="small">這是正式自然轉職規則的唯讀評估，不會強制改職業。只計入「家長已核定、核定比例大於0、非自主挑戰」的任務成長。</div>
    <div class="simple-list" style="margin-top:8px">
      <div class="list-row"><span>目前職業</span><b>${esc(h.jobAwakened?h.heroClass:'見習勇者')}</b></div>
      <div class="list-row"><span>觀察期</span><b>${d.days}/${JOB_AWAKEN_CONFIG.observationDays} 天</b></div>
      <div class="list-row"><span>已核定任務</span><b>${d.records}/${JOB_AWAKEN_CONFIG.minTaskRecords} 筆</b></div>
      <div class="list-row"><span>目前最可能候選</span><b>${esc(d.candidate?.name||'尚未形成')}</b></div>
      <div class="list-row"><span>候選穩定</span><b>${d.stable}/${JOB_AWAKEN_CONFIG.stableWeeks} 週</b></div>
      <div class="list-row"><span>目前判定</span><b>${esc(d.reason)}</b></div>
      <div class="list-row"><span>${JOB_AWAKEN_CONFIG.safetyDays}天保險候選</span><b>${esc(d.fallback?.name||'尚未形成')}</b></div>
    </div>
    <div class="small" style="margin-top:8px"><b>核定成長：</b>${esc(growth||'尚無')}</div>
    <div class="small"><b>初心技能使用：</b>${esc(usage)}</div>
    <div style="margin-top:8px">${rows}</div>
    <div class="small" style="margin-top:8px">複合職先競爭；技能偏好只影響合格職業之間的最終排序，不會繞過能力成長門檻。28天＋20筆＋同候選連續2週才自然覺醒；42天後若仍卡住，使用最高合格成長職業作保險判定。</div>
    <button id="gmRefreshJobEvaluation" class="action-button purple" style="margin-top:8px">重新計算轉職評估</button>
  </div>`;
}

export function renderSystemPanel(){
  const s=getState(),b=ensureDailyBalanceSnapshot();
  return`<section class="gm-section">${awakeningCard()}${cloudStatusCard()}
    <div class="card"><h3>📈 每日怪物自動平衡</h3><div class="small">A＝完全沒做任務的基準；B＝今日全部排定任務完整完成後的上限。</div><div class="simple-list"><div class="list-row"><span>A 完全沒做</span><b>${Number(b.baseCombatPower||0).toFixed(1)}</b></div><div class="list-row"><span>B 全部完成</span><b>${Number(b.maximumTaskPower||0).toFixed(1)}</b></div><div class="list-row"><span>平衡位置</span><b>${Math.round(Number(b.balancePosition||0)*100)}%</b></div><div class="list-row"><span>今日怪物參考</span><b>${Number(b.referencePower||0).toFixed(1)}</b></div></div></div>
    <div class="card"><h3>🧪 今日副本管理</h3><div class="small">重置只解除「今日已挑戰」鎖；不刪戰鬥紀錄、不回收或補發 EXP／金幣／掉落。</div><button id="gmResetDungeon" class="action-button red">重置 ${localDateString()} 副本挑戰狀態</button></div>
    <div class="card"><h3>💾 本機儲存診斷</h3><button id="gmStorageDiag" class="action-button">檢查 localStorage</button><pre id="gmStorageDiagOut" style="white-space:pre-wrap;word-break:break-word;max-height:300px;overflow:auto"></pre></div>
    <div class="card"><h3>⚙️ 2.0 系統狀態</h3><div class="simple-list"><div class="list-row"><span>資料來源</span><b>${esc(s.source)}</b></div><div class="list-row"><span>目前 schema</span><b>${Number(s.schemaVersion)||2}</b></div><div class="list-row"><span>家長鎖</span><b>離開後台立即重新鎖定</b></div></div></div>
    <div class="card"><h3>🔑 修改家長密碼</h3><input id="gmOldPin" type="password" placeholder="目前密碼"><input id="gmChangePin1" type="password" placeholder="新密碼"><input id="gmChangePin2" type="password" placeholder="再輸入一次"><div class="row"><button id="gmChangePin" class="action-button blue">修改密碼</button><button id="gmLock" class="action-button">立即鎖定後台</button></div></div>
    <div class="card"><h3 class="bad">危險操作</h3><button id="gmReset2" class="action-button red">清除 2.0 存檔並重新從 1.0 乾淨遷移</button><div class="small">只移除 <code>StudyRPG2_STATE</code>；不刪除 1.0 原始存檔或 Firebase。</div></div>
  </section>`;
}
function storageDiagnostic(out){const fmt=n=>n>=1048576?(n/1048576).toFixed(2)+' MB':n>=1024?(n/1024).toFixed(1)+' KB':n+' B',rows=[];let total=0,err='';try{for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i)||'',value=localStorage.getItem(key)||'',bytes=(key.length+value.length)*2;total+=bytes;rows.push({key,bytes})}}catch(e){err=(e?.name||'Error')+': '+String(e?.message||e)}rows.sort((a,b)=>b.bytes-a.bytes);let write='✅ 成功';try{localStorage.setItem('__studyRPG2StorageProbe__','ok');localStorage.removeItem('__studyRPG2StorageProbe__')}catch(e){write='❌ '+(e?.name||'Error')+': '+String(e?.message||e)}out.textContent=['StudyRPG 2.0 本機儲存診斷','------------------------','localStorage 估算總量：'+fmt(total),'測試寫入：'+write,err?'讀取錯誤：'+err:'讀取：✅ 成功','','各項目（由大到小）：',...rows.slice(0,30).map(r=>r.key+'  '+fmt(r.bytes))].join('\n')}
export function bindSystemPanel(root,rerender){
  root.querySelector('#gmRefreshJobEvaluation')?.addEventListener('click',()=>rerender());
  root.querySelector('#gmPullReadonlyCloud')?.addEventListener('click',async()=>{await pullReadonlyLegacyCloudNow();rerender()});
  root.querySelector('#gmResetDungeon')?.addEventListener('click',()=>{if(!confirm('重置今天的副本挑戰狀態？\n不會刪除戰鬥紀錄、角色、EXP、金幣或掉落。'))return;if(notify(resetDailyChallenge()))rerender()});
  root.querySelector('#gmStorageDiag')?.addEventListener('click',()=>storageDiagnostic(root.querySelector('#gmStorageDiagOut')));
  root.querySelector('#gmLock')?.addEventListener('click',()=>{lockParent();rerender()});
  root.querySelector('#gmChangePin')?.addEventListener('click',async()=>notify(await changeParentPin(root.querySelector('#gmOldPin').value,root.querySelector('#gmChangePin1').value,root.querySelector('#gmChangePin2').value)));
  root.querySelector('#gmReset2')?.addEventListener('click',()=>{if(!confirm('確定清除 2.0 存檔並重新從 1.0 遷移？'))return;resetStore();lockParent();rerender()});
}
