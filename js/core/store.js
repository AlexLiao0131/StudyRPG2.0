import {defaultState} from "./default-state.js";
const KEY="StudyRPG_2_STATE";
let state=load();
const listeners=new Set();
function load(){try{const x=JSON.parse(localStorage.getItem(KEY)||"null");return x?.version===2?x:defaultState();}catch{return defaultState();}}
export const Store={
 get:()=>state,
 update(mutator){mutator(state);localStorage.setItem(KEY,JSON.stringify(state));listeners.forEach(fn=>fn(state));},
 subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)},
 reset(){state=defaultState();localStorage.setItem(KEY,JSON.stringify(state));listeners.forEach(fn=>fn(state));}
};