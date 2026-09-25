import { hasParentPin, isParentUnlocked, setParentPin, unlockParent } from '../gm/parent-access-service.js';
import { renderSemesterPanel, bindSemesterPanel } from './gm-semester-panel.js';
import { renderTaskPanel, bindTaskPanel } from './gm-task-panel.js';
import { renderCalendarPanel, bindCalendarPanel } from './gm-calendar-panel.js';
import { renderRewardsPanel, bindRewardsPanel } from './gm-rewards-panel.js';
import { renderSystemPanel, bindSystemPanel } from './gm-system-panel.js';

let activeTab=sessionStorage.getItem('StudyRPG2_GM_TAB')||'semester';
const TABS={semester:'📚 學期與課表',tasks:'📝 任務與核定',calendar:'📅 行事曆',rewards:'🎁 商店與獎勵',system:'⚙️ 角色與系統'};
const notify=r=>{if(r?.message)alert(r.message);return!!r?.ok};
function nav(){return`<div class="gm-tabs">${Object.entries(TABS).map(([id,label])=>`<button class="gm-tab-btn ${activeTab===id?'active':''}" data-gm-tab="${id}">${label}</button>`).join('')}</div>`}
function setup(){return`<div class="parent-lock card"><div class="lock-icon">🔐</div><h2>設定家長密碼</h2><div class="small">每次離開家長後台都會自動重新鎖定。</div><input id="gmNewPin" type="password" inputmode="numeric" placeholder="至少 4 位"><input id="gmNewPin2" type="password" inputmode="numeric" placeholder="再輸入一次"><button id="gmSetPin" class="action-button primary">設定並進入</button></div>`}
function locked(){return`<div class="parent-lock card"><div class="lock-icon">🔐</div><h2>家長專區</h2><div class="small">每次重新進入家長後台都需要驗證。</div><input id="gmPin" type="password" inputmode="numeric" placeholder="••••"><button id="gmUnlock" class="action-button primary">解鎖</button></div>`}
const panels={semester:renderSemesterPanel,tasks:renderTaskPanel,calendar:renderCalendarPanel,rewards:renderRewardsPanel,system:renderSystemPanel};
const binders={semester:bindSemesterPanel,tasks:bindTaskPanel,calendar:bindCalendarPanel,rewards:bindRewardsPanel,system:bindSystemPanel};

export function renderGM(root,appRerender=()=>{}){
  const rerender=()=>renderGM(root,appRerender);
  if(!hasParentPin()){root.innerHTML=setup();root.querySelector('#gmSetPin').onclick=async()=>{const r=await setParentPin(root.querySelector('#gmNewPin').value,root.querySelector('#gmNewPin2').value);if(notify(r))rerender()};return}
  if(!isParentUnlocked()){root.innerHTML=locked();root.querySelector('#gmUnlock').onclick=async()=>{const r=await unlockParent(root.querySelector('#gmPin').value);if(notify(r))rerender()};return}
  if(!TABS[activeTab])activeTab='semester';
  root.innerHTML=`<h2>🛠️ 家長控制後台</h2>${nav()}${panels[activeTab]()}`;
  root.querySelectorAll('[data-gm-tab]').forEach(b=>b.onclick=()=>{activeTab=b.dataset.gmTab;sessionStorage.setItem('StudyRPG2_GM_TAB',activeTab);rerender()});
  binders[activeTab]?.(root,rerender,appRerender);
}
