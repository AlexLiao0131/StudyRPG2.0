import { getActiveProfile, getGame, update } from '../core/store.js';

let unlockedProfileId='';
async function hash(text){const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(text||'')));return[...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('')}
function profileId(){return String(getActiveProfile()?.id||'')}
export function hasParentPin(){return !!getGame().settings?.parentPinHash}
export function isParentUnlocked(){return !!unlockedProfileId&&unlockedProfileId===profileId()}
export async function setParentPin(pin,confirmPin){pin=String(pin||'').trim();if(pin.length<4)return{ok:false,message:'家長密碼至少 4 位。'};if(pin!==String(confirmPin||'').trim())return{ok:false,message:'兩次輸入的密碼不同。'};const h=await hash(pin);update(()=>{getGame().settings=getGame().settings||{cloud:{}};getGame().settings.parentPinHash=h});unlockedProfileId=profileId();return{ok:true,message:'家長密碼已設定。'}}
export async function unlockParent(pin){const wanted=getGame().settings?.parentPinHash;if(!wanted)return{ok:false,message:'尚未設定家長密碼。'};if(await hash(String(pin||'').trim())!==wanted)return{ok:false,message:'密碼錯誤。'};unlockedProfileId=profileId();return{ok:true,message:'已解鎖。'}}
export function lockParent(){unlockedProfileId=''}
export async function changeParentPin(oldPin,newPin,confirmPin){if(await hash(String(oldPin||'').trim())!==getGame().settings?.parentPinHash)return{ok:false,message:'目前密碼錯誤。'};newPin=String(newPin||'').trim();if(newPin.length<4)return{ok:false,message:'新密碼至少 4 位。'};if(newPin!==String(confirmPin||'').trim())return{ok:false,message:'兩次輸入的新密碼不同。'};const h=await hash(newPin);update(()=>getGame().settings.parentPinHash=h);return{ok:true,message:'家長密碼已修改。'}}
