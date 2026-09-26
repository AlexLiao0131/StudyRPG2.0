export const TERRAINS={
  PLAIN:{name:"平地",moveCost:1,passable:true,evasion:0,environment:"NONE"},
  MUD:{name:"泥濘",moveCost:2,passable:true,evasion:-5,environment:"NONE"},
  SAND:{name:"沙地",moveCost:2,passable:true,evasion:-2,environment:"NONE",erosionSusceptibility:1.35,infiltration:1.35},
  FOREST:{name:"森林",moveCost:2,passable:true,evasion:10,environment:"GRASS"},
  HIGH_GROUND:{name:"高地",moveCost:1,passable:true,evasion:0,rangedAccuracy:10,environment:"STONE"},
  WATER:{name:"水域",moveCost:3,passable:true,evasion:0,environment:"WATER"},
  WALL:{name:"障礙",moveCost:999,passable:false,evasion:0,environment:"STONE"}
};
globalThis.TERRAINS=TERRAINS;
