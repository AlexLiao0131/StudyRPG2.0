import { getGame } from '../core/store.js';
import { localDateString } from '../core/date.js';
import { dungeonSnapshot } from '../dungeon/dungeon-service.js';
import { dungeonFighterSceneHTML, applySceneLayout } from '../visual/scene-renderer.js';
import { worldForDate } from '../world/world-service.js';
export function renderDungeon(root){
  const g=getGame(),snap=dungeonSnapshot(),world=worldForDate();if(snap.celebration){root.innerHTML=`<div class="card" style="text-align:center"><div style="font-size:46px">🎊🏰🎊</div><h2>${world?.map||'皇都凱旋遊行'}</h2><div class="small">本週為凱旋週，沒有每日副本戰鬥。</div></div>`;return}
  const e=snap.encounter;root.innerHTML=`<h2>⚔️ 今日副本</h2><div class="card"><div class="world-line"><span class="world-chip">${world.map}</span><span class="world-chip">${localDateString()}</span></div><div class="dungeon-stage"><div class="fighter-card" data-scene="dungeonEntry">${dungeonFighterSceneHTML({side:'hero'})}<div class="fighter-info"><div class="fighter-name">${g.hero.name||'勇者'}</div><div class="power-number good">${snap.heroPower}</div></div></div><div class="vs">VS</div><div class="fighter-card" data-scene="dungeonEntry">${dungeonFighterSceneHTML({side:'enemy',monsterId:e.monsterId})}<div class="fighter-info"><div class="fighter-name">${e.name}</div><div class="power-number bad">AUTO</div></div></div></div><div class="small" style="margin-top:10px">2.0 第一批先保留 1.0 的「週世界 → 今日怪物 → 共用背景」關係；戰力平衡與正式 BattleEngine 下一批接入，不在 Renderer 內硬寫。</div><button class="action-button red" disabled style="width:100%;margin-top:10px">戰鬥引擎尚未接入</button></div>`;applySceneLayout(root);
}
