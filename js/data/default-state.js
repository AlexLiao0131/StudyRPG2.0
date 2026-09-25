import { APP_CONFIG } from './app-config.js';

const uid=()=>`id_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

function defaultGame(){
  return {
    hero:{
      name:'勇者',gender:'male',heroClass:'見習勇者',jobAwakened:false,
      level:1,exp:0,maxExp:100,gold:0,lotteryCoins:0,virtue:0,
      stats:{str:10,agi:10,int:10,will:10},jobScores:{},
      knownSkills:[],skills:[],equippedSkills:[],jobPassive:'',
      skillUsage:{},skillUsageByDate:{},jobCandidateHistory:[],
      pendingGoldDebt:0,lastStatGains:{},equipment:{weapon:null,head:null,body:null,accessory:null}
    },
    semester:{startDate:'2026-08-31',endDate:'2027-01-20',schoolWeekdays:[1,2,3,4,5],worldState:'normal'},
    tasks:[
      {id:'task_chinese',name:'國語複習',category:'study',difficulty:'normal',taskType:'timer',rewardMode:'auto',courseId:'chinese',subject:'國語',recurring:true,weekdays:[1,2,3,4,5],active:true,archived:false,activeFrom:'2026-08-31',activeUntil:'',timerMode:'deadline',standardMinutes:40,fastMinutes:25,goldReward:2,expReward:10,dailyLimit:1,cancelledDates:[]},
      {id:'task_math',name:'數學複習',category:'study',difficulty:'normal',taskType:'timer',rewardMode:'auto',courseId:'math',subject:'數學',recurring:true,weekdays:[1,2,3,4,5],active:true,archived:false,activeFrom:'2026-08-31',activeUntil:'',timerMode:'deadline',standardMinutes:40,fastMinutes:25,goldReward:2,expReward:10,dailyLimit:1,cancelledDates:[]}
    ],
    taskRecords:[],activeTasks:{},learningProgress:[],
    inventory:[],inventoryTombstones:{},shopItems:[],lotteryPool:[],lotteryCoinLedger:{},assetAudit:{},couponRequests:[],battleRecords:[],gmAudit:[],semesterArchives:[],campaignProgress:{phaseHistory:{}},
    social:{friends:[],inbox:[]},
    settings:{parentPinHash:'',cloud:{},familyAccess:{enabled:true},holidayTower:{dailyLimit:3}},
    dailyBalance:null,
    examBossBaseline:{date:'2026-08-31',nakedPower:40,createdAt:'2026-08-31T00:00:00.000Z'},
    examCompletionTargets:{}
  };
}

export function createDefaultState(){
  const game=defaultGame();
  return {
    schemaVersion:APP_CONFIG.schemaVersion,
    source:'2.0-default',
    importedAt:'',
    family:{
      activeProfileId:'hero_1',
      profiles:[{id:'hero_1',label:'勇者',data:game}],
      examSubjects:[{id:'chinese',name:'國語'},{id:'english',name:'英語'},{id:'math',name:'數學'}],
      schoolTimetable:[
        {id:uid(),weekday:1,subjectId:'chinese',minutes:40},{id:uid(),weekday:2,subjectId:'math',minutes:40},{id:uid(),weekday:3,subjectId:'english',minutes:40},
        {id:uid(),weekday:4,subjectId:'chinese',minutes:40},{id:uid(),weekday:5,subjectId:'math',minutes:40}
      ],
      adventureCalendar:[
        {id:'start',date:'2026-08-31',type:'semester_start',name:'第一學期冒險開始',allDay:true,startTime:'',endTime:'',note:'',reminderMinutes:0,targetType:'all',targetProfileIds:[],requireComplete:false,completedBy:{}},
        {id:'mid1',date:'2026-11-05',type:'midterm',name:'第一次定期評量 Day 1',examSubjectIds:['chinese','english','math'],allDay:true,startTime:'',endTime:'',note:'',reminderMinutes:0,targetType:'all',targetProfileIds:[],requireComplete:false,completedBy:{}},
        {id:'mid2',date:'2026-11-06',type:'midterm',name:'第一次定期評量 Day 2',examSubjectIds:['chinese','english','math'],allDay:true,startTime:'',endTime:'',note:'',reminderMinutes:0,targetType:'all',targetProfileIds:[],requireComplete:false,completedBy:{}},
        {id:'final1',date:'2027-01-13',type:'final',name:'期末評量 Day 1',examSubjectIds:['chinese','english','math'],allDay:true,startTime:'',endTime:'',note:'',reminderMinutes:0,targetType:'all',targetProfileIds:[],requireComplete:false,completedBy:{}},
        {id:'final2',date:'2027-01-14',type:'final',name:'期末評量 Day 2',examSubjectIds:['chinese','english','math'],allDay:true,startTime:'',endTime:'',note:'',reminderMinutes:0,targetType:'all',targetProfileIds:[],requireComplete:false,completedBy:{}},
        {id:'end',date:'2027-01-20',type:'semester_end',name:'第一學期結算',allDay:true,startTime:'',endTime:'',note:'',reminderMinutes:0,targetType:'all',targetProfileIds:[],requireComplete:false,completedBy:{}}
      ]
    }
  };
}
