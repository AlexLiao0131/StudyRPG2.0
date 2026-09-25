import { APP_CONFIG } from '../data/app-config.js';
import { VISUAL_CONFIG } from './visual-config.js';
import { semesterWeekIndex, worldForDate } from '../world/world-service.js';
import { heroSpritePath } from '../character/hero-service.js';
import { localDateString } from '../core/date.js';

export function visualDevice(){
  const ua=navigator.userAgent||'',platform=navigator.platform||'',touch=navigator.maxTouchPoints||0;
  if(/iPhone|iPod|Windows Phone|Android.*Mobile/i.test(ua))return'mobile';
  if(/iPad/i.test(ua)||(platform==='MacIntel'&&touch>1)||(/Android/i.test(ua)&&!/Mobile/i.test(ua))||/Tablet|PlayBook|Silk/i.test(ua))return'tablet';
  return innerWidth<=VISUAL_CONFIG.deviceRules.mobileMax?'mobile':innerWidth<=VISUAL_CONFIG.deviceRules.tabletMax?'tablet':'desktop';
}
export function assetUrl(path){return `${APP_CONFIG.assetBase}${String(path||'').replace(/^\//,'')}`}
export function groundY(scene,device=visualDevice(),week=semesterWeekIndex()){
  const key=scene==='battle'?'dungeon':scene;
  for(let n=Math.max(1,Number(week)||1);n>=1;n--){const c=VISUAL_CONFIG.groundByWeek[n]?.[device];if(c&&typeof c==='object'&&Number.isFinite(Number(c[key])))return Number(c[key]);if(Number.isFinite(Number(c)))return Number(c)}
  return Number(VISUAL_CONFIG.devices[device]?.[scene]?.groundY)||50;
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
  return `<div class="fighter-scene" data-scene="dungeonEntry" data-side="${side}" data-monster-id="${monsterId||''}">${backgroundHTML('dungeonEntry',dateStr)}<div class="scene-actor ${side==='hero'?'idle':''}" data-actor="${side}"><img src="${assetUrl(sprite)}" alt="${side}"></div></div>`;
}
export function applySceneLayout(root=document){
  const d=visualDevice(),week=semesterWeekIndex(),deviceCfg=VISUAL_CONFIG.devices[d];if(!deviceCfg)return;
  root.querySelectorAll('[data-scene]').forEach(sceneEl=>{
    const scene=sceneEl.dataset.scene, cfg=deviceCfg[scene]; if(!cfg)return;
    const hero=sceneEl.querySelector('[data-actor="hero"]');if(hero&&cfg.hero){const p=anchorPosition(cfg.hero,scene,d,week);hero.style.left=`${p.x}%`;hero.style.top=`${p.y}%`;hero.style.width=`${cfg.heroSize}px`;hero.style.height=`${cfg.heroSize}px`}
    const enemy=sceneEl.querySelector('[data-actor="enemy"]');if(enemy&&cfg.enemy){const p=anchorPosition(cfg.enemy,scene,d,week);enemy.style.left=`${p.x}%`;enemy.style.top=`${p.y}%`;enemy.style.width=`${cfg.enemySize}px`;enemy.style.height=`${cfg.enemySize}px`}
    const bg=sceneEl.querySelector('.scene-background'),b=VISUAL_CONFIG.stage[d]?.bg;if(bg&&b)bg.style.transform=`translate(${Number(b.x??50)-50}%,${Number(b.y??50)-50}%) scale(${Number(b.scale)||1})`;
  });
}
