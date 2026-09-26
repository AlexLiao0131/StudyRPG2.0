import { getGame } from '../core/store.js';
import { localDateString } from '../core/date.js';
import { dungeonSnapshot } from '../dungeon/dungeon-service.js';
import { activeSemesterStartDate } from '../world/world-service.js';
import { dungeonFighterSceneHTML, applySceneLayout } from '../visual/scene-renderer.js';
import { BattleEngine } from '../battle/battle-engine.js';
import { openBattle } from '../battle/battle-ui.js';
import { equipmentTotals, ensureEconomyCatalog } from '../economy/economy-service.js';
import { equippedCombatAffixes } from '../equipment/equipment-service.js';
import { monsterDef } from '../battle/monster-database.js';
import {
  currentCampaignCycle,currentCampaignMode,isEquipmentEndgameUnlocked,replayBossIds,replayBossPower,
  ensureHolidayTower,towerRunsLeft,nextTowerFloor,towerMonsterForFloor,towerPower,consumeTowerRun
} from '../campaign/endgame-service.js';

function battleEquipment(game){ensureEconomyCatalog();return{equipmentStats:equipmentTotals(game),equipmentAffixes:equippedCombatAffixes(game)}}

function examBreakHTML(exam){
  if(!exam?.context)return'';
  const c=exam.context;
  return `<div class="card" style="margin-top:10px"><b>${c.eventType==='final'?'🐉 期末考 Boss':'👿 期中考 Boss'}｜考前能量</b>
    ${(c.results||[]).map(x=>`<div class="small">${x.name}：${Math.round((x.required?x.approved/x.required:0)*100)}% → ${x.stage>0?`削弱 ${x.role==='hp'?'HP':x.role==='magic'?'魔攻／魔防':'物攻／物防'} ${Math.round(x.weaken*100)}%`:'尚未破盾'}</div>`).join('')}
    ${c.allFull?'<div class="small good">🌟 全科滿格：戰鬥開始獲得 15% MaxHP 考前護盾。</div>':''}
    <div class="small">Boss 戰力已鎖定：⚔️ ${c.power}；裝備與當前角色戰力不參與 Boss 推算。</div>
  </div>`;
}

function renderReplay(root,rerender){
  const g=getGame(),world=dungeonSnapshot().world;if(!isEquipmentEndgameUnlocked(g)){root.innerHTML='<div class="card boss" style="text-align:center"><div style="font-size:44px">🔒🏰</div><h2>王者回憶戰尚未解鎖</h2><div class="small">必須先完成第20週最終戰，才會開放第21週 Boss 回顧與 T0 詞條裝掉落。</div></div>';return}
  const ids=replayBossIds();root.innerHTML=`<h2>🏰 第21週・王者回憶戰</h2><div class="card"><div class="world-line"><span class="world-chip">第 21 週</span><span class="world-chip">${world?.map||'皇都凱旋遊行'}</span></div><div class="small">凱旋週不生成每日小怪。可重刷第一學期 Boss；每次勝利依正式 replay 掉落表取得裝備，不占用每日副本紀錄。</div><label>選擇回憶 Boss</label><select id="replayBossV2">${ids.map(id=>`<option value="${id}">${monsterDef(id).name}｜歷史戰力 ${replayBossPower(id,g)}</option>`).join('')}</select><button id="startReplayV2" class="action-button purple" style="width:100%;margin-top:10px">挑戰回憶 Boss</button></div>`;
  const button=root.querySelector('#startReplayV2');button.onclick=()=>{const id=root.querySelector('#replayBossV2')?.value;if(!id)return;const eq=battleEquipment(g);openBattle(new BattleEngine({hero:g.hero,monsterId:id,enemyPower:replayBossPower(id,g),eventType:'replay',campaignProgress:g.campaignProgress,phaseScopeKey:activeSemesterStartDate(),week:21,...eq}),rerender)};
}

function renderTower(root,rerender){
  const g=getGame(),date=localDateString();if(!isEquipmentEndgameUnlocked(g)){root.innerHTML='<div class="card boss" style="text-align:center"><div style="font-size:42px">🔒🗼</div><h2>無盡之塔尚未解鎖</h2><div class="small">必須先完成第一學期最終戰，才能在寒暑假進入無盡之塔。</div></div>';return}
  ensureHolidayTower(date,g);const floor=nextTowerFloor(date,g),id=towerMonsterForFloor(floor,date),m=monsterDef(id),left=towerRunsLeft(date,g),power=towerPower(floor,date,g);
  root.innerHTML=`<h2>🗼 假期無盡之塔</h2><div class="card" style="text-align:center"><div style="font-size:42px">🗼</div><h3>第 ${floor} 層</h3><div class="small">寒暑假模式｜今日剩餘 ${left} 次｜最高 ${g.holidayTower?.bestFloor||0} 層｜第 ${currentCampaignCycle(date)} 週目</div><div class="card"><strong>${m?.boss?'👑 ':''}${m?.name||'古塔魔物'}</strong><div>預估戰力 ⚔️ ${power}</div><div class="small">每 5 層固定 Boss；勝利走正式 tower 裝備掉落表，橘裝只由獨特裝資料庫產生。</div></div><button id="startTowerV2" class="action-button purple" style="width:100%" ${left<=0?'disabled':''}>${left<=0?'今日次數已用完':'挑戰第 '+floor+' 層'}</button></div>`;
  if(left>0)root.querySelector('#startTowerV2').onclick=()=>{if(!consumeTowerRun(date,g))return rerender();const eq=battleEquipment(g);openBattle(new BattleEngine({hero:g.hero,monsterId:id,enemyPower:power,eventType:'tower',campaignProgress:g.campaignProgress,phaseScopeKey:activeSemesterStartDate(),week:0,towerFloor:floor,...eq}),rerender)};
}

export function renderDungeon(root,rerender=()=>{}){
  const mode=currentCampaignMode();if(mode==='holidayTower'){renderTower(root,rerender);return}
  const g=getGame(),snap=dungeonSnapshot(),world=snap.world;if(snap.celebration){renderReplay(root,rerender);return}
  const e=snap.encounter;
  if(!e){root.innerHTML='<div class="card">今天沒有可用的副本敵人。</div>';return}
  const ready=snap.heroPower>=snap.enemyPower,challenged=!!snap.challenged,
    resultText=snap.challengeResult==='win'?'🏆 今日已勝利':snap.challengeResult==='lose'?'💀 今日挑戰已結束':'今日已挑戰',
    isExam=['midterm','final'].includes(snap.eventType),
    balanceText=isExam
      ?`考試 Boss 固定戰力：${snap.enemyPower}`
      :`今日平衡：A ${snap.balance.baseCombatPower.toFixed(1)} → B ${snap.balance.maximumTaskPower.toFixed(1)}｜${Math.round(snap.balance.balancePosition*100)}% 位置 → 怪物 ${snap.enemyPower}${snap.balance.equipmentCarryBonus?`（含下學期裝備折算 +${snap.balance.equipmentCarryBonus}）`:''}`;
  root.innerHTML=`<h2>${isExam?(snap.eventType==='final'?'🐉 期末決戰':'👿 期中決戰'):'⚔️ 今日副本'}</h2><div class="card"><div class="world-line"><span class="world-chip">第 ${world.week} 週</span><span class="world-chip">${world.map}</span><span class="world-chip">${localDateString()}</span></div><div class="dungeon-stage"><div class="fighter-card" data-scene="dungeonEntry">${dungeonFighterSceneHTML({side:'hero'})}<div class="fighter-info"><div class="fighter-name">${g.hero.name||'勇者'}</div><div class="power-number good">${snap.heroPower}</div></div></div><div class="vs">VS</div><div class="fighter-card" data-scene="dungeonEntry">${dungeonFighterSceneHTML({side:'enemy',monsterId:e.monsterId})}<div class="fighter-info"><div class="fighter-name">${e.name}</div><div class="power-number bad">${snap.enemyPower}</div></div></div></div><div class="battle-message ${challenged?(snap.challengeResult==='win'?'good':'bad'):(ready?'good':'warn')}">${challenged?resultText:(ready?'⚔️ 可以打！':'💪 再變強一點！')}</div><div class="small">${balanceText}</div>${examBreakHTML(snap.exam)}<button id="startBattleV2" class="action-button red" style="width:100%;margin-top:10px" ${challenged?'disabled':''}>${challenged?'今日已挑戰':isExam?'挑戰考試 Boss！':'挑戰！'}</button></div>`;
  applySceneLayout(root);
  const start=root.querySelector('#startBattleV2');
  if(!challenged)start.onclick=()=>{const eq=battleEquipment(g);openBattle(new BattleEngine({
    hero:g.hero,monsterId:e.monsterId,enemyPower:snap.enemyPower,eventType:snap.eventType||'daily',
    campaignProgress:g.campaignProgress,phaseScopeKey:activeSemesterStartDate(),
    examContext:snap.exam?.context||null,week:snap.world?.week||0,...eq
  }),rerender)};
}
