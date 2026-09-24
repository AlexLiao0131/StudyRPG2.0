export function defaultState(){
 return {
  version:2,
  hero:{name:"勇者",level:1,exp:0,maxExp:100,gold:0,virtue:0,stats:{str:10,agi:10,int:10,will:10}},
  semester:{startDate:"2026-08-31",endDate:"2027-01-20"},
  subjects:[
   {id:"chinese",name:"國語"},{id:"math",name:"數學"},{id:"english",name:"英文"},{id:"science",name:"自然"}
  ],
  schedule:[
   {subjectId:"chinese",weekday:1,minutes:40},{subjectId:"math",weekday:1,minutes:40},{subjectId:"english",weekday:2,minutes:40},
   {subjectId:"chinese",weekday:3,minutes:40},{subjectId:"math",weekday:3,minutes:40},{subjectId:"science",weekday:4,minutes:40},
   {subjectId:"chinese",weekday:5,minutes:40},{subjectId:"math",weekday:5,minutes:40}
  ],
  events:[
   {id:"midterm1",date:"2026-11-05",type:"midterm",name:"期中考 Day 1"},
   {id:"midterm2",date:"2026-11-06",type:"midterm",name:"期中考 Day 2"},
   {id:"final1",date:"2027-01-13",type:"final",name:"期末考 Day 1"},
   {id:"final2",date:"2027-01-14",type:"final",name:"期末考 Day 2"}
  ],
  tasks:[
   {id:"task_math",name:"數學複習",category:"study",subjectId:"math",difficulty:"normal",taskType:"timer",standardMinutes:40,recurring:true,weekdays:[1,2,3,4,5],active:true,dailyLimit:1,rewardMode:"auto"},
   {id:"task_read",name:"閱讀",category:"extra_reading",subjectId:"chinese",difficulty:"normal",taskType:"simple",recurring:true,weekdays:[1,2,3,4,5],active:true,dailyLimit:1,rewardMode:"auto"},
   {id:"task_chore",name:"做家事",category:"chore",difficulty:"easy",taskType:"simple",recurring:true,weekdays:[1,2,3,4,5,6,0],active:true,dailyLimit:1,rewardMode:"auto"}
  ],
  occurrences:{},
  taskRecords:[],
  dailyBalanceSnapshots:{},
  examBossLocks:{},
  examEnergyTargets:{}
 };
}