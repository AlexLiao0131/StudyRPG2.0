import { addStatus, effectiveBattleValue, totalElementRes } from './battle-math.js';

const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));

export function initializeEquipmentRuntime(engine){
  const s=engine?.state;if(!s)return null;
  const affixes=(engine.equipmentAffixes||[]).map(clone);s.equipmentAffixes=affixes;s.equipmentRuntime={deathPreventUsed:false};s.equipmentCompanions=[];
  for(const a of affixes){
    if(a.kind!=='stat'&&!s.hero.statuses.some(st=>st.type===`equipment_affix_${a.id}`))addStatus(s.hero,{type:`equipment_affix_${a.id}`,name:`💎 ${a.name||a.id}`,turns:999,effectType:'buff',mods:{}});
    if(a.effect==='opening_guard'&&!s.hero.statuses.some(st=>st.type==='equipment_opening_guard'))addStatus(s.hero,{type:'equipment_opening_guard',name:'🛡️ 王者庇護（前3回合）',turns:999,effectType:'buff',mods:{}});
    if(a.effect==='summon_flame'&&!s.equipmentCompanions.some(c=>c.effect===a.effect))s.equipmentCompanions.push({affixId:a.id,effect:a.effect,name:'火靈契約',icon:'🔥',type:'fire',multiplier:.35});
    if(a.effect==='summon_blade'&&!s.equipmentCompanions.some(c=>c.effect===a.effect))s.equipmentCompanions.push({affixId:a.id,effect:a.effect,name:'劍魂契約',icon:'⚔️',type:'physical',multiplier:.35});
  }
  if(affixes.length)s.logs.push(`💎 詞條裝備啟動：${affixes.map(a=>a.name||a.id).join('、')}`);
  for(const c of s.equipmentCompanions)s.logs.push(`${c.icon} ${c.name}由裝備詞綴啟動，會在勇者造成傷害後追擊。`);
  return s.equipmentRuntime;
}


export function syncEquipmentRoundStatuses(engine){
  const s=engine?.state;if(!s)return;const hasGuard=(s.equipmentAffixes||[]).some(a=>a.effect==='opening_guard');
  s.hero.statuses=(s.hero.statuses||[]).filter(st=>st.type!=='equipment_opening_guard');
  if(hasGuard&&s.round<=3)addStatus(s.hero,{type:'equipment_opening_guard',name:'🛡️ 王者庇護（前3回合）',turns:999,effectType:'buff',mods:{}});
}

export function mitigateEquipmentIncomingDamage(engine,result){
  if(!result?.damage||!engine?.state)return result;const s=engine.state;if(s.round<=3&&(s.equipmentAffixes||[]).some(a=>a.effect==='opening_guard'))return{...result,damage:Math.max(0,Math.round(Number(result.damage)*.85)),equipmentGuard:true};return result;
}

export function applyEquipmentActionModifiers(engine,action){
  if(!action||!engine?.state)return action;const cls=engine.heroSource?.heroClass||engine.state.formal?.cls||'';let multiplier=1;
  for(const a of engine.state.equipmentAffixes||[]){if(a.kind==='skill_boost'&&a.heroClass===cls&&(a.skillIds||[]).includes(action.id))multiplier+=Number(a.multiplier)||0}
  if(multiplier===1)return action;const next=clone(action);
  if(Number(next.multiplier))next.multiplier*=multiplier;
  if(Array.isArray(next.effects))for(const e of next.effects)if(e?.type==='damage'&&Number(e.multiplier))e.multiplier*=multiplier;
  if(next.effect?.mods){for(const key of ['heal','healing','shield'])if(Number(next.effect.mods[key]))next.effect.mods[key]*=multiplier}
  engine.log(`✨ ${action.name||action.id}受到職業專屬詞條強化！`);return next;
}

async function followupHit(engine,target,name,type,multiplier,presenter){
  if(!target||target.hp<=0)return 0;const hero=engine.state.hero,physical=type==='physical',atk=effectiveBattleValue(hero,physical?'attack':'magicAttack'),def=effectiveBattleValue(target,physical?'defense':'magicDefense');let amount=Math.max(1,(atk-def*.50)*Math.max(0,Number(multiplier)||0));if(!physical&&type!=='holy'&&type!=='arcane')amount*=Math.max(.05,1-totalElementRes(target,type));amount=Math.max(1,Math.round(amount));
  const result={type:'hit',damage:amount,damageType:type,crit:false,weak:false,resisted:false,equipmentFollowup:true};const action={name,type,damageType:type,multiplier:1,forceHit:true,canDodge:false,canParry:false,canBlock:false,equipmentFollowup:true};
  await engine.present(presenter,{type:'attack',side:'hero',result,action,attackerName:hero.name,attackerUid:'hero',targetName:target.name,targetUid:target.uid,monsterId:null});
  const dealt=engine.applyDamageToEnemy(target,amount);engine.log(`${name}造成 ${dealt} 點${physical?'物理':'元素'}追擊傷害。`);return dealt;
}

export async function afterEquipmentHeroAction(engine,target,damage,presenter){
  const s=engine?.state;if(!s||s.ended||!target||target.hp<=0||damage<=0)return;
  for(const a of s.equipmentAffixes||[]){
    if(a.effect==='lifesteal'){const heal=Math.max(1,Math.round(damage*Number(a.ratio||0)));const before=s.heroHp;s.heroHp=Math.min(s.hero.maxHp,s.heroHp+heal);engine.log(`🩸 飲血恢復 ${Math.max(0,s.heroHp-before)} HP。`)}
    if(a.effect==='echo_fire'&&Math.random()<Number(a.chance||0))await followupHit(engine,target,'餘燼回響','fire',Number(a.multiplier||.6),presenter);
    if(a.effect==='echo_physical'&&Math.random()<Number(a.chance||0))await followupHit(engine,target,'幻影追擊','physical',Number(a.multiplier||.7),presenter);
  }
  for(const c of s.equipmentCompanions||[]){if(target.hp<=0)break;await followupHit(engine,target,c.name,c.type,c.multiplier,presenter);engine.log(`${c.icon} ${c.name}完成追擊！`)}
}

export function preventEquipmentHeroDeath(engine){
  const s=engine?.state,runtime=s?.equipmentRuntime;if(!s||s.heroHp>0||!runtime||runtime.deathPreventUsed)return false;
  if(!(s.equipmentAffixes||[]).some(a=>a.effect==='death_prevent'))return false;runtime.deathPreventUsed=true;s.heroHp=1;engine.log('🔥 不死鳥誓約發動：抵抗本場第一次致命傷害，保留 1 HP！');return true;
}
