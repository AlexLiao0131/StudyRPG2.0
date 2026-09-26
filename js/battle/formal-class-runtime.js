import { addStatus, effectMod, statusChance, resolveAttack } from './battle-math.js';

export const FORMAL_CLASS_NAMES=Object.freeze(['戰士','法師','牧師','獵人','盜賊','聖騎士','魔劍士']);

const IMPLEMENTED_SPECIALS=new Set([
  'war_ragefill','war_execute',
  'mage_meditation','mage_icefire',
  'priest_lightbolt','priest_holy_prayer','priest_cleanse','priest_miracle',
  'hunter_hound','hunter_deadly','hunter_snipe',
  'rogue_ambush','rogue_poison','rogue_rupture','rogue_steal','rogue_frenzy',
  'pal_crusader','pal_shock','pal_blade','pal_freedom','pal_consecrate','pal_verdict',
  'sb_arcane_strike','sb_element_bolt','sb_disrupt','sb_accel','sb_frost_armor','sb_firestorm','sb_element_burst'
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

export function formalMaxMP(_hero,heroSource,cls){
  const st=heroSource?.stats||{};
  const intel=Number(st.int)||0,will=Number(st.will)||0,virtue=Number(heroSource?.virtue)||0,lv=Number(heroSource?.level)||1;
  if(cls==='法師')return Math.max(1,Math.round(110+lv*4+intel*2.5+will*.8));
  if(cls==='牧師')return Math.max(1,Math.round(115+lv*4+will*2.2+virtue*1.2+intel*.6));
  if(cls==='聖騎士')return Math.max(1,Math.round(40+lv*2.5+will*.8+virtue*.55+intel*.25));
  return Math.max(1,Math.round(50+lv*3+intel*1.2+will*.45));
}

export function createFormalRuntime(heroSource,hero){
  if(!isFormalClass(heroSource))return null;
  const cls=heroSource.heroClass,resourceType=classResourceType(cls),maxMp=formalMaxMP(hero,heroSource,cls);
  return{
    cls,resourceType,mp:['mp','dual'].includes(resourceType)?maxMp:0,maxMp,
    rage:0,maxRage:100,combo:0,seal:cls==='聖騎士',sealCooldown:0,
    enchant:null,overload:false,uses:{},weakness:{},hound:null,snipe:null,miracle:false,
    magicAmp:0,hunterFocusCheckedRound:0,consecrateTicks:0
  };
}

export function initFormalResources(state){
  const f=state?.formal;if(!f)return;
  if(f.resourceType==='rage'||f.resourceType==='mp')state.heroEnergy=0;
  else if(f.resourceType==='dual')state.heroEnergy=state.hero.maxEnergy;
  if(f.cls==='聖騎士')addStatus(state.hero,{type:'holy_seal',name:'✨ 聖印',turns:999,effectType:'buff',mods:{},unstealable:true});
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
  const f=state?.formal;if(!f)return'energy';
  if(f.resourceType==='rage')return'rage';
  return usesMp(f,skill)?'mp':'energy';
}
export function formalCostIcon(state,skill){const k=formalCostKind(state,skill);return k==='rage'?'🔥':k==='mp'?'🔵':'⚡'}
export function canPayFormalSkill(state,skill){
  const f=state?.formal,c=Math.max(0,Number(skill?.cost)||0),k=formalCostKind(state,skill);
  return k==='rage'?f.rage>=c:k==='mp'?f.mp>=c:Number(state.heroEnergy)>=c;
}
export function payFormalSkill(state,skill){
  const f=state.formal,c=Math.max(0,Number(skill?.cost)||0),k=formalCostKind(state,skill);
  if(k==='rage')f.rage=Math.max(0,f.rage-c);else if(k==='mp')f.mp=Math.max(0,f.mp-c);else state.heroEnergy=Math.max(0,Number(state.heroEnergy)-c);
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
  gainFormalResource(state,f.resourceType==='rage'?'rage':f.resourceType==='mp'?'mp':'energy',value);
}

export function formalSkillPreflight(state,skill){
  const f=state?.formal;if(!f)return{ok:true};
  if(!formalSkillRuntimeReady(skill))return{ok:false,message:`「${skill.name}」尚未完成 Runtime。`};
  if(!canPayFormalSkill(state,skill))return{ok:false,message:`${formalCostIcon(state,skill)} 職業資源不足！`};
  if(skill.id==='war_ragefill'&&Number(f.uses.war_ragefill||0)>=1)return{ok:false,message:'🔥 怒氣強化每場只能使用一次。'};
  if(skill.id==='mage_meditation'&&Number(f.uses.mage_meditation||0)>=2)return{ok:false,message:'🌀 魔力冥想每場最多使用2次。'};
  if(skill.id==='priest_miracle'&&(f.miracle||Number(f.uses.priest_miracle||0)>=1))return{ok:false,message:'🌟 奇蹟每場只能準備一次。'};
  if(skill.id==='hunter_hound'&&Number(f.uses.hunter_hound||0)>=1)return{ok:false,message:'🐕 召喚獵犬每場只能使用一次。'};
  if(skill.id==='hunter_snipe'&&f.snipe?.armed)return{ok:false,message:'🔭 已在瞄準中。'};
  if(skill.id==='rogue_rupture'&&f.combo<1)return{ok:false,message:'🔴 撕裂至少需要1顆能量球。'};
  if(skill.id==='rogue_frenzy'&&f.combo<3)return{ok:false,message:'🔴🔴🔴 暗影狂殺需要3顆能量球。'};
  return{ok:true};
}

export function heroInitiativeBonus(state){return state?.formal?.cls==='盜賊'&&Number(state.round)===1?1000000:0}
export function formalInitiativeEntries(state){
  const h=state?.formal?.hound;
  if(!h||h.alive===false||h.hp<=0||Number(state.round)<=Number(h.summonRound||0))return[];
  return[{side:'ally',unit:h,order:-1,initiativeScore:Number(h.speed)||0}];
}

function formalMods(unit,mods={}){
  const out={};
  for(const[k,v0]of Object.entries(mods||{})){
    const v=Number(v0);
    if(k==='speedPct')out.speed=(out.speed||0)+Number(unit.speed||0)*v;
    else if(k==='defensePct')out.defense=(out.defense||0)+Number(unit.defense||0)*v;
    else if(k==='magicDefensePct')out.magicDefense=(out.magicDefense||0)+Number(unit.magicDefense||0)*v;
    else out[k]=Number.isFinite(v)?v:v0;
  }
  return out;
}
function statusModsForTarget(target,mods={}){return formalMods(target,mods)}

function simpleStatus(engine,target,st,name){
  if(!st||!target||target.hp<=0)return false;
  const chance=target?.isBoss&&st.bossChance!=null?Number(st.bossChance):Number(st.chance??1);
  if(Math.random()>statusChance(chance,target,st.type))return false;
  const power=st.dotMatk?engine.state.hero.magicAttack*Number(st.dotMatk):st.dotAtk?engine.state.hero.attack*Number(st.dotAtk):Number(st.power)||0;
  addStatus(target,{type:st.type,name:st.name||st.type,turns:Number(st.turns)||2,power,mods:statusModsForTarget(target,st.mods||{}),effectType:'debuff',guaranteedSkip:['stun','freeze'].includes(st.type)});
  engine.log(`${name||'技能'}附加「${st.type}」！`);return true;
}
function applyEffect(engine,effect,name){
  const hero=engine.state.hero;
  addStatus(hero,{type:name,name,turns:Number(effect?.turns)||1,effectType:effect?.effectType||'buff',mods:formalMods(hero,effect?.mods||{})});
  engine.log(`${name}生效。`);
}
function hasJudgmentMark(target){return !!target?.statuses?.some(s=>s.type==='judgment_mark'&&s.turns>0)}
function applyJudgmentMark(engine,target){
  if(!target||target.hp<=0)return;
  const old=(target.statuses||[]).find(s=>s.type==='judgment_mark');
  if(old){old.turns=3;old.name='⚖️ 審判印記';old.effectType='debuff';old.mods={...(old.mods||{}),holyTakenPct:.15};engine.log(`⚖️ ${target.name}的審判印記刷新為3回合。`)}
  else{addStatus(target,{type:'judgment_mark',name:'⚖️ 審判印記',turns:3,effectType:'debuff',mods:{holyTakenPct:.15}});engine.log(`⚖️ ${target.name}獲得審判印記（3回合）。`)}
}
function removeJudgmentMark(target){
  const had=hasJudgmentMark(target);if(had)target.statuses=(target.statuses||[]).filter(s=>s.type!=='judgment_mark');return had;
}
function consumeSeal(engine){
  const f=engine.state.formal;if(!f?.seal)return false;
  f.seal=false;engine.state.hero.statuses=(engine.state.hero.statuses||[]).filter(s=>s.type!=='holy_seal');return true;
}
function setEnchant(engine,type){
  engine.state.formal.enchant=type;
  engine.log(`🗡️ 武器獲得${type==='fire'?'🔥火焰':type==='ice'?'❄️冰霜':type==='lightning'?'⚡雷電':'✨神聖'}附魔。`);
}
function healingMultiplier(engine){return Math.max(.1,1+effectMod(engine.state.hero,'healingPct')+effectMod(engine.state.hero,'healingReceived'))}
function createGraceShield(engine){
  if(engine.state.formal?.cls!=='牧師')return;
  const hero=engine.state.hero,amount=Math.max(1,Math.round(hero.maxHp*.18+virtueNow(engine)*.6));
  hero.statuses=(hero.statuses||[]).filter(s=>s.type!=='grace_shield');
  hero.statuses.push({type:'grace_shield',name:`🪽 神恩護盾 ${amount}`,turns:3,effectType:'buff',mods:{},shieldHp:amount,unstealable:true});
  engine.log(`🪽 神恩護盾形成，可吸收 ${amount} 傷害。`);
}
function healHero(engine,value,name,{activePriestHeal=false}={}){
  const amount=Math.max(1,Math.round(Number(value||0)*healingMultiplier(engine))),before=engine.state.heroHp;
  engine.state.heroHp=Math.min(engine.state.hero.maxHp,engine.state.heroHp+amount);
  const actual=Math.max(0,Math.round(engine.state.heroHp-before));engine.log(`💚 ${name}恢復 ${actual} HP。`);
  if(activePriestHeal)createGraceShield(engine);
  return actual;
}
function virtueNow(engine){return Number(engine.heroSource?.virtue||0)*(1+effectMod(engine.state.hero,'virtuePct'))}

async function poisonCoatingProc(engine,target){
  if(engine.state.formal?.cls!=='盜賊'||!target?.alive)return;
  const active=(engine.state.hero.statuses||[]).some(s=>s.turns>0&&s.mods?.poisonCoating);if(!active)return;
  const atk=Math.max(1,Number(engine.state.hero.attack)||1),direct=Math.max(1,Math.round(atk*.20));
  const dealt=engine.applyDamageToEnemy(target,direct);
  if(dealt>0)engine.log(`☠️ 毒藥附魔：${target.name}受到 ${dealt} 點追加毒傷。`);
  if(target.hp>0)addStatus(target,{type:'poison',name:'☠️ 中毒',turns:3,power:Math.max(1,Math.round(atk*.22)),effectType:'debuff',mods:{}});
}
function maybeHunterFocusProc(engine,action,result){
  const f=engine.state.formal;if(f?.cls!=='獵人'||!result?.damage||['反擊','獵犬撕咬'].includes(action?.name))return;
  const chance=effectMod(engine.state.hero,'energyProc');if(chance<=0||f.hunterFocusCheckedRound===engine.state.round)return;
  f.hunterFocusCheckedRound=engine.state.round;
  if(Math.random()<chance){gainFormalResource(engine.state,'energy',10);engine.log('🎯 凝神專注：額外恢復10能量！')}
}
async function hit(engine,target,skill,presenter,{multiplier,type,source,forceCrit=false,forceHit=false,skipAfterHit=false}={}){
  if(!target||target.hp<=0)return{damage:0};
  const damageType=type||skill.type||'physical',src=source||(damageType==='physical'?'attack':'magicAttack');
  let mult=Number(multiplier??skill.multiplier??1);
  if(damageType==='holy'&&hasJudgmentMark(target))mult*=1.15;
  const r=await engine.executeDamage(engine.state.hero,target,{type:damageType,damageType,source:src,multiplier:mult,forceCrit,forceHit,canDodge:forceHit?false:undefined,canParry:forceHit?false:undefined,canBlock:forceHit?false:undefined},presenter,'hero');
  if(r?.damage&&!skipAfterHit){await poisonCoatingProc(engine,target);maybeHunterFocusProc(engine,skill,r)}
  return r;
}
async function hitAll(engine,skill,presenter,opts={}){
  let total=0;for(const target of [...engine.livingEnemies()]){const r=await hit(engine,target,skill,presenter,opts);total+=Number(r?.damage)||0}return total;
}
async function triggerEnchant(engine,target,presenter){
  const f=engine.state.formal;if(f?.cls!=='魔劍士'||!target?.alive)return;
  if(f.overload){
    f.overload=false;
    for(const [ty,st] of [['arcane',null],['fire',{type:'burn',turns:3,dotMatk:.2}],['ice',{type:'slow',turns:3,mods:{speedPct:-.25}}],['lightning',{type:'paralysis',turns:1,chance:.35}]]){
      const r=await hit(engine,target,{name:'全元素附魔',type:ty},presenter,{multiplier:.45,type:ty,skipAfterHit:true});
      if(r?.damage&&st)simpleStatus(engine,target,st,'全元素附魔');
    }
    engine.log('🌈 全元素附魔爆發！次級附魔仍然保留。');return;
  }
  if(!f.enchant)return;
  const ty=f.enchant;f.enchant=null;
  const st=ty==='fire'?{type:'burn',turns:3,dotMatk:.2}:ty==='ice'?{type:'slow',turns:3,mods:{speedPct:-.25}}:ty==='lightning'?{type:'paralysis',turns:1,chance:.35}:null;
  const r=await hit(engine,target,{name:'附魔武器',type:ty},presenter,{multiplier:.55,type:ty,source:'magicAttack',skipAfterHit:true});
  if(r?.damage&&st)simpleStatus(engine,target,st,'附魔武器');
}
function maybePriestRefund(engine,skill,spent,healAction){
  if(engine.state.formal?.cls!=='牧師'||spent<=0)return;
  const virt=virtueNow(engine),chance=healAction?Math.min(.85,.45+virt/220):Math.min(.70,.28+virt/260),rate=healAction?.70:.55;
  if(Math.random()<chance){const refund=Math.max(1,Math.round(spent*rate));gainFormalResource(engine.state,'mp',refund);engine.log(`✨ 美德共鳴！返還 ${refund} MP。`)}
}

export function formalBasicAttackAction(state){
  const f=state?.formal;
  if(f?.cls==='聖騎士'&&f.seal)return{type:'holy',damageType:'holy',source:'attack',multiplier:1};
  return{type:'physical',damageType:'physical',source:'attack',multiplier:1};
}

export function modifyHeroDamageResult(engine,result,action){
  if(!result?.damage||!engine.state?.formal)return result;
  const f=engine.state.formal;
  if(f.cls==='戰士'){const lost=1-engine.state.heroHp/Math.max(1,engine.state.hero.maxHp);result.damage=Math.max(1,Math.round(result.damage*(1+Math.floor(lost*10)*.03)))}
  if(f.cls==='法師'&&f.magicAmp>0&&['arcane','fire','ice','lightning'].includes(action?.damageType||action?.type))result.damage=Math.max(1,Math.round(result.damage*(1+f.magicAmp*.05)));
  result.damage=Math.max(0,Math.round(result.damage*(1+effectMod(engine.state.hero,'damagePct'))));return result;
}

export function mitigateIncomingHeroDamage(engine,result,action){
  if(!result?.damage||!engine.state?.formal)return result;
  const hero=engine.state.hero,f=engine.state.formal,type=action?.damageType||action?.type||'physical';
  if(hero.statuses?.some(s=>s.mods?.immuneDamage)){result.damage=0;result.type='block';return result}
  if(type!=='physical'&&hero.statuses?.some(s=>s.mods?.magicImmune)){result.damage=0;result.type='block';return result}
  if(f.cls==='獵人'&&f.hound?.alive&&f.hound.hp>0&&Math.random()<.35){
    const dmg=Math.max(0,Math.round(result.damage));f.hound.hp=Math.max(0,f.hound.hp-dmg);
    if(f.hound.hp<=0){f.hound.alive=false;engine.log(`💀 獵犬替主人承受 ${dmg} 傷害後倒下。`)}else engine.log(`🐕 獵犬替主人承受 ${dmg} 傷害（${Math.round(f.hound.hp)}/${f.hound.maxHp}）。`);
    result.damage=0;result.type='block';return result;
  }
  const mana=hero.statuses?.find(s=>Number(s.mods?.manaShield)>0);
  if(mana&&f.maxMp>0&&f.mp>0){const wanted=Math.max(0,Math.round(result.damage*Number(mana.mods.manaShield))),paid=Math.min(wanted,Math.floor(f.mp));f.mp-=paid;result.damage=Math.max(0,result.damage-paid);if(paid)engine.log(`🔷 魔力護盾消耗 ${paid} MP 抵消傷害。`)}
  const grace=hero.statuses?.find(s=>s.type==='grace_shield'&&Number(s.shieldHp)>0);
  if(grace&&result.damage>0){
    const absorb=Math.min(result.damage,Number(grace.shieldHp));result.damage-=absorb;grace.shieldHp-=absorb;engine.log(`🪽 神恩護盾吸收 ${absorb} 傷害。`);
    if(grace.shieldHp<=0){hero.statuses=hero.statuses.filter(s=>s!==grace);healHero(engine,hero.maxHp*.12,'神恩護盾破裂');engine.log('✨ 神恩護盾破裂，觸發額外治療！')}
    else grace.name=`🪽 神恩護盾 ${Math.round(grace.shieldHp)}`;
  }
  return result;
}

async function consecrateTick(engine,presenter,status){
  const total=await hitAll(engine,{name:'奉獻',type:'holy'},presenter,{multiplier:Number(status.mods.consecrate||.45),type:'holy',source:'attack'});
  if(total>0)engine.log(`✨ 奉獻脈動：本回合共造成 ${total} 點神聖傷害。`);
  status.mods.consecrateTick=Number(status.mods.consecrateTick||0)+1;
  if(status.mods.consecrateTick>=3){
    const marked=engine.livingEnemies().filter(hasJudgmentMark);
    if(marked.length){
      marked.forEach(removeJudgmentMark);engine.log(`✨ 奉獻終結：消耗 ${marked.length} 枚審判印記！`);
      for(let i=0;i<marked.length;i++)await hitAll(engine,{name:'奉獻・聖印爆炸',type:'holy'},presenter,{multiplier:.50,type:'holy',source:'attack'});
    }
    status.turns=0;engine.state.hero.statuses=engine.state.hero.statuses.filter(s=>s!==status);
  }
}
async function resolveSnipe(engine,presenter){
  const f=engine.state.formal,s=f?.snipe;if(!s?.armed||engine.state.round<=Number(s.armedRound||0))return false;
  const target=engine.livingEnemies().find(x=>x.uid===s.targetUid)||engine.target();
  f.snipe=null;engine.state.hero.statuses=engine.state.hero.statuses.filter(x=>x.type!=='snipe_aim');
  if(!target)return true;
  const hasWeak=!!f.weakness[target.uid]||hasJudgmentMark(target)&&false,low=target.hp/Math.max(1,target.maxHp)<=.20;
  if(hasWeak&&low&&!target.isBoss){delete f.weakness[target.uid];target.statuses=(target.statuses||[]).filter(x=>x.type!=='hunter_weakness');engine.applyDamageToEnemy(target,target.hp);engine.log('☠️ 弱點＋HP≤20%：狙殺成功！');return true}
  let mult=1.8;if(hasWeak&&low&&target.isBoss){delete f.weakness[target.uid];target.statuses=(target.statuses||[]).filter(x=>x.type!=='hunter_weakness');mult=3;engine.log('🎯 消耗弱點！Boss 無法即死，轉為300%狙殺。')}
  await hit(engine,target,{name:'狙擊',type:'physical'},presenter,{multiplier:mult,type:'physical',source:'attack',forceHit:true,forceCrit:true});return true;
}

export async function formalTurnStart(engine,presenter){
  const f=engine.state?.formal;if(!f)return{consumeAction:false};
  if(['獵人','盜賊'].includes(f.cls)||f.resourceType==='dual'){
    let regen=8;if(f.resourceType==='energy')regen+=Math.max(0,Math.round(8*effectMod(engine.state.hero,'energyRegenPct')));
    gainFormalResource(engine.state,'energy',regen);
  }
  const med=engine.state.hero.statuses?.find(s=>Number(s.mods?.mpRegenPct)>0);if(med)gainFormalResource(engine.state,'mp',f.maxMp*Number(med.mods.mpRegenPct));
  const cons=engine.state.hero.statuses?.find(s=>Number(s.mods?.consecrate)>0);if(cons)await consecrateTick(engine,presenter,cons);
  if(f.cls==='聖騎士'&&!f.seal){f.seal=true;addStatus(engine.state.hero,{type:'holy_seal',name:'✨ 聖印',turns:999,effectType:'buff',mods:{},unstealable:true});engine.log('✨ 聖印重新凝聚！')}
  for(const t of engine.state.enemies||[]){if(f.cls==='獵人'&&!t.statuses?.some(s=>s.type==='hunter_weakness'&&s.turns>0))delete f.weakness[t.uid]}
  if(await resolveSnipe(engine,presenter))return{consumeAction:true};
  return{consumeAction:false};
}

export async function formalAllyTurn(engine,unit,presenter){
  if(!unit||unit.alive===false||unit.hp<=0)return;
  let skip=false;
  for(const st of [...(unit.statuses||[])]){
    if(['poison','burn','bleed'].includes(st.type)&&Number(st.power)>0){unit.hp=Math.max(0,unit.hp-Math.max(1,Math.round(st.power)));engine.log(`${st.name||st.type}：獵犬受到持續傷害。`)}
    if(['stun','paralysis','freeze'].includes(st.type)&&st.guaranteedSkip!==false)skip=true;
    st.turns--;
  }
  unit.statuses=(unit.statuses||[]).filter(s=>s.turns>0);
  if(unit.hp<=0){unit.alive=false;engine.log('💀 獵犬倒下了，本場無法再次召喚。');return}
  if(skip){engine.log('🐕 獵犬受到控制，本回合無法撕咬。');return}
  const alive=engine.livingEnemies();if(!alive.length)return;
  const target=alive[Math.floor(Math.random()*alive.length)],r=resolveAttack(unit,target,{type:'physical',source:'attack',multiplier:1,canParry:false});
  await engine.present(presenter,{type:'attack',side:'hero',result:r,action:{type:'physical',name:'獵犬撕咬'},attackerName:'獵犬',attackerUid:'hound',targetName:target.name,targetUid:target.uid});
  if(r.damage){
    const dealt=engine.applyDamageToEnemy(target,Math.max(r.damage,Math.max(2,Math.round(unit.attack*.20))));
    if(target.hp>0)addStatus(target,{type:'bleed',name:'🩸 流血',turns:3,power:Math.max(1,Math.round(unit.attack*.15)),effectType:'debuff',mods:{}});
    engine.log(`🐕 獵犬撕咬 ${target.name}，造成 ${dealt} 傷害並刷新3回合流血！`);
  }else engine.log(`🐕 獵犬撕咬被 ${target.name} 閃開了。`);
}

export function afterFormalStatusTick(engine,unit,isHero,{hadBleed=false}={}){
  const f=engine.state?.formal;if(isHero||f?.cls!=='獵人'||!hadBleed||!unit?.alive)return;
  if(Math.random()<.25){
    f.weakness[unit.uid]=true;addStatus(unit,{type:'hunter_weakness',name:'🎯 弱點',turns:3,effectType:'debuff',mods:{},unstealable:true});
    engine.log(`🎯 流血揭露：發現 ${unit.name} 的弱點！`);
  }
}

export async function afterHeroBasicAttack(engine,result,target,presenter){
  const f=engine.state?.formal;if(!f)return;
  if(f.cls==='戰士')gainFormalResource(engine.state,'rage',15+(result?.damage?5:0));
  if(f.cls==='法師'&&result?.damage)gainFormalResource(engine.state,'mp',Math.round(f.maxMp*.20));
  if(f.cls==='牧師'&&result?.damage)gainFormalResource(engine.state,'mp',Math.round(f.maxMp*.08));
  if(f.cls==='獵人'&&result?.damage){
    gainFormalResource(engine.state,'energy',10);let chance=.22;if(target?.statuses?.some(s=>s.type==='bleed'))chance+=.25;
    if(Math.random()<chance){f.weakness[target.uid]=true;addStatus(target,{type:'hunter_weakness',name:'🎯 弱點',turns:3,effectType:'debuff',mods:{},unstealable:true});engine.log('🎯 發現弱點！弱點刷新為3回合。')}
    maybeHunterFocusProc(engine,{name:'普攻'},result);
  }
  if(f.cls==='盜賊'){
    gainFormalResource(engine.state,'energy',2);
    if(result?.damage){f.combo=Math.min(3,f.combo+1);engine.log(`🔴 能量球 ${f.combo}/3`);await poisonCoatingProc(engine,target)}
  }
  if(f.cls==='魔劍士'){gainFormalResource(engine.state,'energy',10);if(result?.damage)await triggerEnchant(engine,target,presenter)}
  if(f.cls==='聖騎士'&&result?.damage){
    if(f.seal){
      const mp=Math.max(1,Math.min(Math.round(f.maxMp*.20),Math.max(Math.round(f.maxMp*.12),Math.round(Number(result.damage)*.35))));
      gainFormalResource(engine.state,'mp',mp);consumeSeal(engine);applyJudgmentMark(engine,target);
      engine.log(`✨ 聖印普攻：恢復 ${mp} MP，聖印轉移為審判印記。`);
    }else{const mp=Math.max(1,Math.round(f.maxMp*.10));gainFormalResource(engine.state,'mp',mp);engine.log(`🔵 普攻命中恢復 ${mp} MP。`)}
  }
}

export async function afterEnemyDamageToHero(engine,lost,attacker,presenter){
  const f=engine.state?.formal;if(!f||lost<=0)return;
  if(f.cls==='戰士')gainFormalResource(engine.state,'rage',10);
  const ret=engine.state.hero.statuses?.find(s=>Number(s.mods?.mpReturnChance)>0);if(ret&&Math.random()<Number(ret.mods.mpReturnChance))gainFormalResource(engine.state,'mp',Math.round(f.maxMp*.08));
  const counter=engine.state.hero.statuses?.find(s=>Number(s.mods?.counter)>0);if(counter&&attacker?.alive)await hit(engine,attacker,{name:'反擊',type:'physical'},presenter,{multiplier:Number(counter.mods.counter),source:'attack'});
  const aoe=engine.state.hero.statuses?.find(s=>Number(s.mods?.counterAoe)>0);if(aoe)await hitAll(engine,{name:'劍刃風暴',type:'physical'},presenter,{multiplier:Number(aoe.mods.counterAoe),source:'attack'});
  const frost=engine.state.hero.statuses?.find(s=>s.mods?.frostRetaliate);if(frost&&attacker?.alive)simpleStatus(engine,attacker,{type:'slow',turns:2,mods:{speedPct:-.20}},'冰霜護甲');
}

export function preventHeroDeath(engine){
  if(engine.state.heroHp>0)return false;const f=engine.state.formal;
  const last=engine.state.hero.statuses?.find(s=>s.mods?.deathPrevent);
  if(last){engine.state.heroHp=1;engine.log('🔥 破釜沉舟！勇者以 1 HP 撐住！');return true}
  if(f?.miracle){f.miracle=false;engine.state.heroHp=Math.round(engine.state.hero.maxHp*.40);engine.state.hero.statuses=engine.state.hero.statuses.filter(s=>s.type!=='miracle');engine.log('🌟 奇蹟！勇者重新站了起來！');return true}
  return false;
}

export async function executeFormalSkill(engine,skill,presenter){
  const state=engine.state,f=state.formal,target=engine.target();if(!f||!target)return null;
  const pre=formalSkillPreflight(state,skill);if(!pre.ok){engine.log(pre.message);return{preflightFailed:true}}
  const mpBefore=f.mp;payFormalSkill(state,skill);let priestHeal=false;
  const offensiveMage=f.cls==='法師'&&['arcane','fire','ice','lightning'].includes(skill.type);
  if(offensiveMage)f.magicAmp=Math.min(5,Number(f.magicAmp||0)+1);
  engine.log(`${skill.icon||'✨'} ${state.hero.name}使用「${skill.name}」！`);
  try{
    if(skill.id==='war_ragefill'){f.rage=100;engine.log('🔥 怒氣補滿100。');return{ok:true}}
    if(skill.id==='war_execute'){
      const rage=f.rage;f.rage=0,threshold=rage>=100?.25:rage>=75?.20:rage>=50?.15:rage>=25?.10:.05;
      if(target.hp/target.maxHp<=threshold&&!target.isBoss){engine.applyDamageToEnemy(target,target.hp);engine.log(`☠️ ${Math.round(rage)}怒氣斬殺成功！`);return{ok:true}}
      return hit(engine,target,skill,presenter,{multiplier:1+rage/100,type:'physical',source:'attack'});
    }
    if(skill.id==='mage_meditation'){addStatus(state.hero,{type:'mage_meditation',name:'魔力冥想',turns:3,effectType:'buff',mods:{hit:.15,mpRegenPct:.15}});return{ok:true}}
    if(skill.id==='mage_icefire'){
      let m=2.3,bonus=0,ts=target.statuses||[];if(ts.some(s=>s.type==='burn'))bonus+=.2;if(ts.some(s=>s.type==='freeze'))bonus+=.2;
      return hit(engine,target,skill,presenter,{multiplier:m*(1+bonus),type:'arcane'});
    }
    if(skill.id==='priest_lightbolt'&&typeof confirm==='function'&&confirm('聖光彈：按「確定」治療自己；按「取消」攻擊敵人。')){
      priestHeal=true;healHero(engine,state.hero.magicAttack*1.25+virtueNow(engine)*1.2,'聖光彈',{activePriestHeal:true});return{ok:true}
    }
    if(skill.id==='priest_holy_prayer'){priestHeal=true;healHero(engine,state.hero.maxHp*.55+virtueNow(engine)*1.5,'神聖禱言',{activePriestHeal:true});return{ok:true}}
    if(skill.id==='priest_cleanse'){
      const before=state.hero.statuses.length;state.hero.statuses=state.hero.statuses.filter(s=>!['poison','disease','curse'].includes(s.type));
      engine.log(`✨ 淨化移除 ${before-state.hero.statuses.length} 個負面狀態。`);return{ok:true}
    }
    if(skill.id==='priest_miracle'){f.miracle=true;addStatus(state.hero,{type:'miracle',name:'🌟 奇蹟',turns:999,effectType:'buff',mods:{},unstealable:true});return{ok:true}}
    if(skill.id==='hunter_hound'){
      const h=state.hero;f.hound={uid:'hunter_hound',name:'獵犬',side:'ally',alive:true,statuses:[],summonRound:state.round,hp:Math.max(1,Math.round(h.maxHp*.45)),maxHp:Math.max(1,Math.round(h.maxHp*.45)),attack:h.attack*.85,magicAttack:h.magicAttack*.25,defense:h.defense*.70,magicDefense:h.magicDefense*.60,speed:h.speed*.90,evade:h.evade*.5,parry:0,block:0,statusRes:h.statusRes*.75,resist:{...(h.resist||{})}};
      engine.log(`🐕 獵犬加入戰鬥！HP ${f.hound.hp}｜ATK ${Math.round(f.hound.attack)}｜DEF ${Math.round(f.hound.defense)}；從下一回合開始行動。`);return{ok:true}
    }
    if(skill.id==='hunter_deadly'){
      let m=1.35;if(f.weakness[target.uid]){m=2.25;delete f.weakness[target.uid];target.statuses=(target.statuses||[]).filter(s=>s.type!=='hunter_weakness');engine.log('🎯 消耗弱點發現！')}
      return hit(engine,target,skill,presenter,{multiplier:m,type:'physical',source:'attack'});
    }
    if(skill.id==='hunter_snipe'){
      f.snipe={targetUid:target.uid,armed:true,armedRound:state.round};addStatus(state.hero,{type:'snipe_aim',name:'🔭 狙擊瞄準',turns:2,effectType:'buff',mods:{},unstealable:true});
      engine.log(`🔭 鎖定 ${target.name}；下一次自身行動必定命中、必定暴擊。`);return{ok:true}
    }
    if(skill.id==='rogue_poison'){
      state.hero.statuses=state.hero.statuses.filter(s=>!s.mods?.poisonCoating);addStatus(state.hero,{type:'poison_coating',name:'☠️ 毒藥附魔',turns:4,effectType:'buff',mods:{poisonCoating:true}});
      engine.log('☠️ 4回合內每次命中追加毒傷並刷新中毒。');return{ok:true}
    }
    if(skill.id==='rogue_rupture'){
      const balls=f.combo;f.combo=0;const r=await hit(engine,target,skill,presenter,{multiplier:.75+.35*balls,type:'physical',source:'attack'});
      if(r?.damage)simpleStatus(engine,target,{type:'bleed',turns:3,dotAtk:.18*balls},skill.name);
      gainFormalResource(state,'energy',state.hero.maxEnergy*(.30*balls+(r?.crit?.10:0)));return r;
    }
    if(skill.id==='rogue_steal'){
      if(target.stolen){engine.log('👜 這名敵人已經沒東西可偷了。');return{ok:false}}
      if(Math.random()<.75){
        target.stolen=true;state.battleLoot=Array.isArray(state.battleLoot)?state.battleLoot:[];
        if(Math.random()<.55){const gold=5+Math.floor(Math.random()*16);state.battleLoot.push({type:'gold',amount:gold});engine.log(`👜 偷到 ${gold} G！`)}
        else{state.battleLoot.push({type:'item',item:{itemId:'stolen_potion',name:'初級生命藥水',icon:'❤️',category:'consumable',subtype:'battle',battleConsumable:true,effectType:'heal_hp',effectValue:60,status:'unused',source:'steal'}});engine.log('👜 偷到初級生命藥水！')}
      }else engine.log('👜 盜竊失敗！');
      return{ok:true};
    }
    if(skill.id==='rogue_frenzy'){
      f.combo=0;for(let i=0;i<5;i++){const alive=engine.livingEnemies();if(!alive.length)break;await hit(engine,alive[Math.floor(Math.random()*alive.length)],skill,presenter,{multiplier:.65,type:'physical',source:'attack'})}
      state.heroEnergy=state.hero.maxEnergy;return{ok:true};
    }
    if(skill.id==='pal_shock'&&typeof confirm==='function'&&confirm('神聖震擊：按「確定」治療自己（耗18%最大MP）；按「取消」攻擊敵人（回15%最大MP）。')){
      const cost=Math.round(f.maxMp*.18);if(f.mp<cost){engine.log('🔵 MP不足！');return{ok:false}}f.mp-=cost;healHero(engine,state.hero.magicAttack*1.3+virtueNow(engine),'神聖震擊');return{ok:true}
    }
    if(skill.id==='pal_crusader'){
      const marked=hasJudgmentMark(target),r=await hit(engine,target,skill,presenter,{multiplier:1.05,type:'holy',source:'attack'});
      if(r?.damage){const n=Math.max(1,Math.round(f.maxMp*.15));gainFormalResource(state,'mp',n);if(marked&&target.hp>0){await hit(engine,target,{name:'十字軍・印記追加',type:'holy'},presenter,{multiplier:.75,type:'holy',source:'attack'});applyJudgmentMark(engine,target)}}
      return r;
    }
    if(skill.id==='pal_shock'){
      const r=await hit(engine,target,skill,presenter,{multiplier:1.2,type:'holy',source:'magicAttack'});if(r?.damage)gainFormalResource(state,'mp',Math.round(f.maxMp*.15));return r;
    }
    if(skill.id==='pal_blade'){
      const marked=hasJudgmentMark(target),r=await hit(engine,target,skill,presenter,{multiplier:1.35,type:'physical',source:'attack'});
      if(r?.damage){gainFormalResource(state,'mp',Math.round(f.maxMp*.12));if(marked&&target.hp>0){removeJudgmentMark(target);await hit(engine,target,{name:'正義之刃・聖印爆發',type:'holy'},presenter,{multiplier:.50,type:'holy',source:'attack'});simpleStatus(engine,target,{type:'stun',turns:1},skill.name)}}
      return r;
    }
    if(skill.id==='pal_freedom'){
      const total=await hitAll(engine,skill,presenter,{multiplier:1,type:'holy',source:'attack'});for(const t of engine.livingEnemies())applyJudgmentMark(engine,t);if(total>0)healHero(engine,total*.30,'神聖風暴');return{damage:total}
    }
    if(skill.id==='pal_consecrate'){addStatus(state.hero,{type:'pal_consecrate',name:'✨ 奉獻',turns:4,effectType:'buff',mods:{consecrate:.45,consecrateTick:0},unstealable:true});return{ok:true}}
    if(skill.id==='pal_verdict'){
      const sealed=consumeSeal(engine),r=await hit(engine,target,skill,presenter,{multiplier:2.2,type:'holy',source:'attack'});
      if(sealed&&target.hp>0&&target.hp/target.maxHp<=.15){if(!target.isBoss){engine.applyDamageToEnemy(target,target.hp);engine.log('⚖️ 聖印裁決：斬殺！')}else await hit(engine,target,{name:'聖印裁決',type:'holy'},presenter,{multiplier:3,type:'holy',source:'attack'})}
      return r;
    }
    if(skill.id==='sb_disrupt'){
      const buffs=(target.statuses||[]).filter(s=>s.effectType==='buff'&&!s.unstealable);
      if(buffs.length){const stolen=buffs[Math.floor(Math.random()*buffs.length)];target.statuses=target.statuses.filter(s=>s!==stolen);if(stolen.type==='holy_seal')setEnchant(engine,'holy');else addStatus(state.hero,{...stolen});engine.log(`🌀 偷走了 ${stolen.name||stolen.type}！`)}
      const before=Math.max(0,Number(target.mp??target.energy??0)),max=Math.max(1,Number(target.maxMp||target.maxEnergy||100)),drained=Math.min(before,Math.max(1,Math.round(max*.15)));
      if(Object.prototype.hasOwnProperty.call(target,'mp')||target.maxMp!=null)target.mp=Math.max(0,before-drained);else target.energy=Math.max(0,before-drained);
      gainFormalResource(state,'mp',Math.round(f.maxMp*.15));gainFormalResource(state,'energy',Math.round(state.hero.maxEnergy*.15));engine.log(`🌀 亂魔抽取 ${drained} 點資源。`);return{ok:true}
    }
    if(skill.id==='sb_accel'){addStatus(state.hero,{type:'sb_accel',name:'力場加速',turns:4,effectType:'buff',mods:formalMods(state.hero,{speedPct:.30})});setEnchant(engine,'lightning');return{ok:true}}
    if(skill.id==='sb_frost_armor'){addStatus(state.hero,{type:'sb_frost_armor',name:'冰霜護甲',turns:4,effectType:'buff',mods:{...formalMods(state.hero,{defensePct:.30}),frostRetaliate:true}});setEnchant(engine,'ice');return{ok:true}}
    if(skill.id==='sb_firestorm'){
      const total=await hitAll(engine,skill,presenter,{multiplier:1.05,type:'fire',source:'magicAttack'});for(const t of engine.livingEnemies())simpleStatus(engine,t,{type:'burn',turns:3,dotMatk:.22},skill.name);setEnchant(engine,'fire');return{damage:total}
    }
    if(skill.id==='sb_element_burst'){
      for(const ty of ['arcane','fire','ice','lightning'])await hit(engine,target,skill,presenter,{multiplier:.75,type:ty,source:'magicAttack',skipAfterHit:true});
      f.overload=true;engine.log('🌈 第一層「全元素附魔」已準備；不會覆蓋次級附魔。');return{ok:true}
    }
    if(skill.id==='sb_arcane_strike'){
      const r=await hit(engine,target,skill,presenter,{multiplier:1,type:'physical',source:'attack',skipAfterHit:true});
      if(r?.damage){await hit(engine,target,skill,presenter,{multiplier:.75,type:'arcane',source:'magicAttack',skipAfterHit:true});gainFormalResource(state,'mp',Math.round(f.maxMp*.12));await triggerEnchant(engine,target,presenter)}
      return r;
    }
    if(skill.id==='sb_element_bolt'){
      const ty=['fire','ice','lightning'][Math.floor(Math.random()*3)],r=await hit(engine,target,skill,presenter,{multiplier:1.25,type:ty,source:'magicAttack'});setEnchant(engine,ty);return r;
    }

    if(skill.effect){applyEffect(engine,skill.effect,skill.name);return{ok:true}}

    let total=0,last=null;
    if(skill.aoe)total=await hitAll(engine,skill,presenter);
    else{const opts={};if(skill.id==='rogue_ambush'&&f.uses[skill.id]===1)opts.forceCrit=Math.random()<.50;last=await hit(engine,target,skill,presenter,opts);total=Number(last?.damage)||0}
    if(total&&skill.status){if(skill.aoe)for(const e of engine.livingEnemies())simpleStatus(engine,e,skill.status,skill.name);else simpleStatus(engine,target,skill.status,skill.name)}
    if(total&&skill.healDamage)healHero(engine,total*Number(skill.healDamage),skill.name);
    if(skill.armorBreak&&target)addStatus(target,{type:'armor_break',name:'破甲',turns:2,effectType:'debuff',mods:{defense:-Number(target.defense||0)*.25}});
    if(skill.id==='rogue_ambush'&&last?.crit){f.combo=Math.min(3,f.combo+1);engine.log(`🔴 能量球 ${f.combo}/3`)}
    if(skill.id==='priest_smite'&&last?.damage){
      const dot=Math.max(1,Math.round(state.hero.magicAttack*.35-Number(target.magicDefense||0)*.25));
      addStatus(target,{type:'holy_penance_dot',name:'✝️ 神聖懲戒',turns:3,power:dot,effectType:'debuff',mods:{}});
      gainFormalResource(state,'mp',Math.round(f.maxMp*.03));engine.log('✝️ 神聖懲戒附著3回合；懲戒回流3% MaxMP。');
    }
    return last||{damage:total};
  }finally{
    if(offensiveMage&&f.magicAmp>=5){const n=Math.max(1,Math.round(f.maxMp*.05));gainFormalResource(state,'mp',n);engine.log(`🔮 魔力增幅滿層：回流 ${n} MP。`)}
    maybePriestRefund(engine,skill,Math.max(0,mpBefore-f.mp),priestHeal);
  }
}
