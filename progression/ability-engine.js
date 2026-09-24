export const AUTO_TASK_RULES={
 study:{int:.67,will:.33},exam_paper:{int:.70,will:.30},sport:{str:.55,agi:.45},
 music:{agi:.45,int:.35,will:.20},chore:{virtue:.70,will:.30},selfcare:{virtue:.55,will:.45},
 school_reading:{int:.60,will:.40},extra_reading:{int:.60,will:.40},custom:{will:1}
};
export const DIFFICULTY_POINTS={easy:1,normal:3,hard:4,challenge:5};
export const POWER_WEIGHT={str:1.2,agi:1.1,int:1,will:.8,virtue:0};

export function rewardMap(task){
 if(task.rewardMode==="manual") return {...(task.manualStatRewards||{})};
 const weights=AUTO_TASK_RULES[task.category]||AUTO_TASK_RULES.custom;
 const budget=DIFFICULTY_POINTS[task.difficulty]||3;
 const rows=Object.entries(weights).sort((a,b)=>b[1]-a[1]);
 let used=0,out={};
 rows.forEach(([k,w],i)=>{const v=i===rows.length-1?budget-used:Math.max(0,Math.round(budget*w));used+=v;if(v)out[k]=v;});
 return out;
}
export function mapPower(map){return Object.entries(map||{}).reduce((n,[k,v])=>n+(POWER_WEIGHT[k]||0)*(Number(v)||0),0);}
export function taskPower(task){return mapPower(rewardMap(task));}
export function heroPower(hero){const s=hero.stats||{};return Math.floor((s.str||0)*1.2+(s.agi||0)*1.1+(s.int||0)+(s.will||0)*.8);}
export function applyTaskReward(hero,task,ratio=1){
 const gains=rewardMap(task);
 for(const [k,v0] of Object.entries(gains)){const v=(Number(v0)||0)*ratio;if(k==="virtue")hero.virtue=(hero.virtue||0)+v;else hero.stats[k]=(hero.stats[k]||0)+v;}
 hero.exp=(hero.exp||0)+Math.round(10*(DIFFICULTY_POINTS[task.difficulty]||3)*ratio);
 while(hero.exp>=hero.maxExp){hero.exp-=hero.maxExp;hero.level++;hero.maxExp=Math.floor(hero.maxExp*1.2);for(const k of Object.keys(hero.stats))hero.stats[k]++;}
 return gains;
}