import { getGame, getFamily } from '../core/store.js';
import { localDateString, localTimeString } from '../core/date.js';
import { combatPower } from '../progression/combat-power.js';
import { semesterWeekIndex, worldForDate } from '../world/world-service.js';
import { statusSceneHTML, applySceneLayout } from '../visual/scene-renderer.js';
import { examEventsForType, examEnergyReport, energyStage, energyStageText } from '../exam/exam-energy.js';
import { formalLoadoutSnapshot, toggleFormalSkill } from '../battle/skill-service.js';
import {
  visibleCalendar, calendarIcon, calendarStatus, calendarStatusText, calendarTimeText,
  calendarEventById, calendarTargetText, isOwnChildCalendarEvent,
  toggleCalendarCompletion, addChildCalendarEvent, editChildCalendarEvent
} from '../calendar/calendar-service.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let statusClockTimer=null;

function energySection(type){
  const list=examEventsForType(type),evt=list[list.length-1];if(!evt)return'';const report=examEnergyReport(evt),icons={'國語':'📖','英語':'🔤','英文':'🔤','數學':'🔢'};
  const rows=Object.values(report.byCourse).map(r=>{const pct=r.required?Math.max(0,Math.min(100,Math.round(r.approved/r.required*100))):0,cls=pct>=100?'full':pct>=70?'high':pct>=35?'mid':'',missing=Math.max(0,r.required-r.approved),stage=energyStage(r);return `<div class="exam-energy-row"><div class="exam-energy-label"><span>${icons[r.name]||'📚'} ${esc(r.name)}能量</span><span>${r.approved.toFixed(1)} / ${r.required.toFixed(1)}</span></div><div class="exam-energy-track"><div class="exam-energy-fill ${cls}" style="width:${pct}%"></div></div><div class="exam-energy-note">${r.required?`${energyStageText(stage)}｜完成 ${pct}%${pct<100?`｜還差 ${missing.toFixed(1)} 格`:''}`:'尚未設定這科的總需求'}</div></div>`}).join('');
  return `<div class="exam-energy-head"><strong>⚡ ${type==='final'?'期末':'期中'}總需求</strong><span class="pill">截止 ${evt.date}</span></div>${rows}`;
}

function timelineHTML(){
  const all=visibleCalendar(),today=localDateString(),cols=window.innerWidth<=600?2:window.innerWidth<=980?3:4,rows=[],overdue=all.filter(e=>calendarStatus(e)==='overdue').length;
  for(let i=0;i<all.length;i+=cols)rows.push(all.slice(i,i+cols));
  const node=e=>{const st=calendarStatus(e),mark=st==='done'?'✓ ':st==='overdue'?'❗ ':'',current=e.date===today?' current':'',stateClass=st==='overdue'?'current':st==='done'?'done':'';return `<div class="timeline-node ${stateClass}${current}" data-calendar-id="${esc(e.id)}" role="button" tabindex="0" aria-label="${esc(e.name)}"><div class="icon">${calendarIcon(e.type)}</div><div>${mark}${esc(e.name)}</div><div class="date">${esc(String(e.date||'').slice(5).replace('-','/'))} ${esc(calendarTimeText(e))}</div></div>`};
  const snake=rows.map((row,ri)=>{const content=row.map((e,i)=>`${i?'<div class="timeline-line"></div>':''}${node(e)}`).join(''),turn=ri<rows.length-1?`<div class="timeline-turn ${ri%2?'left':''}"></div>`:'';return`<div class="timeline-snake-row ${ri%2?'reverse':''}">${content}</div>${turn}`}).join('');
  return `<div class="card timeline-card"><h3>🗺️ 學期冒險 ${overdue?`<span class="pill bad">❗${overdue} 件未完成</span>`:''}</h3><div class="small timeline-help">完整顯示全部事件；路線會依畫面寬度自動折返。點事件可看細節、完成或修改自己的行程。</div><div class="timeline-snake">${snake||'<div class="small">目前沒有行程。孩子也可以新增自己的行程。</div>'}</div><button id="addMyCalendarEvent" class="action-button blue timeline-add">＋ 我的行程</button></div>`;
}

export function renderStatus(root){
  const g=getGame(),h=g.hero,day=localDateString(),world=worldForDate(day),xpPct=Math.min(100,(Number(h.exp)||0)/Math.max(1,Number(h.maxExp)||100)*100),energy=[energySection('midterm'),energySection('final')].filter(Boolean).join('<hr>');
  root.innerHTML=`<div class="status-clock"><div id="statusDate" class="status-date">${day}</div><div id="statusTime" class="status-time">${localTimeString()}</div></div><div class="world-line"><span class="world-chip">第 ${semesterWeekIndex(day)} 週</span><span class="world-chip">${esc(world?.map||'未知地區')}</span>${g.semester?.worldState==='ruined'?'<span class="world-chip">🔥 毀壞世界</span>':''}</div>${statusSceneHTML(day)}<div class="xp-wrap"><div class="xp-label"><span>${esc(h.name||'勇者')}</span><span>Lv.${h.level||1}</span></div><div class="xp-bar"><div class="xp-fill" style="width:${xpPct}%"></div></div></div><div class="kid-summary"><div class="kid-box">💰 ${Number(h.gold)||0}</div><div class="kid-box">🪙 ${Number(h.lotteryCoins)||0}</div><div class="kid-box">⚔️ ${combatPower(h)}</div></div>${energy?`<div class="card exam-energy-card"><h3>🔋 考前總能量</h3>${energy}<div class="small">總需求固定計算到考試最後一天；只有家長核定後才充能，裝備不計入。50%／80%／100%逐段削弱考試 Boss；所有考科滿格再獲得15%最大生命護盾。</div></div>`:''}<button id="abilityButton" class="ability-button">📊 能力${h.jobAwakened?'／技能':''}</button>${timelineHTML()}`;
  root.querySelector('#statusSceneHud').innerHTML=`<div class="hud-chip">Lv.${h.level||1}</div><div class="hud-chip">⚔️ ${combatPower(h)}</div>`;
  applySceneLayout(root);
  if(statusClockTimer)clearInterval(statusClockTimer);
  statusClockTimer=setInterval(()=>{const el=root.querySelector('#statusTime');if(!el){clearInterval(statusClockTimer);statusClockTimer=null;return}el.textContent=localTimeString()},1000);
  root.querySelector('#abilityButton').addEventListener('click',()=>showAbility(h));
  root.querySelector('#addMyCalendarEvent')?.addEventListener('click',kidAddCalendarEvent);
  root.querySelectorAll('[data-calendar-id]').forEach(node=>{const open=()=>showCalendarEvent(node.dataset.calendarId);node.addEventListener('click',open);node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}})});
}

function showAbility(h){
  document.getElementById('abilityModal')?.remove();const m=document.createElement('div');m.id='abilityModal';m.className='modal-overlay';const s=h.stats||{};
  m.innerHTML=`<div class="modal-box"><h2>📊 ${esc(h.name||'勇者')} 的能力</h2><div class="ability-grid"><div class="ability-stat">💪 力量<br><b>${Number(s.str)||0}</b></div><div class="ability-stat">⚡ 敏捷<br><b>${Number(s.agi)||0}</b></div><div class="ability-stat">🧠 智力<br><b>${Number(s.int)||0}</b></div><div class="ability-stat">🔥 意志<br><b>${Number(s.will)||0}</b></div><div class="ability-stat">✨ 美德<br><b>${Number(h.virtue)||0}</b></div><div class="ability-stat">⚔️ 戰鬥力<br><b>${combatPower(h)}</b></div></div><div class="card"><b>職業</b><div>${esc(h.jobAwakened?h.heroClass:'見習勇者')}</div></div>${h.jobAwakened?'<button class="action-button purple" id="openSkillLoadout" style="width:100%">✨ 戰前技能配置（8選4）</button>':''}<button class="action-button" id="closeAbility">關閉</button></div>`;
  document.body.appendChild(m);m.addEventListener('click',e=>{if(e.target===m||e.target.id==='closeAbility')m.remove()});
  m.querySelector('#openSkillLoadout')?.addEventListener('click',()=>{m.remove();showSkillLoadout()});
}
async function showSkillLoadout(){
  const snap=await formalLoadoutSnapshot();if(!snap.className)return;
  document.getElementById('skillLoadoutModal')?.remove();const m=document.createElement('div');m.id='skillLoadoutModal';m.className='modal-overlay';
  const render=async()=>{const now=await formalLoadoutSnapshot(),eq=new Set(now.equipped);m.innerHTML=`<div class="modal-box"><h2>✨ ${esc(now.className)}技能配置</h2><div class="small">選 4 招帶入戰鬥。灰色「特殊機制待搬」不會讓你裝備，避免假功能。</div>${now.skills.map(s=>`<div class="list-row"><span><b>${s.icon||'✨'} ${esc(s.name)}</b><small>${esc(s.description||'')}</small></span><button class="mini-button ${eq.has(s.id)?'purple':'blue'}" data-skill-toggle="${esc(s.id)}" ${s.runtimeReady?'':'disabled'}>${s.runtimeReady?(eq.has(s.id)?'✓ 已裝備':'裝備'):'特殊機制待搬'}</button></div>`).join('')}<div class="small">目前 ${eq.size}/4</div><button id="closeSkillLoadout" class="action-button">關閉</button></div>`;m.querySelectorAll('[data-skill-toggle]').forEach(b=>b.onclick=async()=>{const r=await toggleFormalSkill(b.dataset.skillToggle);if(!r.ok)alert(r.message);await render()});m.querySelector('#closeSkillLoadout').onclick=()=>m.remove()};
  document.body.appendChild(m);m.addEventListener('click',e=>{if(e.target===m)m.remove()});await render();
}

function showCalendarEvent(id){
  const e=calendarEventById(id);if(!e)return;document.getElementById('calendarEventModal')?.remove();
  const profileId=getFamily().activeProfileId,st=calendarStatus(e,profileId),mine=isOwnChildCalendarEvent(e,profileId),m=document.createElement('div');
  m.id='calendarEventModal';m.className='modal-overlay';m.innerHTML=`<div class="modal-box calendar-event-modal"><h2>${calendarIcon(e.type)} ${esc(e.name)}</h2><div class="grid2"><div><small>日期</small><b>${esc(e.date||'未設定')}</b></div><div><small>時間</small><b>${esc(calendarTimeText(e)||'未設定')}</b></div><div><small>對象</small><b>${esc(calendarTargetText(e))}</b></div><div><small>狀態</small><b class="${st==='overdue'?'bad':st==='done'?'good':''}">${esc(calendarStatusText(e,profileId))}</b></div></div>${e.note?`<div class="card"><b>附註</b><div class="calendar-note">${esc(e.note)}</div></div>`:''}<div class="row">${e.requireComplete===false?'':`<button id="calendarToggleDone" class="action-button ${st==='done'?'':'primary'}">${st==='done'?'↩️ 恢復未完成':'✅ 標記完成'}</button>`}${mine?'<button id="calendarEditMine" class="action-button blue">✏️ 修改我的行程</button>':''}<button id="calendarClose" class="action-button">關閉</button></div></div>`;
  document.body.appendChild(m);const close=()=>m.remove();m.addEventListener('click',ev=>{if(ev.target===m)close()});m.querySelector('#calendarClose').onclick=close;m.querySelector('#calendarToggleDone')?.addEventListener('click',()=>{close();const r=toggleCalendarCompletion(id,profileId);if(!r.ok)alert(r.message)});m.querySelector('#calendarEditMine')?.addEventListener('click',()=>{close();kidEditCalendarEvent(id)});
}
function kidAddCalendarEvent(){const name=prompt('行程名稱');if(name===null||!name.trim())return;const date=prompt('日期 YYYY-MM-DD',localDateString());if(date===null)return;const startTime=prompt('開始時間 HH:MM（全天請留空）','');if(startTime===null)return;const endTime=startTime?(prompt('結束時間 HH:MM','')??''):'';const note=prompt('附註（可留空）','');if(note===null)return;const r=addChildCalendarEvent({name,date,startTime,endTime,note});if(!r.ok)alert(r.message)}
function kidEditCalendarEvent(id){const e=calendarEventById(id);if(!e)return;const name=prompt('修改名稱',e.name||'');if(name===null)return;const date=prompt('修改日期 YYYY-MM-DD',e.date||localDateString());if(date===null)return;const startTime=prompt('開始時間 HH:MM（全天留空）',e.startTime||'');if(startTime===null)return;const endTime=startTime?(prompt('結束時間 HH:MM',e.endTime||'')??''):'';const note=prompt('附註',e.note||'');if(note===null)return;const r=editChildCalendarEvent(id,{name,date,startTime,endTime,note});if(!r.ok)alert(r.message)}
