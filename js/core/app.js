import { initStore, getActiveProfile, subscribe } from './store.js';
import { renderStatus } from '../ui/status-view.js';
import { renderTasks } from '../ui/tasks-view.js';
import { renderDungeon } from '../ui/dungeon-view.js';
import { renderShop, renderLottery, renderBag, renderSocial, renderGM } from '../ui/other-views.js';
import { showProfileModal } from '../ui/profile-modal.js';
import { applySceneLayout } from '../visual/scene-renderer.js';

initStore();
let currentView='status';
const root=document.getElementById('viewRoot'),nav=document.getElementById('mainNav');
const views={status:()=>renderStatus(root),tasks:()=>renderTasks(root,render),dungeon:()=>renderDungeon(root),shop:()=>renderShop(root),lottery:()=>renderLottery(root),bag:()=>renderBag(root),social:()=>renderSocial(root),gm:()=>renderGM(root,render)};
function updateHeader(){const p=getActiveProfile(),h=p.data.hero;document.getElementById('activeProfileLabel').textContent=`${h.gender==='female'?'👧':'👦'} ${h.name||'勇者'}｜${h.jobAwakened?h.heroClass:'見習勇者'}`}
function render(){updateHeader();nav.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===currentView));(views[currentView]||views.status)();requestAnimationFrame(()=>applySceneLayout(root))}
nav.addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(!b)return;currentView=b.dataset.view;render()});
document.getElementById('profileButton').addEventListener('click',()=>showProfileModal(render));
subscribe(render);window.addEventListener('resize',()=>requestAnimationFrame(()=>applySceneLayout(root)));render();
