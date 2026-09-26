import { getGame } from '../core/store.js';
import { localDateString } from '../core/date.js';
import { dungeonSnapshot } from '../dungeon/dungeon-service.js';
import { dungeonFighterSceneHTML, applySceneLayout } from '../visual/scene-renderer.js';
import { BattleEngine } from '../battle/battle-engine.js';
import { openBattle } from '../battle/battle-ui.js';
import { equipmentTotals, ensureEconomyCatalog } from '../economy/economy-service.js';

function examBreakHTML(exam){
  if(!exam?.context)return'';
  const c=exam.context;
  return `<div class="card" style="margin-top:10px"><b>${c.eventType==='final'?'🐉 期末考 Boss':'👿 期中考 Boss'}｜考前能量</b>
    ${(c.results||[]).map(x=>`<div class="small">${x.name}：${Math.round((x.required?x.approved/x.required:0)*100)}% → ${x.stage>0?`削弱 ${x.role==='hp'?'HP':x.role==='magic'?'魔攻／魔防':'物攻／物防'} ${Math.round(x.weaken*100)}%`:'尚未破盾'}</div>`).join('')}
    ${c.allFull?'<div class="small good">🌟 全科滿格：戰鬥開始獲得 15% MaxHP 考前護盾。</div>':''}
    <div class="small">Boss 戰力已鎖定：⚔️ ${c.power}；裝備與當前角色戰力不參與 Boss 推算。</div>
  </div>`;
}
export function renderDungeon(root,rerender=()=>{}){
  const g=getGame(),snap=dungeonSnapshot(),world=snap.world;
  if(snap.celebration){root.innerHTML=`<div class="card" style="text-align:center"><div style="font-size:46px">🎊🏰🎊</div><h2>${world?.map||'皇都凱旋遊行'}</h2><div class="small">本週為凱旋週，沒有每日副本戰鬥。</div></div>`;return}
  const e=snap.encounter;
  if(!e){root.innerHTML='<div class="card">今天沒有可用的副本敵人。</div>';return}
  const ready=snap.heroPower>=snap.enemyPower,challenged=!!snap.challenged,
    resultText=snap.challengeResult==='win'?'🏆 今日已勝利':snap.challengeResult==='lose'?'💀 今日挑戰已結束':'今日已挑戰',
    isExam=['midterm','final'].includes(snap.eventType),
    balanceText=isExam
      ?`考試 Boss 固定戰力：${snap.enemyPower}`
      :`今日平衡：A ${snap.balance.baseCombatPower.toFixed(1)} → B ${snap.balance.maximumTaskPower.toFixed(1)}｜${Math.round(snap.balance.balancePosition*100)}% 位置 → 怪物 ${snap.enemyPower}`;
  root.innerHTML=`<h2>${isExam?(snap.eventType==='final'?'🐉 期末決戰':'👿 期中決戰'):'⚔️ 今日副本'}</h2><div class="card"><div class="world-line"><span class="world-chip">第 ${world.week} 週</span><span class="world-chip">${world.map}</span><span class="world-chip">${localDateString()}</span></div><div class="dungeon-stage"><div class="fighter-card" data-scene="dungeonEntry">${dungeonFighterSceneHTML({side:'hero'})}<div class="fighter-info"><div class="fighter-name">${g.hero.name||'勇者'}</div><div class="power-number good">${snap.heroPower}</div></div></div><div class="vs">VS</div><div class="fighter-card" data-scene="dungeonEntry">${dungeonFighterSceneHTML({side:'enemy',monsterId:e.monsterId})}<div class="fighter-info"><div class="fighter-name">${e.name}</div><div class="power-number bad">${snap.enemyPower}</div></div></div></div><div class="battle-message ${challenged?(snap.challengeResult==='win'?'good':'bad'):(ready?'good':'warn')}">${challenged?resultText:(ready?'⚔️ 可以打！':'💪 再變強一點！')}</div><div class="small">${balanceText}</div>${examBreakHTML(snap.exam)}<button id="startBattleV2" class="action-button red" style="width:100%;margin-top:10px" ${challenged?'disabled':''}>${challenged?'今日已挑戰':isExam?'挑戰考試 Boss！':'挑戰！'}</button></div>`;
  applySceneLayout(root);
  const start=root.querySelector('#startBattleV2');
  if(!challenged)start.onclick=()=>openBattle(new BattleEngine({
    hero:g.hero,monsterId:e.monsterId,enemyPower:snap.enemyPower,eventType:snap.eventType||'daily',
    campaignProgress:g.campaignProgress,phaseScopeKey:g.semester?.startDate||'',
    equipmentStats:equipmentTotals(ensureEconomyCatalog()),examContext:snap.exam?.context||null,week:snap.world?.week||0
  }),rerender);
}
