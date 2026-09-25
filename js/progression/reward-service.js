const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

export function applyStatRewards(hero,map={}){
  const gains={};hero.stats=hero.stats||{str:0,agi:0,int:0,will:0};
  for(const [key,raw] of Object.entries(map||{})){
    const value=Math.max(0,Math.round(Number(raw)||0));if(!value)continue;
    if(key==='virtue')hero.virtue=Math.max(0,Number(hero.virtue)||0)+value;
    else if(Object.prototype.hasOwnProperty.call(hero.stats,key))hero.stats[key]=Math.max(0,Number(hero.stats[key])||0)+value;
    else continue;
    gains[key]=value;
  }
  hero.lastStatGains=gains;return gains;
}

export function addExperience(hero,amount){
  let gain=Math.max(0,Math.round(Number(amount)||0)),levels=0;
  hero.level=Math.max(1,Number(hero.level)||1);hero.exp=Math.max(0,Number(hero.exp)||0);hero.maxExp=Math.max(1,Number(hero.maxExp)||100);
  hero.exp+=gain;
  while(hero.exp>=hero.maxExp){
    hero.exp-=hero.maxExp;hero.level++;levels++;hero.maxExp=Math.max(1,Math.floor(hero.maxExp*1.2));
    hero.stats=hero.stats||{};for(const k of ['str','agi','int','will'])hero.stats[k]=Math.max(0,Number(hero.stats[k])||0)+1;
  }
  return {gain,levels};
}

export function reverseExperience(hero,amount){
  let reclaim=Math.max(0,Math.round(Number(amount)||0));
  hero.level=Math.max(1,Number(hero.level)||1);hero.exp=Math.max(0,Number(hero.exp)||0);hero.maxExp=Math.max(1,Number(hero.maxExp)||100);
  hero.exp-=reclaim;
  while(hero.exp<0&&hero.level>1){
    hero.level--;hero.maxExp=Math.max(100,Math.floor(hero.maxExp/1.2));
    hero.stats=hero.stats||{};for(const k of ['str','agi','int','will'])hero.stats[k]=Math.max(0,(Number(hero.stats[k])||0)-1);
    hero.exp+=hero.maxExp;
  }
  if(hero.exp<0)hero.exp=0;
}

export function grantRewardBundle(hero,{gold=0,exp=0,stats={}}={}){
  const fullGold=Math.max(0,Math.round(Number(gold)||0));
  const debt=Math.max(0,Number(hero.pendingGoldDebt)||0),paid=Math.min(fullGold,debt),netGold=fullGold-paid;
  hero.pendingGoldDebt=debt-paid;hero.gold=Math.max(0,Number(hero.gold)||0)+netGold;
  const experience=addExperience(hero,exp),statGain=applyStatRewards(hero,stats);
  return {gold:fullGold,exp:experience.gain,stats:statGain,levels:experience.levels,debtPaid:paid};
}

export function reclaimRewardBundle(hero,{gold=0,exp=0,stats={}}={},ratio=0){
  ratio=clamp(Number(ratio)||0,0,1);const keptStats={};
  hero.stats=hero.stats||{};
  for(const [key,raw] of Object.entries(stats||{})){
    const full=Math.max(0,Math.round(Number(raw)||0)),keep=Math.max(0,Math.round(full*ratio)),reclaim=Math.max(0,full-keep);
    if(reclaim){
      if(key==='virtue')hero.virtue=Math.max(0,(Number(hero.virtue)||0)-reclaim);
      else if(Object.prototype.hasOwnProperty.call(hero.stats,key))hero.stats[key]=Math.max(0,(Number(hero.stats[key])||0)-reclaim);
    }
    if(keep)keptStats[key]=keep;
  }
  const fullExp=Math.max(0,Math.round(Number(exp)||0)),keepExp=Math.max(0,Math.round(fullExp*ratio));reverseExperience(hero,fullExp-keepExp);
  const fullGold=Math.max(0,Math.round(Number(gold)||0)),keepGold=Math.max(0,Math.round(fullGold*ratio));let need=fullGold-keepGold;
  if(need>0){const take=Math.min(Math.max(0,Number(hero.gold)||0),need);hero.gold-=take;need-=take;if(need>0)hero.pendingGoldDebt=Math.max(0,Number(hero.pendingGoldDebt)||0)+need;}
  hero.lastStatGains={};
  return {gold:keepGold,exp:keepExp,stats:keptStats};
}
