export function upcomingEvents(state,date){return state.events.filter(e=>e.date>=date).sort((a,b)=>a.date.localeCompare(b.date));}
export function examEvents(state){return state.events.filter(e=>e.type==="midterm"||e.type==="final").sort((a,b)=>a.date.localeCompare(b.date));}
