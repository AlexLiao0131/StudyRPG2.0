import { getGame } from '../core/store.js';
import { localDateString, localTimeString } from '../core/date.js';
import { combatPower } from '../progression/combat-power.js';
import { semesterWeekIndex, worldForDate } from '../world/world-service.js';
import { statusSceneHTML, applySceneLayout } from '../visual/scene-renderer.js';
import { examEventsForType, examEnergyReport, energyStage, energyStageText } from '../exam/exam-energy.js';
import { visibleCalendar, calendarIcon, calendarStatus } from '../calendar/calendar-service.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function energySection(type){
  const list=examEventsForType(type),evt=list[list.length-1];if(!evt)return'';const report=examEnergyReport(evt),icons={'國語':'📖','英語':'🔤','英文':'🔤','數學':'🔢'};
  const rows=Object.values(report.byCourse).map(r=>{const pct=r.required?Math.max(0,Math.min(100,Math.round(r.approved/r.required*100))):0,cls=pct>=100?'full':pct>=70?'high':pct>=35?'mid':'',missing=Math.max(0,r.required-r.approved),stage=energyStage(r);return `<div class="exam-energy-row"><div class="exam-energy-label"><span>${icons[r.name]||'📚'} ${esc(r.name)}能量</span><span>${r.approved.toFixed(1)} / ${r.required.toFixed(1)}</span></div><div class="exam-energy-track"><div class="exam-energy-fill ${cls}" style="width:${pct}%"></div></div><div class="exam-energy-note">${r.required?`${energyStageText(stage)}｜完成 ${pct}%${pct<100?`｜還差 ${missing.toFixed(1)} 格`:''}`:'尚未設定這科的總需求'}</div></div>`}).join('');
  return `<div class="exam-energy-head"><strong>⚡ ${type==='final'?'期末':'期中'}總需求</strong><span class="pill">截止 ${evt.date}</span></div>${rows}`;
}
function timelineHTML(){
  const all=visibleCalendar(),cols=innerWidth<=600?2:innerWidth<=980?3:4,rows=[];for(let i=0;i<all.length;i+=cols)rows.push(all.slice(i,i+cols));
  const node=e=>{const st=calendarStatus(e);return `<div class="timeline-node ${st}"><div class="icon">${calendarIcon(e.type)}</div><div>${esc(e.name)}</div><div class="date">${e.date.slice(5).replace('-','/')}</div></div>`};
  const snake=rows.map((row,ri)=>{const content=row.map((e,i)=>`${i?'<div class="timeline-line"></div>':''}${node(e)}`).join(''),turn=ri<rows.length-1?`<div class="timeline-turn ${ri%2?'left':''}"></div>`:'';return`<div class="timeline-snake-row ${ri%2?'reverse':''}">${content}</div>${turn}`}).join('');
  return `<div class="card timeline-card"><h3>🗺️ 學期冒險</h3><div class="timeline-snake">${snake||'<div class="small">目前沒有行程。</div>'}</div></div>`;
}
export function renderStatus(root){
  const g=getGame(),h=g.hero,day=localDateString(),world=worldForDate(day),xpPct=Math.min(100,(Number(h.exp)||0)/Math.max(1,Number(h.maxExp)||100)*100),energy=[energySection('midterm'),energySection('final')].filter(Boolean).join('<hr>');
  root.innerHTML=`<div class="status-clock"><div id="statusDate" class="status-date">${day}</div><div id="statusTime" class="status-time">${localTimeString()}</div></div><div class="world-line"><span class="world-chip">第 ${semesterWeekIndex(day)} 週</span><span class="world-chip">${esc(world?.map||'未知地區')}</span>${g.semester?.worldState==='ruined'?'<span class="world-chip">🔥 毀壞世界</span>':''}</div>${statusSceneHTML(day)}<div class="xp-wrap"><div class="xp-label"><span>${esc(h.name||'勇者')}</span><span>Lv.${h.level||1}</span></div><div class="xp-bar"><div class="xp-fill" style="width:${xpPct}%"></div></div></div><div class="kid-summary"><div class="kid-box">💰 ${Number(h.gold)||0}</div><div class="kid-box">🪙 ${Number(h.lotteryCoins)||0}</div><div class="kid-box">⚔️ ${combatPower(h)}</div></div>${energy?`<div class="card exam-energy-card"><h3>🔋 考前總能量</h3>${energy}<div class="small">總需求固定計算到考試最後一天；只有家長核定後才充能，裝備不計入。50%／80%／100%逐段削弱考試 Boss；所有考科滿格再獲得15%最大生命護盾。</div></div>`:''}<button id="abilityButton" class="ability-button">📊 能力</button>${timelineHTML()}`;
  root.querySelector('#statusSceneHud').innerHTML=`<div class="hud-chip">Lv.${h.level||1}</div><div class="hud-chip">⚔️ ${combatPower(h)}</div>`;
  applySceneLayout(root);
  let clock=setInterval(()=>{const el=root.querySelector('#statusTime');if(!el){clearInterval(clock);return}el.textContent=localTimeString()},1000);
  root.querySelector('#abilityButton').addEventListener('click',()=>showAbility(h));
}
function showAbility(h){
  const old=document.getElementById('abilityModal');old?.remove();const m=document.createElement('div');m.id='abilityModal';m.className='modal-overlay';const s=h.stats||{};m.innerHTML=`<div class="modal-box"><h2>📊 ${esc(h.name||'勇者')} 的能力</h2><div class="ability-grid"><div class="ability-stat">💪 力量<br><b>${Number(s.str)||0}</b></div><div class="ability-stat">⚡ 敏捷<br><b>${Number(s.agi)||0}</b></div><div class="ability-stat">🧠 智力<br><b>${Number(s.int)||0}</b></div><div class="ability-stat">🔥 意志<br><b>${Number(s.will)||0}</b></div><div class="ability-stat">✨ 美德<br><b>${Number(h.virtue)||0}</b></div><div class="ability-stat">⚔️ 戰鬥力<br><b>${combatPower(h)}</b></div></div><div class="card"><b>職業</b><div>${esc(h.jobAwakened?h.heroClass:'見習勇者')}</div></div><button class="action-button" id="closeAbility">關閉</button></div>`;document.body.appendChild(m);m.addEventListener('click',e=>{if(e.target===m||e.target.id==='closeAbility')m.remove()});
}
