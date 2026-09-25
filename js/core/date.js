export function localDateString(date=new Date()){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function localTimeString(date=new Date()){
  return date.toLocaleTimeString('zh-TW',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'});
}
export function parseLocalDate(value){ return new Date(`${value}T12:00:00`); }
export function daysBetween(a,b){ return Math.floor((parseLocalDate(b)-parseLocalDate(a))/86400000); }
export function weekdayNumber(value){ return parseLocalDate(value).getDay(); }
