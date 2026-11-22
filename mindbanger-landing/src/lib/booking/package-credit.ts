export const COACHING_CREDIT_SERVICES = ['rychly-rozhovor','individualny-coaching','premiovy-mentalny-koucing','vypni-hlavu','zvladaj-stres','znovu-si-ver','teenager-pod-tlakom','mentalny-trening','opora-pocas-liecby'];
type Service = {id:string;minutes:number};
export type CreditBalance = {service_id:string;state:string;remaining:number;total_minutes?:number|null;expires_at?:string|null;remaining_minutes?:number|null};
export function creditMinutes(service:Service){return service.minutes===25?30:service.minutes+10;}
export function creditTime(minutes:number){const h=Math.floor(minutes/60),m=minutes%60;return [h?`${h} h`:'',m?`${m} min`:''].filter(Boolean).join(' ')||'0 h';}
export function packageFits(pack:{serviceId:string;creditMinutes?:number},service:Service){return pack.creditMinutes!==undefined?COACHING_CREDIT_SERVICES.includes(service.id)&&pack.creditMinutes>=creditMinutes(service):pack.serviceId===service.id;}
export function canUseCredit(pack:CreditBalance,service:Service,now=Date.now()){
 if(pack.state!=='active')return false;
 if(pack.total_minutes!=null)return COACHING_CREDIT_SERVICES.includes(service.id)&&!!pack.expires_at&&Date.parse(pack.expires_at)>now&&(pack.remaining_minutes??0)>=creditMinutes(service);
 return pack.service_id===service.id&&pack.remaining>0;
}
export function packageBalance(pack:{state:string;total:number;total_minutes?:number|null;expires_at?:string|null},rows:{state:string;credit_minutes?:number|null}[],now=Date.now()){
 const used=rows.filter(r=>r.state==='used'),reserved=rows.filter(r=>r.state==='reserved'),review=rows.filter(r=>r.state==='review');
 const sum=(items:typeof rows)=>items.reduce((n,r)=>n+(r.credit_minutes??0),0),used_minutes=sum(used),reserved_minutes=sum(reserved),review_minutes=sum(review);
 const expired=pack.total_minutes!=null&&(!pack.expires_at||Date.parse(pack.expires_at)<=now);
 return {used:used.length,reserved:reserved.length,review:review.length,remaining:pack.state==='active'?Math.max(0,pack.total-used.length-reserved.length-review.length):0,used_minutes,reserved_minutes,review_minutes,remaining_minutes:pack.total_minutes==null?null:pack.state==='active'&&!expired?Math.max(0,pack.total_minutes-used_minutes-reserved_minutes-review_minutes):0,expired};
}
