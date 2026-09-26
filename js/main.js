import { BabylonRenderer } from "./babylon-renderer.js";
import { BattleUI } from "./battle-ui.js";
import { CardHandUI } from "./card-hand-ui.js";
import { ShellUI } from "./shell-ui.js";

const CORE_LOAD_ORDER=[
  "terrain-database.js","environment-object-engine.js","map-database.js","hydrology-engine.js","mass-flow-engine.js","climate-engine.js","environment-resolver.js",
  "map-generator.js","conductivity-engine.js","environment-engine.js","stage-database.js","visual-database.js",
  "skill-database.js","equipment-database.js","character-database.js","card-database.js","monster-database.js",
  "monster-content.js","ophi-content.js","church-content.js","seraphina-content.js","pack-database.js","pack-engine.js",
  "deck-engine.js","deployment-engine.js","card-phase-engine.js","battle-log.js","battle-engine.js","effect-engine.js",
  "tactical-engine.js","vertical-mobility-engine.js","environment-contact-engine.js","unit-runtime-engine.js","battle-setup-engine.js","battle-presentation-controller.js",
  "tile-inspection-presentation.js","displacement-engine.js","collision-engine.js","fall-engine.js","trajectory-engine.js",
  "post-engagement-engine.js","battle-resolution.js","stage-engine.js","objective-engine.js",
  "battle-objective-controller.js","battle-core-capture-controller.js","battle-environment-controller.js",
  "encounter-reward-engine.js","death-lifecycle-engine.js","tactical-action-controller.js",
  "tactical-enemy-controller.js","card-phase-controller.js"
];

const bootStatus=document.getElementById("bootStatus"),canvas=document.getElementById("battleCanvas");
globalThis.turnStatus=document.getElementById("turnStatus");
globalThis.skillBar=document.getElementById("skillBar");
globalThis.resetMap=document.getElementById("resetMap");
globalThis.CardTacticsBattleSetup={stageId:"versus_core_battle",mapSize:"MEDIUM"};

for(let i=0;i<CORE_LOAD_ORDER.length;i++){
  const file=CORE_LOAD_ORDER[i];bootStatus.textContent=`載入戰鬥核心 ${i+1}/${CORE_LOAD_ORDER.length}｜${file}`;await import(`./${file}`);
}
bootStatus.textContent="啟動 Card Tactics Runtime...";
await import("./tactical-game.js");

const runtime=globalThis.CardTacticsRuntime;if(!runtime)throw new Error("CardTacticsRuntime failed to initialize.");
const renderer=new BabylonRenderer(canvas,runtime.getBattleSnapshot(),{onTilePicked:(x,y)=>runtime.clickBattleTile(x,y)});
globalThis.CardTacticsRenderer=renderer;

const battleUI=new BattleUI();battleUI.bind(runtime,renderer);
const cardUI=new CardHandUI();cardUI.bind(runtime);
const shell=new ShellUI(runtime,renderer);shell.bind();

await import("./diagnostics.js");

function sync(){const snap=runtime.getBattleSnapshot();renderer.sync(snap);battleUI.render()}
window.addEventListener("cardtactics:battle-render",sync);
window.addEventListener("cardtactics:state",sync);
window.addEventListener("cardtactics:battle-screen-enter",()=>{renderer.resize();sync()});
sync();
