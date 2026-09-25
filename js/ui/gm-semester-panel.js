import { getFamily, getGame } from '../core/store.js';
import { saveSemesterSettings, addExamSubject, removeExamSubject, addTimetableEntry, removeTimetableEntry } from '../gm/semester-admin-service.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const WEEK=['日','一','二','三','四','五','六'];
const notify=r=>{if(r?.message)alert(r.message);return!!r?.ok};
const sel=(a,b)=>String(a)===String(b)?'selected':'';
function subjects(value=''){const f=getFamily();return`<option value="">未指定</option>${(f.examSubjects||[]).map(s=>`<option value="${esc(s.id)}" ${sel(s.id,value)}>${esc(s.name)}</option>`).join('')}`}
export function renderSemesterPanel(){
  const f=getFamily(),g=getGame(),sem=g.semester||{},rows=(f.schoolTimetable||[]).slice().sort((a,b)=>Number(a.weekday)-Number(b.weekday)||String(a.subjectId).localeCompare(String(b.subjectId)));
  return`<section class="gm-section"><div class="card"><h3>📚 學期基本設定</h3><div class="grid2"><label>學期開始<input id="gmSemStart" type="date" value="${esc(sem.startDate||'')}"></label><label>學期結束<input id="gmSemEnd" type="date" value="${esc(sem.endDate||'')}"></label></div><div class="small">上課日</div><div class="check-row">${[1,2,3,4,5,6,0].map(d=>`<label class="check-chip"><input type="checkbox" data-school-day value="${d}" ${(sem.schoolWeekdays||[1,2,3,4,5]).includes(d)?'checked':''}>${WEEK[d]}</label>`).join('')}</div><button id="gmSaveSemester" class="action-button primary">儲存學期設定</button></div><div class="card"><h3>📖 考試科目</h3><div class="simple-list">${(f.examSubjects||[]).map(s=>`<div class="list-row"><span>${esc(s.name)} <small>${esc(s.id)}</small></span><button class="mini-button red" data-remove-subject="${esc(s.id)}">刪除</button></div>`).join('')}</div><div class="row"><input id="gmNewSubject" placeholder="新增科目，例如 自然"><button id="gmAddSubject" class="action-button blue">＋ 科目</button></div></div><div class="card"><h3>🗓️ 每週課表</h3><div class="simple-list">${rows.map(x=>{const sub=(f.examSubjects||[]).find(s=>s.id===x.subjectId);return`<div class="list-row"><span>星期${WEEK[Number(x.weekday)]}｜${esc(sub?.name||x.subjectId)}｜${Number(x.minutes)||40} 分鐘</span><button class="mini-button red" data-remove-timetable="${esc(x.id)}">刪除</button></div>`}).join('')||'<div class="small">目前沒有課表。</div>'}</div><div class="gm-inline-form"><select id="gmTTDay">${[1,2,3,4,5,6,0].map(d=>`<option value="${d}">星期${WEEK[d]}</option>`).join('')}</select><select id="gmTTSubject">${subjects()}</select><input id="gmTTMinutes" type="number" min="1" value="40"><button id="gmAddTT" class="action-button blue">加入課表</button></div></div></section>`;
}
export function bindSemesterPanel(root,rerender){
  root.querySelector('#gmSaveSemester')?.addEventListener('click',()=>notify(saveSemesterSettings({startDate:root.querySelector('#gmSemStart').value,endDate:root.querySelector('#gmSemEnd').value,schoolWeekdays:[...root.querySelectorAll('[data-school-day]:checked')].map(x=>Number(x.value))})));
  root.querySelector('#gmAddSubject')?.addEventListener('click',()=>{if(notify(addExamSubject(root.querySelector('#gmNewSubject').value)))rerender()});
  root.querySelectorAll('[data-remove-subject]').forEach(b=>b.onclick=()=>{if(confirm('刪除這個科目？')&&notify(removeExamSubject(b.dataset.removeSubject)))rerender()});
  root.querySelector('#gmAddTT')?.addEventListener('click',()=>{if(notify(addTimetableEntry({weekday:root.querySelector('#gmTTDay').value,subjectId:root.querySelector('#gmTTSubject').value,minutes:root.querySelector('#gmTTMinutes').value})))rerender()});
  root.querySelectorAll('[data-remove-timetable]').forEach(b=>b.onclick=()=>{if(notify(removeTimetableEntry(b.dataset.removeTimetable)))rerender()});
}
