import { APP_CONFIG } from '../data/app-config.js';
import { semesterWeekIndex, worldForDate } from '../world/world-service.js';
import { heroClassKey, heroSpritePath } from '../character/hero-service.js';
import { localDateString } from '../core/date.js';
import { currentVisualDatabase, ensureVisualContent } from './visual-provider.js';

export function visualDevice(){
  const db=currentVisualDatabase(),rules=db?.deviceRules||{},ua=navigator.userAgent||'',platform=navigator.platform||'',touch=navigator.maxTouchPoints||0;
  if(/iPhone|iPod|Windows Phone|Android.*Mobile/i.test(ua))return'mobile';
  if(/iPad/i.test(ua)||(platform==='MacIntel'&&touch>1)||(/Android/i.test(ua)&&!/Mobile/i.test(ua))||/Tablet|PlayBook|Silk/i.test(ua))return'tablet';
  return innerWidth<=Number(rules.mobileMax||600)?'mobile':innerWidth<=Number(rules.tabletMax||1024)?'tablet':'desktop';
}
export function assetUrl(path){return `${APP_CONFIG.assetBase}${String(path||'').replace(/^\//,'')}`}
export function groundY(scene,device=visualDevice(),week=semesterWeekIndex()){
  const db=currentVisualDatabase(),key=scene==='battle'?'dungeon':scene;
  for(let n=Math.max(1,Number(week)||1);n>=1;n--){const c=db?.groundByWeek?.[String(n)]?.[device]??db?.groundByWeek?.[n]?.[device];if(c&&typeof c==='object'&&Number.isFinite(Number(c[key])))return Number(c[key]);if(Number.isFinite(Number(c)))return Number(c)}
  return Number(db?.devices?.[device]?.[scene]?.groundY)||50;
}
export function anchorPosition(anchor,scene,device=visualDevice(),week=semesterWeekIndex()){
  if(!anchor)return{x:50,y:50};return{x:Number(anchor.x)||0,y:groundY(anchor.groundScene||scene,device,week)+Number(anchor.footOffsetY||0)};
}
function backgroundHTML(scene,dateStr){
  const world=worldForDate(dateStr),src=assetUrl(world?.background||'images/backgrounds/week01_grassland.png');
  return `<div class="scene-background" data-scene-bg="${scene}"><div class="scene-background-track"><img src="${src}" alt=""><img src="${src}" alt=""></div></div>`;
}
export function statusSceneHTML(dateStr=localDateString()){
  return `<div class="hero-scene" data-scene="status">${backgroundHTML('status',dateStr)}<div class="scene-hud" id="statusSceneHud"></div><div class="scene-actor idle" data-actor="hero"><img src="${assetUrl(heroSpritePath('idle'))}" alt="勇者"></div></div>`;
}
export function dungeonFighterSceneHTML({side='hero',monsterId='',dateStr=localDateString()}={}){
  const sprite=side==='hero'?heroSpritePath('idle'):`images/monsters/${monsterId}_idle.png`;
  return `<div class="fighter-scene" data-scene="dungeonEntry" data-side="${side}" data-monster-id="${monsterId||''}">${backgroundHTML('dungeonEntry',dateStr)}<div class="scene-actor ${side==='hero'?'idle':''}" data-actor="${side}" data-monster-id="${monsterId||''}"><img src="${assetUrl(sprite)}" alt="${side}"></div></div>`;
}
function monsterVisual(monsterId,scene,device){return currentVisualDatabase()?.monsterVisuals?.[monsterId]?.[device]?.[scene]||null}
function monsterSize(monsterId,scene,device,fallback){
  const db=currentVisualDatabase(),override=monsterVisual(monsterId,scene,device),bucket=scene==='battle'?'battleSize':'idleSize',size=Number(override?.size||db?.monsters?.[monsterId]?.[bucket]?.[device]);return size>0?size:fallback;
}
function monsterAnchor(monsterId,scene,device,base){
  const o=monsterVisual(monsterId,scene,device);if(!o)return base;return{x:Number.isFinite(Number(o.x))?Number(o.x):base.x,y:groundY(scene,device)+Number(o.y||0)};
}
function bodyAnchorOffset(side,part,monsterId,device,week){
  const db=currentVisualDatabase();if(side==='hero')return Number(db?.bodyAnchors?.heroes?.[heroClassKey()]?.[device]?.[part]??db?.bodyAnchors?.heroes?.novice?.[device]?.[part]);
  for(let n=Math.max(1,Number(week)||1);n>=1;n--){const v=db?.bodyAnchors?.monsters?.[device]?.[String(n)]?.[monsterId]?.[part]??db?.bodyAnchors?.monsters?.[device]?.[n]?.[monsterId]?.[part];if(Number.isFinite(Number(v)))return Number(v)}return NaN;
}
function elementBodyPoint(el,arena,offset){const a=arena?.getBoundingClientRect?.(),r=el?.getBoundingClientRect?.();if(!a||!r)return null;return{x:r.left-a.left+r.width/2,y:r.bottom-a.top+(Number.isFinite(offset)?offset:-r.height*.5)}}
function referencePercent(name,device){
  const db=currentVisualDatabase(),aliases={hero_air_high:'air_high',enemy_air_high:'air_high'},key=aliases[name]||name;return db?.referencePoints?.[device]?.[name]||db?.referencePoints?.[device]?.[key]||null;
}
export function resolveBattlePoint(name,{arena,heroEl=null,enemyEl=null,enemyMonsterId='',device=visualDevice(),week=semesterWeekIndex()}={}){
  if(!arena)return null;const m=String(name||''),heroMatch=m.match(/^hero_(head|cast|center)$/),enemyMatch=m.match(/^enemy_(head|cast|center)$/);
  if(heroMatch&&heroEl){const p=elementBodyPoint(heroEl,arena,bodyAnchorOffset('hero',heroMatch[1],'',device,week));if(p)return p}
  if(enemyMatch&&enemyEl){const p=elementBodyPoint(enemyEl,arena,bodyAnchorOffset('enemy',enemyMatch[1],enemyMonsterId,device,week));if(p)return p}
  const ref=referencePercent(m,device);if(ref)return{x:arena.clientWidth*Number(ref.x||0)/100,y:arena.clientHeight*Number(ref.y||0)/100};
  const fallback={hero_home:{x:18,y:68},enemy_home:{x:82,y:68},enemy_front:{x:68,y:66},air_high:{x:48,y:28},hero_air_high:{x:48,y:28},enemy_air_high:{x:48,y:28},hero_center:{x:18,y:52},hero_cast:{x:22,y:53},hero_head:{x:18,y:40},enemy_center:{x:82,y:52},enemy_cast:{x:78,y:53},enemy_head:{x:82,y:40}}[m];
  return fallback?{x:arena.clientWidth*fallback.x/100,y:arena.clientHeight*fallback.y/100}:null;
}
export function applySceneLayout(root=document){
  const d=visualDevice(),week=semesterWeekIndex(),db=currentVisualDatabase(),deviceCfg=db?.devices?.[d];if(!deviceCfg)return;
  root.querySelectorAll('[data-scene]').forEach(sceneEl=>{
    const scene=sceneEl.dataset.scene,cfg=deviceCfg[scene];if(!cfg)return;
    const hero=sceneEl.querySelector('[data-actor="hero"]');if(hero&&cfg.hero){const p=anchorPosition(cfg.hero,scene,d,week);hero.style.left=`${p.x}%`;hero.style.top=`${p.y}%`;hero.style.width=`${cfg.heroSize}px`;hero.style.height=`${cfg.heroSize}px`}
    const enemies=[...sceneEl.querySelectorAll('[data-actor="enemy"]')];if(enemies.length&&cfg.enemy){const base=anchorPosition(cfg.enemy,scene,d,week),slots=Array.isArray(cfg.enemySlotOffsets)?cfg.enemySlotOffsets:[0,-12,9,-22];enemies.forEach((enemy,i)=>{const id=enemy.dataset.monsterId||sceneEl.dataset.monsterId||'',custom=monsterAnchor(id,scene,d,base),slot=Number(slots[i]??(-10*i)),size=monsterSize(id,scene,d,Number(cfg.enemySize)||180);enemy.style.left=`${custom.x+(i?slot:0)}%`;enemy.style.top=`${custom.y}%`;enemy.style.width=`${size}px`;enemy.style.height=`${size}px`;enemy.style.zIndex=String(4+i)})}
    const bg=sceneEl.querySelector('.scene-background'),b=db?.stage?.[d]?.bg;if(bg&&b)bg.style.transform=`translate(${Number(b.x??50)-50}%,${Number(b.y??50)-50}%) scale(${Number(b.scale)||1})`;
  });
}

if(typeof document!=='undefined')ensureVisualContent().then(()=>requestAnimationFrame(()=>applySceneLayout(document))).catch(()=>{});
