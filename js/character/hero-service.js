import { getGame } from '../core/store.js';
const HERO_ASSET_MAP={'見習勇者':'novice','初心者':'novice','戰士':'warrior','法師':'mage','牧師':'priest','獵人':'hunter','盜賊':'rogue','聖騎士':'paladin','魔劍士':'spellblade'};
export function heroClassKey(){const h=getGame().hero||{};const cls=h.jobAwakened?(h.heroClass||'見習勇者'):'見習勇者';return HERO_ASSET_MAP[cls]||'novice'}
export function heroSpritePath(state='idle'){const h=getGame().hero||{};return `images/hero_${heroClassKey()}${h.gender==='female'?'_female':''}_${state}.png`}
