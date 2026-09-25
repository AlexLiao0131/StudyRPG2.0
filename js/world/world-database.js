export const WEEKLY_WORLDS=Object.freeze([
 {week:1,map:'草地',background:'images/backgrounds/week01_grassland.png',monsters:['slime_water','slime_fire','slime_grass','slime_lightning','slime_king']},
 {week:2,map:'洞窟',background:'images/backgrounds/week02_cave.png',monsters:['goblin_slave','goblin_soldier','goblin_shaman','goblin_general','goblin_king']},
 {week:3,map:'森林',background:'images/backgrounds/week03_forest.png',monsters:['forest_spider','forest_wolf','forest_bear','treant','dark_elf']},
 {week:4,map:'荒地',background:'images/backgrounds/week04_wasteland.png',monsters:['orc_slave','orc_warrior','orc_shaman','orc_champion','orc_general']},
 {week:5,map:'邪惡巫師塔',background:'images/backgrounds/week05_wizard_tower.png',monsters:['skeleton','zombie','abomination','eyeball_monster','necromancer']},
 {week:6,map:'沙漠',background:'images/backgrounds/week06_desert.png',monsters:['lizard_mummy','giant_beetle','giant_scorpion','lizard_warrior','chimera']},
 {week:7,map:'金字塔內部',background:'images/backgrounds/week07_pyramid.png',monsters:['lizard_warrior','lizard_mage','lizard_pharaoh','lizard_anubis','lizard_ra']},
 {week:8,map:'魔王城郊區',background:'images/backgrounds/week08_demon_outskirts.png',monsters:['human_bandit_rogue','cult_mage','orc_general','ogre','two_headed_ogre_mage']},
 {week:9,map:'魔王城外圍',background:'images/backgrounds/week09_demon_castle_outer.png',monsters:['apocalypse_war','apocalypse_plague','apocalypse_famine','apocalypse_death','demon_general']},
 {week:10,map:'魔王城內部',background:'images/backgrounds/week10_demon_castle_inner.png',monsters:['gargoyle','vampire_swordsman','hero_mirror','demon_king_phase1','demon_king_phase2']},
 {week:11,map:'燃燒的大地',background:'images/backgrounds/week11_burning_land.png',monsters:['human_bandit','goblin_soldier','orc_warrior','orc_shaman','reborn_necromancer']},
 {week:12,map:'古代遺跡',background:'images/backgrounds/week12_ancient_ruins.png',monsters:['guardian_stone','guardian_metal','guardian_octopus_machine','guardian_doll','black_command_pillar']},
 {week:13,map:'船的甲板',background:'images/backgrounds/week13_ship_deck.png',monsters:['human_pirate','murloc','murloc_mage','evil_murloc_summoner','kraken']},
 {week:14,map:'蠻荒叢林',background:'images/backgrounds/week14_jungle.png',monsters:['man_eating_flower','crocodile','giant_python','gorilla','tyrannosaurus']},
 {week:15,map:'幽靈沼澤',background:'images/backgrounds/week15_ghost_swamp.png',monsters:['giant_bat','ghost','swamp_skeleton','banshee','scarecrow_reaper']},
 {week:16,map:'沉沒古城',background:'images/backgrounds/week16_sunken_city.png',monsters:['skeleton_lizardman','wandering_zombie_lizardman','zombie_lizard_warrior','zombie_lizard_priest','hydra']},
 {week:17,map:'大裂谷',background:'images/backgrounds/week17_great_rift.png',monsters:['pigman','pigman_warrior','centaur','centaur_knight','cyclops']},
 {week:18,map:'飛空艇',background:'images/backgrounds/week18_airship.png',monsters:['harpy','flying_goblin','wyvern','sky_pirate','sky_pirate_captain']},
 {week:19,map:'天空城',background:'images/backgrounds/week19_sky_city.png',monsters:['magic_armor','stone_gargoyle','sky_city_mage','pegasus_knight','sky_colossus']},
 {week:20,map:'燃燒平原',background:'images/backgrounds/week20_burning_plain.png',monsters:['fire_lizard','lava_giant','demon_dragon_phase1','demon_dragon_phase2','final_necromancer'],finalWeek:true},
 {week:21,map:'皇都凱旋遊行',background:'images/backgrounds/week21_royal_parade.png',monsters:[null,null,null,null,null],mode:'celebration',noBattle:true}
]);
const MONSTER_NAMES={slime_water:'水史萊姆',slime_fire:'火史萊姆',slime_grass:'草史萊姆',slime_lightning:'雷史萊姆',slime_king:'大史萊姆',goblin_slave:'哥布林奴隸',goblin_soldier:'哥布林士兵',goblin_shaman:'哥布林巫醫',goblin_general:'哥布林將軍',goblin_king:'哥布林王',forest_spider:'蜘蛛',forest_wolf:'狼',forest_bear:'熊',treant:'樹妖',dark_elf:'黑暗精靈',orc_slave:'獸人農奴',orc_warrior:'獸人戰士',orc_shaman:'獸人巫醫',orc_champion:'獸人冠軍劍士',orc_general:'獸人將軍'};
export function monsterName(id){return MONSTER_NAMES[id]||String(id||'未知怪物').replaceAll('_',' ')}
