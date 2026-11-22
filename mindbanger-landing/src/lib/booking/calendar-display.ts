export function calendarAddDays(date:string,n:number){const d=new Date(date+'T12:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
export function calendarMonday(date:string){return calendarAddDays(date,-((new Date(date+'T12:00Z').getUTCDay()+6)%7));}
export type CalendarDayAvailability={slots:string[];occupiedSlots:string[]};
// Starts are alternative choices, not independent capacity. Merge their full
// reservation windows so a half-hour stagger never double-counts the same time.
export function availableCalendarHours(starts:string[],slotMinutes:number){
 const sorted=[...new Set(starts)].map(Date.parse).filter(Number.isFinite).sort((a,b)=>a-b);
 if(!Number.isFinite(slotMinutes)||slotMinutes<=0)return 0;
 let total=0,start=0,end=0;
 for(const t of sorted){const until=t+slotMinutes*60000;if(t>end){total+=end-start;start=t;end=until;}else end=Math.max(end,until);}
 return (total+end-start)/3600000;
}
export async function openingCalendarWeek({week,today,horizonDays,search,loadDay,signal}:{week:string;today:string;horizonDays:number;search:boolean;loadDay:(day:string)=>Promise<CalendarDayAvailability>;signal:AbortSignal}){
 const last=calendarAddDays(today,horizonDays);
 async function load(start:string){
  signal.throwIfAborted();
  const rows=await Promise.all(Array.from({length:7},(_,i)=>calendarAddDays(start,i)).map(async day=>[day,day<today||day>last?{slots:[],occupiedSlots:[]}:await loadDay(day)] as const));
  signal.throwIfAborted();
  return {week:start,rows};
 }
 const initial=await load(week);let result=initial;
 while(search&&!result.rows.some(([,d])=>d.slots.length||d.occupiedSlots.length)&&calendarAddDays(result.week,7)<=last){result=await load(calendarAddDays(result.week,7));}
 // If the entire booking horizon is empty, keep the visitor near today.
 return result.rows.some(([,d])=>d.slots.length||d.occupiedSlots.length)?result:initial;
}
