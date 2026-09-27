import { initStore, getActiveProfile, subscribe } from './store.js';
import { renderStatus } from '../ui/status-view.js';
import { renderTasks } from '../ui/tasks-view.js';
import { renderDungeon } from '../ui/dungeon-view.js';
import { renderShop, renderLottery, renderBag, renderSocial } from '../ui/other-views.js';
import { renderGM } from '../ui/gm-view.js';
import { showProfileModal } from '../ui/profile-modal.js';
import { applySceneLayout } from '../visual/scene-renderer.js';
import { lockParent } from '../gm/parent-access-service.js';
import { startLegacyReadonlyCloudBridge } from '../cloud/legacy-readonly-bridge.js';
import { applyCampaignLifecycle } from '../campaign/campaign-service.js';

initStore();
let currentView='status';
const root=document.getElementById('viewRoot'),nav=document.getElementById('mainNav');
const views={status:()=>renderStatus(root),tasks:()=>renderTasks(root),dungeon:()=>renderDungeon(root,render),shop:()=>renderShop(root),lottery:()=>renderLottery(root),bag:()=>renderBag(root),social:()=>renderSocial(root),gm:()=>renderGM(root,render)};

function updateHeader(){
  const p=getActiveProfile(),h=p.data.hero;
  document.getElementById('activeProfileLabel').textContent=`${h.gender==='female'?'👧':'👦'} ${h.name||'勇者'}｜${h.jobAwakened?h.heroClass:'見習勇者'}`;
}
function renderError(error){
  console.error('[StudyRPG2] view render failed',currentView,error);
  const message=String(error?.message||error||'未知錯誤');
  root.innerHTML='<div class="card bad"><h2>⚠️ 畫面載入失敗</h2><div class="small"></div><button id="retryViewV2" class="action-button">重新載入此頁</button></div>';
  const text=root.querySelector('.small');if(text)text.textContent=`${currentView}：${message}`;
  root.querySelector('#retryViewV2')?.addEventListener('click',render,{once:true});
}
function render(){
  try{
    applyCampaignLifecycle();
    updateHeader();
    nav.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===currentView));
    (views[currentView]||views.status)();
    requestAnimationFrame(()=>applySceneLayout(root));
  }catch(error){
    renderError(error);
  }
}
nav.addEventListener('click',e=>{
  const b=e.target.closest('[data-view]');if(!b)return;
  const next=b.dataset.view;if(currentView==='gm'&&next!=='gm')lockParent();
  currentView=next;render();
});
document.getElementById('profileButton').addEventListener('click',()=>{lockParent();showProfileModal(render)});
subscribe(render);
window.addEventListener('resize',()=>requestAnimationFrame(()=>applySceneLayout(root)));
window.addEventListener('pagehide',lockParent);
render();
startLegacyReadonlyCloudBridge().catch(error=>console.warn('[StudyRPG2] readonly cloud bridge',error));
