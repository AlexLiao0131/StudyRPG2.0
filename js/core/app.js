import {ThreeBattleRenderer} from "../battle/three-renderer.js";
import {Store} from "./store.js";
import {render} from "../ui/render.js";
function show(name){document.querySelectorAll(".view").forEach(x=>x.classList.toggle("active",x.id===`view-${name}`));document.querySelectorAll(".nav button").forEach(x=>x.classList.toggle("active",x.dataset.view===name));}
document.querySelectorAll(".nav button").forEach(b=>b.addEventListener("click",()=>show(b.dataset.view)));
Store.subscribe(s=>render(s,Store));
render(Store.get(),Store);

let threeDemo=null;
function initThree(){if(threeDemo)return;const host=document.querySelector("#threeStage"),debug=document.querySelector("#threeDebug");if(!host)return;threeDemo=new ThreeBattleRenderer(host,debug);document.querySelector("#threeAttack").onclick=()=>threeDemo.attack();document.querySelector("#threeCast").onclick=()=>threeDemo.cast();document.querySelector("#threeSummon").onclick=()=>threeDemo.summon();document.querySelector("#threeReset").onclick=()=>threeDemo.reset()}
document.querySelector('[data-view="renderer"]')?.addEventListener("click",()=>requestAnimationFrame(initThree));
