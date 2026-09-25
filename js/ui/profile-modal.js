import { getFamily, switchProfile, addProfile } from '../core/store.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function showProfileModal(onChange){
  document.getElementById('profileModal')?.remove();
  const f=getFamily(),m=document.createElement('div');
  m.id='profileModal';m.className='modal-overlay';
  m.innerHTML=`<div class="modal-box"><h2>今天是誰要冒險？</h2>
    ${f.profiles.map(p=>`<div class="list-row"><div><b>${p.data?.hero?.gender==='female'?'👧':'👦'} ${esc(p.data?.hero?.name||'尚未建立')}</b><div class="small">Lv.${p.data?.hero?.level||1}｜${p.data?.hero?.jobAwakened?esc(p.data.hero.heroClass):'見習勇者'}</div></div><button class="action-button ${p.id===f.activeProfileId?'primary':'blue'}" data-profile="${esc(p.id)}">${p.id===f.activeProfileId?'使用中':'切換'}</button></div>`).join('')}
    <div class="card" style="margin-top:10px"><h3>＋ 新增孩子角色</h3><input id="newProfileName" placeholder="勇者名稱"><select id="newProfileGender"><option value="male">👦 男生</option><option value="female">👧 女生</option></select><button id="addProfileButton" class="action-button purple" style="width:100%;margin-top:8px">建立新勇者</button></div>
    <button id="closeProfile" class="action-button" style="width:100%;margin-top:10px">關閉</button></div>`;
  document.body.appendChild(m);

  m.querySelectorAll('[data-profile]').forEach(b=>b.addEventListener('click',()=>{switchProfile(b.dataset.profile);m.remove();onChange()}));
  m.querySelector('#addProfileButton').onclick=()=>{
    const r=addProfile({name:m.querySelector('#newProfileName').value,gender:m.querySelector('#newProfileGender').value});
    if(!r.ok){alert(r.message);return}
    m.remove();onChange();showProfileModal(onChange);
  };
  m.querySelector('#closeProfile').onclick=()=>m.remove();
  m.addEventListener('click',e=>{if(e.target===m)m.remove()});
}
