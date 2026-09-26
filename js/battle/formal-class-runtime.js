import { addStatus, effectMod, statusChance } from './battle-math.js';

export const FORMAL_CLASS_NAMES=Object.freeze(['戰士','法師','牧師','獵人','盜賊','聖騎士','魔劍士']);

const IMPLEMENTED_SPECIALS=new Set([
  'war_ragefill','mage_meditation','priest_lightbolt',
  'rogue_ambush','rogue_poison',
  'pal_crusader','pal_shock',
  'sb_arcane_strike','sb_element_bolt','sb_disrupt'
]);

export function isFormalClass(heroSource){
  return !!heroSource?.jobAwakened&&FORMAL_CLASS_NAMES.includes(String(heroSource.heroClass||''));
}

export function formalSkillRuntimeReady(skill){
  if(!skill)return false;
  if(!skill.special)return true;
  return IMPLEMENTED_SPECIALS.has(skill.id);
}

export function classResourceType(cls){
  if(cls==='戰士')return'rage';
  if(['法師','牧師','聖騎士'].includes(cls))return'mp';
  if(['獵人','盜賊'].includes(cls))return'energy';
  if(cls==='魔劍士')return'dual';
  return'energy';
}

export function formalMaxMP(hero,heroSource,cls){
  const virtue=Number(heroSource?.virtue||0),lv=Number(heroSource?.level||1);
  if(cls==='牧師')return Math.round(45+lv*3+Number(hero.will||0)*1.1+virtue*.8+Number(hero.int||0)*.35);
  if(cls==='聖騎士')return Math.round(40+lv*2.5+Number(hero.will||0)*.8+virtue*.55+Number(hero.int||0)*.25);
  return Math.round(50+lv*3+Number(hero.int||0)*1.2+Number(hero.will||0)*.45);
}

export function createFormalRuntime(heroSource,hero){
  if(!isFormalClass(heroSource))return null;
  const cls=heroSource.heroClass,resourceType=classResourceType(cls),maxMp=formalMaxMP(hero,heroSource,cls);
  const runtime={
    cls,resourceType,
    mp:resourceType==='mp'||resourceType==='dual'?maxMp:0,maxMp,
    rage:0,maxRage:100,combo:0,
    seal:cls==='聖騎士',sealCooldown:0,
    enchant:null,overload:false,uses:{},
    weakness:{},hound:null,snipe:null,miracle:false,
    magicAmp:0
  };
  return runtime;
}

export function initFormalResources(state){
  const f=state?.formal;if(!f)return;
  if(f.resourceType==='rage')state.heroEnergy=0;
  else if(f.resourceType==='mp')state.heroEnergy=0;
  else if(f.resourceType==='dual')state.heroEnergy=state.hero.maxEnergy;
  if(f.cls==='聖騎士'){
    addStatus(state.hero,{type:'holy_seal',name:'✨ 聖印',turns:999,effectType:'buff',mods:{},unstealable:true});
  }
}

export function formalResourceView(state){
  const f=state?.formal;
  if(!f)return{label:'⚡ Energy',value:Number(state?.heroEnergy)||0,max:Number(state?.hero?.maxEnergy)||1,secondary:null};
  if(f.resourceType==='rage')return{label:'🔥 Rage',value:f.rage,max:100,secondary:null};
  if(f.resourceType==='mp')return{label:'🔵 MP',value:f.mp,max:f.maxMp,secondary:null};
  if(f.resourceType==='dual')return{label:'⚡ Energy',value:Number(state.heroEnergy)||0,max:Number(state.hero.maxEnergy)||1,secondary:{label:'🔵 MP',value:f.mp,max:f.maxMp}};
  return{label:'⚡ Energy',value:Number(state.heroEnergy)||0,max:Number(state.hero.maxEnergy)||1,secondary:null};
}

function usesMp(f,skill){
  return f.resourceType==='mp'||(f.resourceType==='dual'&&['arcane','fire','ice','lightning','holy','buff','heal','special'].includes(skill?.type));
}
export function formalCostKind(state,skill){
  const f=state?.formal;
  if(!f)return'energy';
  if(f.resourceType==='rage')return'rage';
  if(usesMp(f,skill))return'mp';
  return'energy';
}
export function formalCostIcon(state,skill){
  return formalCostKind(state,skill)==='rage'?'🔥':formalCostKind(state,skill)==='mp'?'🔵':'⚡';
}
export function canPayFormalSkill(state,skill){
  const f=state?.formal,c=Math.max(0,Number(skill?.cost)||0),kind=formalCostKind(state,skill);
  if(kind==='rage')return f.rage>=c;
  if(kind==='mp')return f.mp>=c;
  return Number(state.heroEnergy)>=c;
}
export function payFormalSkill(state,skill){
  const f=state.formal,c=Math.max(0,Number(skill?.cost)||0),kind=formalCostKind(state,skill);
  if(kind==='rage')f.rage=Math.max(0,f.rage-c);
  else if(kind==='mp')f.mp=Math.max(0,f.mp-c);
  else state.heroEnergy=Math.max(0,Number(state.heroEnergy)-c);
  f.uses[skill.id]=(Number(f.uses[skill.id])||0)+1;
}
export function gainFormalResource(state,kind,value){
  const f=state?.formal,n=Math.max(0,Number(value)||0);if(!f)return;
  if(kind==='rage')f.rage=Math.min(100,f.rage+n);
  else if(kind==='mp')f.mp=Math.min(f.maxMp,f.mp+n);
  else if(kind==='energy')state.heroEnergy=Math.min(state.hero.maxEnergy,Number(state.heroEnergy)+n);
}
export function restoreFormalPrimaryResource(state,value){
  const f=state?.formal;
  if(!f){state.heroEnergy=Math.min(state.hero.maxEnergy,Number(state.heroEnergy)+Math.max(0,Number(value)||0));return}
  if(f.resourceType==='rage')gainFormalResource(state,'rage',value);
  else if(f.resourceType==='mp')gainFormalResource(state,'mp',value);
  else gainFormalResource(state,'energy',value);
}

export function heroInitiativeBonus(state){
  return state?.formal?.cls==='盜賊'&&Number(state.round)===1?1000000:0;
}

function formalMods(hero,mods={}){
  const out={};
  for(const[k,v0]of Object.entries(mods||{})){
    const v=Number(v0);
    if(k==='speedPct')out.speed=(out.speed||0)+Number(hero.speed||0)*v;
    else if(k==='defensePct')out.defense=(out.defense||0)+Number(hero.defense||0)*v;
    else if(k==='magicDefensePct')out.magicDefense=(out.magicDefense||0)+Number(hero.magicDefense||0)*v;
    else out[k]=Number.isFinite(v)?v:v0;
  }
  return out;
}

function simpleStatus(engine,target,st,name){
  if(!st)return false;
  const chance=target?.isBoss&&st.bossChance!=null?Number(st.bossChance):Number(st.chance??1);
  if(Math.random()>statusChance(chance,target,st.type))return false;
  const power=st.dotMatk?engine.state.hero.magicAttack*Number(st.dotMatk):st.dotAtk?engine.state.hero.attack*Number(st.dotAtk):Number(st.power)||0;
  addStatus(target,{type:st.type,name:st.name||st.type,turns:Number(st.turns)||2,power,mods:st.mods||{},effectType:'debuff',guaranteedSkip:['stun','freeze'].includes(st.type)});
  engine.log(`${name||'技能'}附加「${st.type}」！`);
  return true;
}

function applyEffect(engine,effect,name){
  const hero=engine.state.hero,mods=formalMods(hero,effect?.mods||{});
  addStatus(hero,{type:name,name,turns:Number(effect?.turns)||1,effectType:effect?.effectType||'buff',mods});
  engine.log(`${name}生效。`);
}

async function hit(engine,target,skill,presenter,{multiplier,type,forceCrit=false,forceHit=false}={}){
  const damageType=type||skill.type||'physical';
  return engine.executeDamage(engine.state.hero,target,{
    type:damageType,damageType,
    source:damageType==='physical'?'attack':'magicAttack',
    multiplier:Number(multiplier??skill.multiplier??1),
    forceCrit,forceHit,
    canDodge:forceHit?false:undefined,
    canParry:forceHit?false:undefined,
    canBlock:forceHit?false:undefined
  },presenter,'hero');
}
async function hitAll(engine,skill,presenter,opts={}){
  let total=0;
  for(const target of engine.livingEnemies()){
    const r=await hit(engine,target,skill,presenter,opts);
    total+=Number(r?.damage)||0;
  }
  return total;
}
function healHero(engine,value,name){
  const mult=1+effectMod(engine.state.hero,'healingPct');
  const amount=Math.max(1,Math.round(Number(value||0)*mult)),before=engine.state.heroHp;
  engine.state.heroHp=Math.min(engine.state.hero.maxHp,engine.state.heroHp+amount);
  const actual=Math.max(0,Math.round(engine.state.heroHp-before));
  engine.log(`💚 ${name}恢復 ${actual} HP。`);
  return actual;
}
function virtueNow(engine){
  return Number(engine.heroSource?.virtue||0)*(1+effectMod(engine.state.hero,'virtuePct'));
}

function resetMageAmplificationOnNonAttack(engine,skill){
  const f=engine.state.formal;
  if(f?.cls!=='法師')return;
  const offensive=['arcane','fire','ice','lightning','holy'].includes(skill?.type)&&Number(skill?.multiplier)>0;
  if(skill?.id==='mage_haste')return;
  if(!offensive)f.magicAmp=0;
}
function updateMageAmplification(engine,skill){
  const f=engine.state.formal;
  if(f?.cls!=='法師')return;
  const offensive=['arcane','fire','ice','lightning'].includes(skill?.type)&&Number(skill?.cost)>0&&Number(skill?.multiplier)>0;
  if(offensive)f.magicAmp=Math.min(5,Number(f.magicAmp||0)+1);
}

export function modifyHeroDamageResult(engine,result,action){
  if(!result?.damage||!engine.state?.formal)return result;
  const f=engine.state.formal;
  if(f.cls==='戰士'){
    const lost=1-engine.state.heroHp/Math.max(1,engine.state.hero.maxHp);
    result.damage=Math.max(1,Math.round(result.damage*(1+Math.floor(lost*10)*.03)));
  }
  if(f.cls==='法師'&&f.magicAmp>0&&['arcane','fire','ice','lightning'].includes(action?.damageType||action?.type)){
    result.damage=Math.max(1,Math.round(result.damage*(1+f.magicAmp*.05)));
  }
  result.damage=Math.max(0,Math.round(result.damage*(1+effectMod(engine.state.hero,'damagePct'))));
  return result;
}

export function mitigateIncomingHeroDamage(engine,result,action){
  if(!result?.damage||!engine.state?.formal)return result;
  const hero=engine.state.hero,f=engine.state.formal,type=action?.damageType||action?.type||'physical';
  if(hero.statuses?.some(s=>s.mods?.immuneDamage)){
    result.damage=0;result.type='block';return result;
  }
  if(type!=='physical'&&hero.statuses?.some(s=>s.mods?.magicImmune)){
    result.damage=0;result.type='block';return result;
  }
  const shield=hero.statuses?.find(s=>Number(s.mods?.manaShield)>0);
  if(shield&&f.maxMp>0&&f.mp>0){
    const wanted=Math.max(0,Math.round(result.damage*Number(shield.mods.manaShield)));
    const paid=Math.min(wanted,Math.floor(f.mp));
    f.mp-=paid;result.damage=Math.max(0,result.damage-paid);
    if(paid)engine.log(`🔷 魔力護盾消耗 ${paid} MP 抵消傷害。`);
  }
  return result;
}

export async function formalTurnStart(engine,presenter){
  const f=engine.state?.formal;if(!f)return;
  if(['獵人','盜賊'].includes(f.cls)||f.resourceType==='dual')gainFormalResource(engine.state,'energy',8);
  const meditation=engine.state.hero.statuses?.find(s=>Number(s.mods?.mpRegenPct)>0);
  if(meditation)gainFormalResource(engine.state,'mp',f.maxMp*Number(meditation.mods.mpRegenPct));
  if(f.cls==='聖騎士'&&!f.seal){
    f.seal=true;
    addStatus(engine.state.hero,{type:'holy_seal',name:'✨ 聖印',turns:999,effectType:'buff',mods:{},unstealable:true});
    engine.log('✨ 聖印重新凝聚！');
  }
}

export async function afterHeroBasicAttack(engine,result,target,presenter){
  const f=engine.state?.formal;if(!f)return;
  if(f.cls==='戰士')gainFormalResource(engine.state,'rage',15+(result?.damage?5:0));
  if(f.cls==='獵人'){
    if(result?.damage){
      gainFormalResource(engine.state,'energy',10);
      let chance=.22;if(target?.statuses?.some(s=>s.type==='bleed'))chance+=.25;
      if(Math.random()<chance){
        f.weakness[target.uid]=true;
        addStatus(target,{type:'hunter_weakness',name:'🎯 弱點',turns:3,effectType:'debuff',mods:{},unstealable:true});
        engine.log('🎯 發現弱點！');
      }
    }
  }
  if(f.cls==='盜賊'){
    gainFormalResource(engine.state,'energy',2);
    if(result?.damage){f.combo=Math.min(3,f.combo+1);engine.log(`🔴 能量球 ${f.combo}/3`);}
  }
  if(f.cls==='魔劍士')gainFormalResource(engine.state,'energy',10);
  if(f.cls==='聖騎士'&&result?.damage){
    if(f.seal){
      f.seal=false;
      engine.state.hero.statuses=engine.state.hero.statuses.filter(s=>s.type!=='holy_seal');
      gainFormalResource(engine.state,'mp',Math.round(Number(result.damage)*.35));
      addStatus(target,{type:'judgement_mark',name:'✨ 審判印記',turns:3,effectType:'debuff',mods:{damageTaken:.15},unstealable:true});
      engine.log(`✨ 聖印轉移到 ${target.name}，形成審判印記。`);
    }else gainFormalResource(engine.state,'mp',Math.round(f.maxMp*.05));
  }
}

export async function afterEnemyDamageToHero(engine,lost,attacker,presenter){
  const f=engine.state?.formal;if(!f||lost<=0)return;
  if(f.cls==='戰士')gainFormalResource(engine.state,'rage',10);
  const returnStatus=engine.state.hero.statuses?.find(s=>Number(s.mods?.mpReturnChance)>0);
  if(returnStatus&&Math.random()<Number(returnStatus.mods.mpReturnChance))gainFormalResource(engine.state,'mp',Math.round(f.maxMp*.08));
  const counter=engine.state.hero.statuses?.find(s=>Number(s.mods?.counter)>0);
  if(counter&&attacker?.alive)await hit(engine,attacker,{type:'physical'},presenter,{multiplier:Number(counter.mods.counter)});
  const counterAoe=engine.state.hero.statuses?.find(s=>Number(s.mods?.counterAoe)>0);
  if(counterAoe)await hitAll(engine,{type:'physical'},presenter,{multiplier:Number(counterAoe.mods.counterAoe)});
  const frost=engine.state.hero.statuses?.find(s=>s.mods?.frostRetaliate);
  if(frost&&attacker?.alive)simpleStatus(engine,attacker,{type:'slow',turns:2,mods:{speed:-Number(attacker.speed||0)*.20}},'冰霜護甲');
}

export function preventHeroDeath(engine){
  if(engine.state.heroHp>0)return false;
  const f=engine.state.formal;
  const lastStand=engine.state.hero.statuses?.find(s=>s.mods?.deathPrevent);
  if(lastStand){engine.state.heroHp=1;lastStand.turns=0;engine.log('🔥 破釜沉舟！勇者以 1 HP 撐住！');return true}
  if(f?.miracle){
    f.miracle=false;engine.state.heroHp=Math.round(engine.state.hero.maxHp*.40);
    engine.state.hero.statuses=engine.state.hero.statuses.filter(s=>s.type!=='miracle');
    engine.log('🌟 奇蹟！勇者重新站了起來！');return true;
  }
  return false;
}

export async function executeFormalSkill(engine,skill,presenter){
  const state=engine.state,f=state.formal,target=engine.target();
  if(!f||!target)return null;
  if(!formalSkillRuntimeReady(skill)){engine.log(`🚧 「${skill.name}」的特殊機制尚未搬入 2.0 Runtime。`);return{unsupported:true}}
  if(!canPayFormalSkill(state,skill)){engine.log(`${formalCostIcon(state,skill)} 職業資源不足！`);return{noResource:true}}
  payFormalSkill(state,skill);
  resetMageAmplificationOnNonAttack(engine,skill);
  engine.log(`${skill.icon||'✨'} ${state.hero.name}使用「${skill.name}」！`);

  if(skill.id==='war_ragefill'){f.rage=100;engine.log('🔥 怒氣提升至 100！');return{ok:true}}
  if(skill.id==='mage_meditation'){
    if(f.uses[skill.id]>2){f.uses[skill.id]--;engine.log('本場魔力冥想已使用2次。');return{ok:false}}
    addStatus(state.hero,{type:'mage_meditation',name:'魔力冥想',turns:3,effectType:'buff',mods:{hit:.15,mpRegenPct:.10}});
    f.magicAmp=0;return{ok:true};
  }
  if(skill.id==='priest_lightbolt'&&typeof confirm==='function'&&confirm('聖光彈：按「確定」治療自己；按「取消」攻擊敵人。')){
    healHero(engine,state.hero.magicAttack*1.25+virtueNow(engine)*1.2,'聖光彈');
    addStatus(state.hero,{type:'grace_shield',name:'🪽 神恩護盾',turns:2,effectType:'buff',mods:{damageTaken:-.10}});
    return{ok:true};
  }
  if(skill.id==='rogue_poison'){
    state.hero.statuses=state.hero.statuses.filter(s=>!s.mods?.poisonCoating);
    addStatus(state.hero,{type:'poison_coating',name:'☠️ 毒藥附魔',turns:4,effectType:'buff',mods:{poisonCoating:true}});
    return{ok:true};
  }
  if(skill.id==='pal_shock'&&typeof confirm==='function'&&confirm('神聖震擊：按「確定」治療自己（耗MP）；按「取消」攻擊敵人（回MP）。')){
    healHero(engine,state.hero.magicAttack*1.3+virtueNow(engine),'神聖震擊');return{ok:true};
  }
  if(skill.id==='sb_disrupt'){
    const buffs=(target.statuses||[]).filter(s=>s.effectType==='buff'&&!s.unstealable);
    if(buffs.length){
      const stolen=buffs[Math.floor(Math.random()*buffs.length)];
      target.statuses=target.statuses.filter(s=>s!==stolen);
      addStatus(state.hero,{...stolen});
      engine.log(`🌀 偷走了 ${stolen.name||stolen.type}！`);
    }
    const before=Math.max(0,Number(target.mp??target.energy??0)),max=Math.max(1,Number(target.maxMp||target.maxEnergy||100));
    const drained=Math.min(before,Math.max(1,Math.round(max*.15)));
    if(Object.prototype.hasOwnProperty.call(target,'mp')||target.maxMp!=null)target.mp=Math.max(0,before-drained);
    else target.energy=Math.max(0,before-drained);
    gainFormalResource(state,'mp',Math.round(f.maxMp*.15));gainFormalResource(state,'energy',Math.round(state.hero.maxEnergy*.15));
    engine.log(`🌀 亂魔抽取 ${drained} 點資源。`);return{ok:true};
  }

  if(skill.effect){applyEffect(engine,skill.effect,skill.name);return{ok:true}}

  if(skill.id==='pal_crusader'){
    const r=await hit(engine,target,skill,presenter,{multiplier:1.05,type:'holy'});
    if(r?.damage)gainFormalResource(state,'mp',Math.round(f.maxMp*.15));
    return r;
  }
  if(skill.id==='pal_shock'){
    const r=await hit(engine,target,skill,presenter,{multiplier:1.2,type:'holy'});
    if(r?.damage)gainFormalResource(state,'mp',Math.round(f.maxMp*.15));
    return r;
  }
  if(skill.id==='sb_arcane_strike'){
    const a=await hit(engine,target,skill,presenter,{multiplier:1,type:'physical'});
    if(a?.damage){await hit(engine,target,skill,presenter,{multiplier:.75,type:'arcane'});gainFormalResource(state,'mp',Math.round(f.maxMp*.12));}
    return a;
  }
  if(skill.id==='sb_element_bolt'){
    const type=['fire','ice','lightning'][Math.floor(Math.random()*3)];
    const r=await hit(engine,target,skill,presenter,{multiplier:1.25,type});f.enchant=type;
    engine.log(`🗡️ 武器獲得${type==='fire'?'🔥火焰':type==='ice'?'❄️冰霜':'⚡雷電'}附魔。`);return r;
  }

  let total=0,last=null;
  if(skill.aoe){
    total=await hitAll(engine,skill,presenter);
  }else{
    const opts={};
    if(skill.id==='rogue_ambush'&&f.uses[skill.id]===1)opts.forceCrit=Math.random()<.50;
    last=await hit(engine,target,skill,presenter,opts);total=Number(last?.damage)||0;
  }
  if(total&&skill.status){
    if(skill.aoe)for(const enemy of engine.livingEnemies())simpleStatus(engine,enemy,skill.status,skill.name);
    else simpleStatus(engine,target,skill.status,skill.name);
  }
  if(total&&skill.healDamage)healHero(engine,total*Number(skill.healDamage),skill.name);
  if(skill.armorBreak&&target)addStatus(target,{type:'armor_break',name:'破甲',turns:2,effectType:'debuff',mods:{defense:-Number(target.defense||0)*.25}});
  if(skill.id==='rogue_ambush'&&last?.crit){f.combo=Math.min(3,f.combo+1);engine.log(`🔴 能量球 ${f.combo}/3`);}
  updateMageAmplification(engine,skill);
  return last||{damage:total};
}
