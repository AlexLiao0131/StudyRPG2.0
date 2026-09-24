import {dateKey} from "../core/date.js";
import {heroPower,rewardMap,applyTaskReward} from "../progression/ability-engine.js";
import {tasksForDate,occurrence,completeTask,cancelOccurrence} from "../tasks/task-service.js";
import {coursesForDate} from "../schedule/schedule-service.js";
import {upcomingEvents,examEvents} from "../calendar/calendar-service.js";
import {ensureDailySnapshot} from "../balance/daily-dungeon-power.js";
import {examBossPower,examEnergy} from "../balance/exam-boss-power.js";
import {quickBattle} from "../battle/battle-engine.js";
import {uid} from "../core/ids.js";

const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
export function render(state,Store){
 const td=dateKey();document.querySelector("#todayLabel").textContent=td;document.querySelector("#levelChip").textContent=`Lv.${state.hero.level}`;document.querySelector("#powerChip").textContent=`戰力 ${heroPower(state.hero)}`;
 renderStatus(state,td);renderTasks(state,Store,td);renderCalendar(state,td);renderSchedule(state,td);renderDungeon(state,Store,td);renderParent(state,Store,td);
}
function renderStatus(s,td){const h=s.hero,stats=h.stats;
 document.querySelector("#view-status").innerHTML=`<div class="card"><h2>${esc(h.name)}</h2><div class="stats">
 ${[["STR",stats.str],["AGI",stats.agi],["INT",stats.int],["WILL",stats.will],["美德",h.virtue]].map(x=>`<div class="stat"><span>${x[0]}</span><b>${Math.round(x[1]*10)/10}</b></div>`).join("")}
 </div><p class="muted">現實任務完成後，能力直接成長；RPG 角色不是獨立養成。</p></div>`;
}
function renderTasks(s,Store,td){const rows=tasksForDate(s,td);
 document.querySelector("#view-tasks").innerHTML=`<div class="card"><h2>今日待辦</h2>${rows.length?rows.map(t=>{const o=occurrence(s,t.id,td),g=rewardMap(t);return `<div class="task"><div class="task-main"><div class="task-title">${esc(t.name)}</div><div class="muted">${Object.entries(g).map(([k,v])=>`${k}+${v}`).join(" · ")} · ${o.status}</div></div><div class="task-actions">${o.status==="pending"?`<button class="primary" data-complete="${t.id}">完成</button><button data-cancel="${t.id}">取消今日</button>`:""}</div></div>`}).join(""):"<div class=notice>今天沒有待辦</div>"}</div>`;
 document.querySelectorAll("[data-complete]").forEach(b=>b.onclick=()=>Store.update(st=>{const t=st.tasks.find(x=>x.id===b.dataset.complete);if(completeTask(st,t,td,1))applyTaskReward(st.hero,t,1);}));
 document.querySelectorAll("[data-cancel]").forEach(b=>b.onclick=()=>Store.update(st=>cancelOccurrence(st,st.tasks.find(x=>x.id===b.dataset.cancel),td)));
}
function renderCalendar(s,td){const ev=upcomingEvents(s,td);
 document.querySelector("#view-calendar").innerHTML=`<div class=card><h2>行事曆</h2>${ev.map(e=>`<div class=event><b>${esc(e.name)}</b><div class=muted>${e.date} · ${e.type}</div></div>`).join("")||"<div class=notice>沒有未來事件</div>"}</div>`;
}
function renderSchedule(s,td){const rows=coursesForDate(s,td);
 document.querySelector("#view-schedule").innerHTML=`<div class=card><h2>今日課表</h2>${rows.map(r=>{const sub=s.subjects.find(x=>x.id===r.subjectId);return `<div class=task><div><b>${esc(sub?.name||r.subjectId)}</b><div class=muted>${r.minutes} 分鐘</div></div></div>`}).join("")||"<div class=notice>今天沒有課</div>"}</div>`;
}
function renderDungeon(s,Store,td){const friday=new Date(td+"T12:00:00").getDay()===5;const snap=ensureDailySnapshot(s,td,friday),hp=heroPower(s.hero),out=quickBattle(hp,snap.referencePower);const exams=examEvents(s).filter(e=>e.date>=td).slice(0,1);let exam="";
 if(exams[0]){const e=exams[0],p=examBossPower(s,e),energy=examEnergy(s,e);exam=`<div class=card><h3>${esc(e.name)}</h3><div class=battle><div class=fighter><div class=icon>🧑‍🚀</div><div class=power>${hp}</div></div><div class=vs>VS</div><div class=fighter><div class=icon>🐉</div><div class=power>${p}</div></div></div>${Object.entries(energy).map(([id,x])=>{const n=s.subjects.find(q=>q.id===id)?.name||id,pc=x.required?Math.min(100,x.approved/x.required*100):0;return `<div class=muted>${n} ${pc.toFixed(0)}%</div><div class=bar><i style="width:${pc}%"></i></div>`}).join("")}</div>`;}
 document.querySelector("#view-dungeon").innerHTML=`<div class=card><h2>${friday?"週五大怪":"每日副本"}</h2><div class=battle><div class=fighter><div class=icon>🧑‍🚀</div><div class=power>${hp}</div></div><div class=vs>VS</div><div class=fighter><div class=icon>${friday?"👹":"👾"}</div><div class=power>${snap.referencePower}</div></div></div><p class="${out.result==="win"?"good":out.result==="lose"?"bad":""}">${out.text}</p><div class=muted>A=${Math.round(snap.baseCombatPower)} · B=${Math.round(snap.maximumTaskPower)} · 比例 ${(snap.balancePosition*100).toFixed(0)}%</div></div>${exam}`;
}
function renderParent(s,Store,td){document.querySelector("#view-parent").innerHTML=`<div class=card><h2>家長設定</h2><div class=row><div><label>任務名稱</label><input id=newTaskName placeholder="例如：足球"></div><div><label>類型</label><select id=newTaskCategory><option value=study>學習</option><option value=sport>運動</option><option value=music>音樂</option><option value=chore>家事</option><option value=extra_reading>課外閱讀</option></select></div></div><div class=row><div><label>難度</label><select id=newTaskDifficulty><option value=easy>簡單</option><option value=normal selected>普通</option><option value=hard>困難</option><option value=challenge>挑戰</option></select></div><div><label>科目</label><select id=newTaskSubject><option value="">無</option>${s.subjects.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join("")}</select></div></div><button class=primary id=addTask>新增每日任務</button><hr><button id=reset2>重置 2.0 測試資料</button></div>`;
 document.querySelector("#addTask").onclick=()=>{const name=document.querySelector("#newTaskName").value.trim();if(!name)return;Store.update(st=>st.tasks.push({id:uid("task"),name,category:document.querySelector("#newTaskCategory").value,difficulty:document.querySelector("#newTaskDifficulty").value,subjectId:document.querySelector("#newTaskSubject").value||null,taskType:"simple",recurring:true,weekdays:[1,2,3,4,5,6,0],active:true,dailyLimit:1,rewardMode:"auto"}));};
 document.querySelector("#reset2").onclick=()=>{if(confirm("只重置 StudyRPG 2.0 測試資料？"))Store.reset();};
}