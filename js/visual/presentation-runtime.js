import { heroClassKey, heroSpritePath } from '../character/hero-service.js';
import { assetUrl, resolveBattlePoint, visualDevice } from './scene-renderer.js';
import { currentVisualDatabase } from './visual-provider.js';

const sleep=ms=>new Promise(r=>setTimeout(r,Math.max(0,Number(ms)||0)));
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
const imageCache=new Map();

const HERO_DEFAULT=Object.freeze({
  idle:{spriteState:'idle',motion:'stay',duration:360},
  melee:{spriteState:'attack',motion:'forward',from:'hero_home',to:'enemy_front',returnTo:'hero_home',duration:560},
  cast:{spriteState:'attack',motion:'stay',duration:520},
  shoot:{spriteState:'attack',motion:'stay',duration:520},
  jump:{spriteState:'attack',motion:'jump',from:'hero_home',via:'hero_air_high',to:'enemy_front',returnTo:'hero_home',duration:700},
  dash:{spriteState:'attack',motion:'dash',from:'hero_home',to:'enemy_front',returnTo:'hero_home',duration:420},
  buff:{spriteState:'idle',motion:'stay',duration:500},
  hurt:{spriteState:'hurt',motion:'stay',duration:420},
  death:{spriteState:'death',motion:'stay',duration:900}
});
const MONSTER_DEFAULT=Object.freeze({
  idle:{spriteState:'idle',motion:'stay',duration:360},
  melee:{spriteState:'battle',motion:'forward',from:'enemy_home',to:'enemy_front',returnTo:'enemy_home',duration:620},
  cast:{spriteState:'battle',motion:'stay',duration:600},
  shoot:{spriteState:'battle',motion:'stay',duration:560},
  jump:{spriteState:'battle',motion:'jump',from:'enemy_home',via:'enemy_air_high',to:'enemy_front',returnTo:'enemy_home',duration:720},
  dash:{spriteState:'battle',motion:'dash',from:'enemy_home',to:'enemy_front',returnTo:'enemy_home',duration:480},
  buff:{spriteState:'idle',motion:'stay',duration:500},
  hurt:{spriteState:'battle',motion:'stay',duration:420},
  death:{spriteState:'idle',motion:'stay',duration:900}
});

function guessAction(action={},enemy=false){
  const explicit=String(action.actorAction||action.actionType||'').toLowerCase();
  if(['melee','cast','shoot','jump','dash','buff'].includes(explicit))return explicit;
  if(explicit==='ranged')return'shoot';
  if(explicit==='self')return'buff';
  const k=String(action.kind||action.type||action.damageType||'').toLowerCase();
  if(k.includes('buff')||k.includes('heal')||k.includes('shield'))return'buff';
  if(k.includes('magic')||['fire','water','ice','lightning','holy','dark','nature','arcane'].includes(k))return'cast';
  if(k.includes('ranged')||k.includes('projectile'))return'shoot';
  return enemy?'melee':'melee';
}

function configuredSkill(bucket,id){
  return !!(bucket&&id&&Object.prototype.hasOwnProperty.call(bucket,id));
}

/*
 * 重要相容規則：
 * 1.0 正式主程式會先 normalizeSkill()；只要 Visual DB 有該技能設定，
 * 就把 skill.presentation.enabled 強制設為 true。
 *
 * 2.0 不再改寫 Skill DB 本體，所以必須在 resolver 這裡等價處理。
 * 不能只看 external.enabled，否則 Tool 已設定 actorAction / FX 的技能
 * （例如 power_strike / wolf_bite）會被錯誤當成未啟用。
 */
export function resolvePresentation(action={},enemy=false){
  const db=currentVisualDatabase();
  const bucket=enemy?db?.monsterSkills:db?.playerSkills;
  const external=bucket?.[action?.id]||{};
  const base=action?.presentation||{};
  const configured=configuredSkill(bucket,action?.id);
  return {
    enabled:!!(configured||base.enabled),
    actorAction:external.actorAction||base.actorAction||guessAction(action,enemy),
    selfFX:clone(external.selfFX??base.selfFX??[]),
    pathFX:clone(external.pathFX??base.pathFX??null),
    targetFX:clone(external.targetFX??base.targetFX??[]),
    summons:clone(external.summons??base.summons??[])
  };
}

function motionDefinition(side,monsterId,name){
  const db=currentVisualDatabase();
  const defaults=side==='hero'?HERO_DEFAULT:MONSTER_DEFAULT;
  const base=defaults[name]||defaults.melee;
  const custom=side==='hero'
    ?db?.heroes?.[heroClassKey()]?.motionActions?.[name]
    :db?.monsters?.[monsterId]?.motionActions?.[name];
  return {...base,...(custom||{})};
}

function setActorSprite(side,actor,monsterId,state){
  const img=actor?.querySelector?.('img');if(!img)return;
  if(side==='hero')img.src=assetUrl(heroSpritePath(state==='battle'?'attack':state||'attack'));
  else if(monsterId)img.src=assetUrl(`images/monsters/${monsterId}_${state==='attack'?'battle':state||'battle'}.png`);
}
function restoreActorSprite(side,actor,monsterId){
  const img=actor?.querySelector?.('img');if(!img)return;
  img.src=side==='hero'?assetUrl(heroSpritePath('idle')):assetUrl(`images/monsters/${monsterId}_idle.png`);
}
function actorFoot(actor,arena){
  const a=arena?.getBoundingClientRect?.(),r=actor?.getBoundingClientRect?.();if(!a||!r)return null;
  return{x:r.left-a.left+r.width/2,y:r.bottom-a.top};
}

async function playActorMotion({arena,side,actor,monsterId,actionName,heroEl,enemyEl}){
  if(!arena||!actor)return false;
  const def=motionDefinition(side,monsterId,actionName);
  const duration=Math.max(120,Number(def.duration)||500);
  setActorSprite(side,actor,monsterId,def.spriteState||'attack');

  if(def.motion==='stay'){
    await sleep(duration);
    restoreActorSprite(side,actor,monsterId);
    return true;
  }

  const ctx={arena,heroEl,enemyEl,enemyMonsterId:monsterId,device:visualDevice()};
  const fallbackStart=actorFoot(actor,arena);
  const logicalFrom=resolveBattlePoint(def.from||(side==='hero'?'hero_home':'enemy_home'),ctx)||fallbackStart;
  const to=resolveBattlePoint(def.to||'enemy_front',ctx);

  const viaName=(def.motion==='jump'&&(!def.via||def.via==='air_high'))
    ?(side==='hero'?'hero_air_high':'enemy_air_high')
    :(def.via||'air_high');
  const via=resolveBattlePoint(viaName,ctx);

  if(!logicalFrom||!to){
    await sleep(duration);
    restoreActorSprite(side,actor,monsterId);
    return true;
  }

  // 與 1.0 正式 Runtime 相同：Tool 的 from 是 motion 座標原點；
  // DOM 本體最後回到原位，不另外改 scene layout。
  const off=p=>p?{x:p.x-logicalFrom.x,y:p.y-logicalFrom.y}:{x:0,y:0};
  const end=off(to),mid=off(via);

  let frames=[{transform:'translate(0,0)'}];
  if(def.motion==='forward'||def.motion==='dash'){
    frames=[
      {transform:'translate(0,0)'},
      {transform:`translate(${end.x}px,${end.y}px)`,offset:.55},
      {transform:'translate(0,0)'}
    ];
  }else if(def.motion==='jump'){
    frames=[
      {transform:'translate(0,0)'},
      {transform:`translate(${mid.x}px,${mid.y}px)`,offset:.35},
      {transform:`translate(${end.x}px,${end.y}px)`,offset:.70},
      {transform:'translate(0,0)'}
    ];
  }

  try{
    await actor.animate(frames,{
      duration,
      easing:def.motion==='jump'?'ease-in-out':'ease'
    }).finished;
  }catch{
    await sleep(duration);
  }
  restoreActorSprite(side,actor,monsterId);
  return true;
}

function loadImage(path){
  if(!path)return Promise.resolve(false);
  const src=assetUrl(path);
  if(imageCache.has(src))return imageCache.get(src);
  if(typeof Image==='undefined')return Promise.resolve(false);
  const p=new Promise(resolve=>{
    const img=new Image();
    img.onload=()=>resolve(true);
    img.onerror=()=>resolve(false);
    img.src=src;
  });
  imageCache.set(src,p);
  return p;
}

function transitionFrames(type,enter=true){
  switch(type){
    case'fade':return enter?[{opacity:0},{opacity:1}]:[{opacity:1},{opacity:0}];
    case'dissolve':return enter?[{opacity:0,clipPath:'inset(50% 50% 50% 50%)',filter:'blur(6px)'},{opacity:1,clipPath:'inset(0 0 0 0)',filter:'blur(0)'}]:[{opacity:1},{opacity:0,clipPath:'inset(45% 45% 45% 45%)',filter:'blur(7px)'}];
    case'scale':return enter?[{opacity:0,transform:'translate(-50%,-50%) scale(.2)'},{opacity:1,transform:'translate(-50%,-50%) scale(1)'}]:[{opacity:1},{opacity:0,transform:'translate(-50%,-50%) scale(.2)'}];
    case'pop':return enter?[{opacity:0,transform:'translate(-50%,-50%) scale(.4)'},{opacity:1,transform:'translate(-50%,-50%) scale(1.18)'},{transform:'translate(-50%,-50%) scale(1)'}]:[{opacity:1},{opacity:0,transform:'translate(-50%,-50%) scale(1.25)'}];
    case'slide':return enter?[{opacity:0,transform:'translate(-80%,-50%)'},{opacity:1,transform:'translate(-50%,-50%)'}]:[{opacity:1},{opacity:0,transform:'translate(-20%,-50%)'}];
    case'flash':return enter?[{opacity:0},{opacity:1,filter:'brightness(3)'},{filter:'brightness(1)'}]:[{opacity:1},{opacity:0,filter:'brightness(3)'}];
    case'rotate':return enter?[{opacity:0,transform:'translate(-50%,-50%) rotate(-180deg) scale(.5)'},{opacity:1,transform:'translate(-50%,-50%) rotate(0) scale(1)'}]:[{opacity:1},{opacity:0,transform:'translate(-50%,-50%) rotate(180deg) scale(.5)'}];
    case'blur':return enter?[{opacity:0,filter:'blur(12px)'},{opacity:1,filter:'blur(0)'}]:[{opacity:1},{opacity:0,filter:'blur(12px)'}];
    default:return null;
  }
}

function elementBox(el,arena){
  const a=arena?.getBoundingClientRect?.(),r=el?.getBoundingClientRect?.();
  return a&&r?{x:r.left-a.left+r.width/2,y:r.top-a.top+r.height/2,w:r.width,h:r.height}:null;
}
function effectBox(side,el,monsterId,arena){
  const box=elementBox(el,arena);if(!box)return null;
  const db=currentVisualDatabase();
  const cfg=side==='hero'
    ?db?.heroes?.[heroClassKey()]?.effectAnchor
    :db?.monsters?.[monsterId]?.effectAnchor;
  if(!cfg)return box;
  const w=box.w*Math.max(.01,Number(cfg.width||100)/100);
  const h=box.h*Math.max(.01,Number(cfg.height||100)/100);
  return{x:box.x,y:box.y+box.h*Number(cfg.y||0)/100,w,h};
}
function fxPoint(fx,defaultSide,ctx){
  const side=fx?.anchor==='target'?(defaultSide==='hero'?'enemy':'hero'):defaultSide;
  const el=side==='hero'?ctx.heroEl:ctx.enemyEl;
  const box=effectBox(side,el,ctx.enemyMonsterId,ctx.arena);
  if(fx?.point){
    const p=resolveBattlePoint(fx.point,ctx);
    if(p)return{...p,w:box?.w||100,h:box?.h||100};
  }
  if(fx?.anchor==='point'){
    const p=resolveBattlePoint(fx.point||'enemy_front',ctx);
    if(p)return{...p,w:100,h:100};
  }
  return box;
}
async function playFx(fx,defaultSide,ctx){
  if(!fx?.image||!(await loadImage(fx.image)))return false;
  if(fx.delay)await sleep(fx.delay);
  const b=fxPoint(fx,defaultSide,ctx);if(!b)return false;

  const img=document.createElement('img');
  img.className='study-vfx-node-v2';
  img.src=assetUrl(fx.image);
  img.alt='';

  Object.assign(img.style,{
    position:'absolute',
    zIndex:'30',
    pointerEvents:'none',
    objectFit:'contain',
    transformOrigin:'center center',
    left:(b.x+b.w*Number(fx.offsetX||0)/100)+'px',
    top:(b.y+b.h*Number(fx.offsetY||0)/100)+'px',
    width:Math.max(12,96*Number(fx.scale||1))+'px',
    height:Math.max(12,96*Number(fx.scale||1))+'px',
    transform:'translate(-50%,-50%)'
  });

  if(fx.mirrorX)img.style.scale='-1 1';
  ctx.arena.appendChild(img);

  const enter=fx.enter||{},ef=transitionFrames(enter.type||'none',true);
  if(ef)await img.animate(ef,{duration:Number(enter.duration||120),fill:'forwards',easing:'ease-out'}).finished.catch(()=>{});

  const exit=fx.exit||{};
  const hold=Math.max(0,Number(fx.duration||350)-Number(enter.duration||0)-Number(exit.duration||0));
  await sleep(hold);

  if(['status','turn','persistent'].includes(fx.lifetime)){
    img.dataset.studyPersistent='1';
    return true;
  }

  const xf=transitionFrames(exit.type||'none',false);
  if(xf)await img.animate(xf,{duration:Number(exit.duration||160),fill:'forwards',easing:'ease-in'}).finished.catch(()=>{});
  img.remove();
  return true;
}
async function playPathFx(path,side,ctx){
  if(!path?.image||!(await loadImage(path.image)))return false;
  if(path.delay)await sleep(path.delay);

  const defaultFrom=elementBox(side==='hero'?ctx.heroEl:ctx.enemyEl,ctx.arena);
  const defaultTo=elementBox(side==='hero'?ctx.enemyEl:ctx.heroEl,ctx.arena);
  const from=path.fromPoint?resolveBattlePoint(path.fromPoint,ctx):defaultFrom;
  const to=path.toPoint?resolveBattlePoint(path.toPoint,ctx):defaultTo;
  const via=path.viaPoint?resolveBattlePoint(path.viaPoint,ctx):null;
  if(!from||!to)return false;

  const img=document.createElement('img');
  img.src=assetUrl(path.image);
  img.alt='';
  Object.assign(img.style,{
    position:'absolute',
    zIndex:'30',
    pointerEvents:'none',
    objectFit:'contain',
    left:from.x+'px',
    top:from.y+'px',
    width:Math.max(12,82*Number(path.scale||1))+'px',
    height:Math.max(12,82*Number(path.scale||1))+'px',
    transform:'translate(-50%,-50%)'
  });
  if(path.mirrorX)img.style.scale='-1 1';
  ctx.arena.appendChild(img);

  const dx=to.x-from.x,dy=to.y-from.y;
  const mx=via?via.x-from.x:dx/2,my=via?via.y-from.y:dy/2-70;
  const frames=path.path==='arc'
    ?[
      {transform:'translate(-50%,-50%)'},
      {transform:`translate(calc(-50% + ${mx}px),calc(-50% + ${my}px))`,offset:.5},
      {transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`}
    ]
    :[
      {transform:'translate(-50%,-50%)'},
      {transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`}
    ];

  await img.animate(frames,{
    duration:Number(path.duration||420),
    easing:path.path==='tracking'?'ease-in-out':'linear'
  }).finished.catch(()=>{});
  img.remove();
  return true;
}

async function playTimeline(presentation,side,ctx){
  const events=[];
  let cursor=0,absolute=false;

  const add=fx=>{
    if(!fx?.image)return;
    const explicit=fx.at!==null&&fx.at!==''&&Number.isFinite(Number(fx.at));
    absolute=absolute||explicit;
    const at=explicit?Math.max(0,Number(fx.at)):cursor+Math.max(0,Number(fx.delay)||0);
    events.push({at,run:()=>playFx({...fx,delay:0},side,ctx)});
    cursor=Math.max(cursor,at+Math.max(0,Number(fx.duration)||350));
  };

  (presentation.selfFX||[]).forEach(add);
  if(presentation.pathFX?.image){
    const p=presentation.pathFX;
    const explicit=p.at!==null&&p.at!==''&&Number.isFinite(Number(p.at));
    absolute=absolute||explicit;
    const at=explicit?Math.max(0,Number(p.at)):cursor+Math.max(0,Number(p.delay)||0);
    events.push({at,run:()=>playPathFx({...p,delay:0},side,ctx)});
    cursor=Math.max(cursor,at+Math.max(0,Number(p.duration)||420));
  }
  (presentation.targetFX||[]).forEach(add);

  if(!events.length)return false;

  if(absolute){
    const started=performance.now();
    let ok=false;
    await Promise.all(events.map(async e=>{
      const wait=Math.max(0,e.at-(performance.now()-started));
      if(wait)await sleep(wait);
      ok=(await e.run())||ok;
    }));
    return ok;
  }

  let ok=false;
  for(const fx of presentation.selfFX||[])ok=(await playFx(fx,side,ctx))||ok;
  if(presentation.pathFX?.image)ok=(await playPathFx(presentation.pathFX,side,ctx))||ok;
  for(const fx of presentation.targetFX||[])ok=(await playFx(fx,side,ctx))||ok;
  return ok;
}

export async function playBattlePresentation({arena,side='hero',actor,target,action={},attackerUnit=null,targetUnit=null}={}){
  const enemy=side==='enemy';
  const p=resolvePresentation(action,enemy);
  if(!p.enabled)return false;

  const heroEl=side==='hero'?actor:target;
  const enemyEl=side==='hero'?target:actor;
  const monsterId=(side==='hero'?targetUnit?.monsterId:attackerUnit?.monsterId)||attackerUnit?.monsterId||targetUnit?.monsterId||'';
  const ctx={arena,heroEl,enemyEl,enemyMonsterId:monsterId,device:visualDevice()};

  await Promise.all([
    playActorMotion({
      arena,
      side,
      actor,
      monsterId:enemy?monsterId:'',
      actionName:p.actorAction||guessAction(action,enemy),
      heroEl,
      enemyEl
    }),
    playTimeline(p,side,ctx)
  ]);
  return true;
}

export function renderBattleStatusFx(arena,state){
  if(!arena)return;
  arena.querySelectorAll('.study-status-vfx-node-v2').forEach(x=>x.remove());
  const db=currentVisualDatabase();
  const rows=[
    ['hero',state?.hero,null],
    ...(state?.enemies||[]).filter(u=>u?.alive!==false&&u?.hp>0).map(u=>['enemy',u,u])
  ];

  for(const[side,unit,enemyUnit]of rows){
    for(const st of unit?.statuses||[]){
      const cfg=db?.statusFX?.[st.type];
      if(!cfg?.enabled||!cfg.image)continue;
      const el=side==='hero'
        ?arena.querySelector('[data-battle-actor="hero"]')
        :arena.querySelector(`[data-enemy-uid="${enemyUnit.uid}"]`);
      const b=elementBox(el,arena);if(!b)continue;
      const img=document.createElement('img');
      img.className='study-status-vfx-node-v2';
      img.src=assetUrl(cfg.image);
      img.alt='';
      const y=cfg.anchor==='head'?b.y-b.h*.32:cfg.anchor==='home'?b.y+b.h*.50:b.y;
      Object.assign(img.style,{
        position:'absolute',
        zIndex:'29',
        pointerEvents:'none',
        objectFit:'contain',
        left:(b.x+b.w*Number(cfg.offsetX||0)/100)+'px',
        top:(y+b.h*Number(cfg.offsetY||0)/100)+'px',
        width:Math.max(12,Math.min(b.w,b.h)*Number(cfg.scale||1))+'px',
        height:Math.max(12,Math.min(b.w,b.h)*Number(cfg.scale||1))+'px',
        transform:'translate(-50%,-50%)'
      });
      if(cfg.mirrorX)img.style.scale='-1 1';
      arena.appendChild(img);
    }
  }
}

export function renderEquipmentCompanions(arena,state){
  if(!arena)return;
  arena.querySelectorAll('.equipment-companion-v2').forEach(x=>x.remove());
  const db=currentVisualDatabase();

  for(const c of state?.equipmentCompanions||[]){
    const v=db?.equipmentAffixes?.[c.affixId];
    if(!v?.enabled||!v.image)continue;
    const img=document.createElement('img');
    img.className='equipment-companion-v2';
    img.src=assetUrl(v.image);
    img.alt=c.name||'';
    Object.assign(img.style,{
      position:'absolute',
      left:'18%',
      top:'65%',
      width:Math.round(120*Math.max(.1,Number(v.scale||1)))+'px',
      height:Math.round(120*Math.max(.1,Number(v.scale||1)))+'px',
      objectFit:'contain',
      transform:`translate(calc(-50% + ${Number(v.offsetX||0)}px),calc(-100% + ${Number(v.offsetY||0)}px))`,
      filter:'drop-shadow(0 4px 4px #0008)',
      pointerEvents:'none',
      zIndex:'7'
    });
    arena.appendChild(img);
  }
}
