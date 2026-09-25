export const VISUAL_CONFIG=Object.freeze({
  deviceRules:{mobileMax:600,tabletMax:1024},
  groundByWeek:{
    1:{desktop:{dungeon:85,status:84},mobile:{dungeon:84,status:88.5,dungeonEntry:95},tablet:{status:85,dungeonEntry:75,dungeon:85}},
    2:{tablet:{dungeonEntry:88.5,dungeon:84,status:79.5},mobile:{dungeonEntry:95,dungeon:79.5,status:82.5},desktop:{status:79,dungeonEntry:81}},
    3:{desktop:{dungeon:93.5,status:93.5},tablet:{status:95,dungeon:95}},
    4:{tablet:{dungeon:81}}
  },
  devices:{
    desktop:{status:{groundY:66,hero:{x:46.6,groundScene:'status',footOffsetY:-1.9},heroSize:160},dungeonEntry:{groundY:63,hero:{x:50,groundScene:'dungeonEntry',footOffsetY:0},enemy:{x:50,groundScene:'dungeonEntry',footOffsetY:0},heroSize:180,enemySize:180},battle:{groundY:68,hero:{x:18,groundScene:'battle',footOffsetY:0},enemy:{x:82,groundScene:'battle',footOffsetY:0},heroSize:190,enemySize:190}},
    tablet:{status:{groundY:87.5,hero:{x:49,groundScene:'status',footOffsetY:-5.2},heroSize:150},dungeonEntry:{groundY:86.5,hero:{x:48.4,groundScene:'dungeonEntry',footOffsetY:-1},enemy:{x:40.7,groundScene:'dungeonEntry',footOffsetY:-2.4},heroSize:165,enemySize:165},battle:{groundY:68,hero:{x:17,groundScene:'battle',footOffsetY:-3.5},enemy:{x:78.4,groundScene:'battle',footOffsetY:0},heroSize:175,enemySize:175}},
    mobile:{status:{groundY:88.5,hero:{x:49,groundScene:'status',footOffsetY:-3.3},heroSize:135},dungeonEntry:{groundY:95,hero:{x:47.5,groundScene:'dungeonEntry',footOffsetY:-25},enemy:{x:26.8,groundScene:'dungeonEntry',footOffsetY:-32.6},heroSize:135,enemySize:135},battle:{groundY:65,hero:{x:18,groundScene:'battle',footOffsetY:0},enemy:{x:70.5,groundScene:'battle',footOffsetY:.7},heroSize:145,enemySize:145}}
  },
  stage:{desktop:{bg:{x:50,y:50,scale:1}},tablet:{bg:{x:50,y:50,scale:1}},mobile:{bg:{x:50,y:50,scale:1}}}
});
