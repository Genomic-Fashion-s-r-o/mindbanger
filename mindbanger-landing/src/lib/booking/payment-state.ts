import type { Appointment } from './model';
export function paymentStateLabel(a:Pick<Appointment,'paid'|'payment_review'|'payment_flow'|'payment_state'|'funding_type'>){
 if(a.funding_type==='manual')return 'Dohodnuté individuálne · bez Stripe';
 if(a.funding_type==='package'&&!a.payment_review)return 'Uhradené zo zakúpeného balíčka';
 if(a.payment_review)return 'Vyžaduje osobné preverenie / vysporiadanie';
 if(a.paid)return 'Zaplatené · overené cez Stripe';
 if(a.payment_flow!=='authorize_confirm')return 'Zatiaľ neuhradené';
 return ({awaiting_checkout:'Čaká na zadanie karty',authorized:'Suma zablokovaná na karte · čaká na potvrdenie',capturing:'Strhnutie platby sa overuje',captured:'Platba bola vysporiadaná',cancelling:'Uvoľňujeme blokáciu sumy',released:'Blokácia sumy bola zrušená'} as const)[a.payment_state||'awaiting_checkout'];
}
