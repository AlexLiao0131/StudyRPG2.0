// 職業技能專屬裝備詞綴資料。
// 只保存正式 Skill Database 中存在的 skill id；Runtime 不再自行猜技能名稱或技能數值。
export const EQUIPMENT_SKILL_AFFIXES=Object.freeze({
  'eq:warrior_mastery':Object.freeze({
    id:'eq:warrior_mastery',name:'戰技專精',slots:['weapon','body','accessory'],kind:'skill_boost',heroClass:'戰士',
    skillIds:Object.freeze(['war_heroic','war_shockwave','war_charge','war_execute','war_bloodstrike']),
    multiplier:.18,power:7,text:'戰士攻擊型職業技能傷害＋18%'
  }),
  'eq:mage_mastery':Object.freeze({
    id:'eq:mage_mastery',name:'元素增幅',slots:['weapon','head','accessory'],kind:'skill_boost',heroClass:'法師',
    skillIds:Object.freeze(['mage_blast','mage_missile','mage_blizzard','mage_burn','mage_icefire']),
    multiplier:.18,power:7,text:'法師攻擊型職業技能傷害＋18%'
  }),
  'eq:priest_mastery':Object.freeze({
    id:'eq:priest_mastery',name:'聖療回聲',slots:['weapon','head','accessory'],kind:'skill_boost',heroClass:'牧師',
    skillIds:Object.freeze(['priest_smite','priest_lightbolt','priest_exorcism']),
    multiplier:.20,power:7,text:'牧師聖光攻擊技能效果＋20%'
  }),
  'eq:hunter_mastery':Object.freeze({
    id:'eq:hunter_mastery',name:'狩獵印記',slots:['weapon','head','accessory'],kind:'skill_boost',heroClass:'獵人',
    skillIds:Object.freeze(['hunter_trip','hunter_magic_arrow','hunter_explosive','hunter_deadly','hunter_snipe']),
    multiplier:.18,power:7,text:'獵人攻擊型職業技能傷害＋18%'
  }),
  'eq:rogue_mastery':Object.freeze({
    id:'eq:rogue_mastery',name:'暗影殺意',slots:['weapon','head','accessory'],kind:'skill_boost',heroClass:'盜賊',
    skillIds:Object.freeze(['rogue_ambush','rogue_rupture','rogue_frenzy']),
    multiplier:.18,power:7,text:'盜賊攻擊型職業技能傷害＋18%'
  }),
  'eq:paladin_mastery':Object.freeze({
    id:'eq:paladin_mastery',name:'聖裁增幅',slots:['weapon','body','accessory'],kind:'skill_boost',heroClass:'聖騎士',
    skillIds:Object.freeze(['pal_crusader','pal_shock','pal_blade','pal_freedom','pal_verdict']),
    multiplier:.18,power:7,text:'聖騎士攻擊型職業技能傷害＋18%'
  }),
  'eq:spellblade_mastery':Object.freeze({
    id:'eq:spellblade_mastery',name:'魔劍共鳴',slots:['weapon','body','accessory'],kind:'skill_boost',heroClass:'魔劍士',
    skillIds:Object.freeze(['sb_arcane_strike','sb_element_bolt','sb_firestorm','sb_element_burst']),
    multiplier:.18,power:7,text:'魔劍士攻擊型職業技能傷害＋18%'
  })
});

export function canonicalEquipmentSkillAffix(affix={}){
  const def=EQUIPMENT_SKILL_AFFIXES[String(affix?.id||'')];
  return def?{...affix,...def}:affix;
}
