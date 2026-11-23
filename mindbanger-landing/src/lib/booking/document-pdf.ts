import{portalText}from '@/lib/portal-text';
import{normalizeLocale,localeTag}from '@/lib/portal-locale';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export type CoachingDocument = {
 id:string;appointment_id:string;intent:string;number:string;kind:'invoice'|'credit';amount_cents:number;issued_at:string;
 pdf_base64:string|null;pdf_sha256:string|null;emailed_at:string|null;
 snapshot:{provider:{name:string;companyId:string;taxId:string;address:string;registration:string;email:string;phone:string;vatPayer:false};customer:{name:string;email:string;address:string};service:string;startsAt:string;endsAt:string;paidAt:string;appointmentId:string;intent:string;currency?:'eur'|'czk';locale?:'sk'|'cs'|'en';package?:{name:string;sessions:number;extras:string;creditMinutes?:number;validityMonths?:number}|null;serviceName?:string;originalNumber?:string};
};
const green=rgb(.14,.28,.24),muted=rgb(.38,.43,.40);
const date=(s:string,locale='sk')=>new Intl.DateTimeFormat(localeTag(normalizeLocale(locale)),{dateStyle:'medium',timeZone:'Europe/Bratislava'}).format(new Date(s));
const amount=(n:number,currency='eur',locale='sk')=>new Intl.NumberFormat(localeTag(normalizeLocale(locale)),{style:'currency',currency:currency==='czk'?'CZK':'EUR'}).format(n/100);
let fontBytes:Promise<Buffer>|undefined;
export async function documentPdf(d:CoachingDocument){
 const cs=d.snapshot.locale==='cs',currency=d.snapshot.currency||'eur',label=(sk:string,cz:string)=>portalText(cs?cz:sk,normalizeLocale(d.snapshot.locale));
 const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
 fontBytes??=readFile(path.join(process.cwd(),'assets/invoices/NotoSans.ttf'));
 const font=await pdf.embedFont(await fontBytes,{subset:true});
 pdf.setTitle(`${d.kind==='credit'?label('Opravný doklad','Opravný doklad'):label('Faktúra','Faktura')} ${d.number}`);pdf.setAuthor('Milkam s. r. o.');pdf.setCreationDate(new Date(d.issued_at));
 let page=pdf.addPage([595.28,841.89]),y=787;
 const text=(value:string,size=10,color=green)=>{
  const clean=portalText(value,normalizeLocale(d.snapshot.locale)).replace(/[\x00-\x1f\x7f]/g,' ');let line='';
  const write=(v:string)=>{if(y<55){page=pdf.addPage([595.28,841.89]);y=787;}page.drawText(v,{x:48,y,size,font,color});y-=size*1.65;};
  // Split long tokens too (email addresses, transaction identifiers).
  for(const ch of clean){if(font.widthOfTextAtSize(line+ch,size)>499){write(line);line='';}line+=ch;}if(line)write(line);
 };
 const gap=(n=12)=>{y-=n;};
 text('MINDBANGER',11,muted);gap(8);
 text(`${d.kind==='credit'?label('Opravný doklad','Opravný doklad'):label('Faktúra','Faktura')} ${d.number}`,24);text(d.kind==='credit'?label('Vrátenie platby za službu','Vrácení platby za službu'):label('Doklad o prijatí platby za službu','Doklad o přijetí platby za službu'),11,muted);gap(18);
 const s=d.snapshot,p=s.provider;
 text('DODÁVATEĽ',9,muted);text(p.name,13);text(p.address);text(`IČO: ${p.companyId}    DIČ: ${p.taxId}`);text('Dodávateľ nie je platiteľom DPH.');text(p.registration,9);text(`${p.email} | ${p.phone}`,9);gap(16);
 text('ODBERATEĽ',9,muted);text(s.customer.name,13);if(s.customer.address)text(s.customer.address);text(s.customer.email);gap(16);
 text(`${label('Dátum vystavenia','Datum vystavení')}: ${date(d.issued_at,s.locale)}`);text(`${label('Dátum prijatia platby','Datum přijetí platby')}: ${date(s.paidAt,s.locale)}`);
 if(s.originalNumber)text(`Oprava dokladu č. ${s.originalNumber}`);
 text('Spôsob úhrady: platobná karta cez Stripe');gap(20);
 if(y<160){page=pdf.addPage([595.28,841.89]);y=787;}
 page.drawLine({start:{x:48,y:y+14},end:{x:547,y:y+14},thickness:.7,color:muted});
 for(const [label,x] of [['POLOŽKA',48],['MNOŽSTVO',310],['SUMA',502]] as const)page.drawText(label,{x,y,size:9,font,color:muted});
 y-=25;const formattedAmount=amount(d.amount_cents,currency,s.locale);
 page.drawText(cs?'Koučink':'Coaching',{x:48,y,size:13,font,color:green});page.drawText('1',{x:330,y,size:13,font,color:green});page.drawText(formattedAmount,{x:547-font.widthOfTextAtSize(formattedAmount,13),y,size:13,font,color:green});y-=23;
 text(s.package?(s.package.creditMinutes?`${s.package.name} - ${s.package.creditMinutes/60} h ${label('rezervačného času; čerpanie po 30 min; dlhší rozsah po dohode; platnosť 12 mesiacov od úhrady','rezervačního času; čerpání po 30 min; dlhší rozsah po dohode; platnost 12 měsíců od zaplacení')}`:`${s.package.name} - ${s.package.sessions} sedení, každé 50 minút (60-minútový slot)`): `${s.serviceName||'Individuálny online coaching'} - ${Math.round((Date.parse(s.endsAt)-Date.parse(s.startsAt))/60000)} minút`,9,muted);if(s.package?.extras)text(s.package.extras,9,muted);gap(14);
 text(`${d.kind==='credit'?label('Vrátená suma','Vrácená částka'):label('Celkom uhradené','Celkem uhrazeno')}: ${amount(Math.abs(d.amount_cents),currency,s.locale)}`,17);
 text(`${label('Zostáva uhradiť','Zbývá uhradit')}: ${amount(0,currency,s.locale)}`,11);gap(15);
 const time=new Intl.DateTimeFormat(cs?'cs-CZ':'sk-SK',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Bratislava'}).format(new Date(s.startsAt));
 text(`Dohodnutý termín sedenia: ${time} (Europe/Bratislava)`,9,muted);
 text(d.kind==='credit'?'Tento doklad opravuje pôvodnú úhradu o uvedenú vrátenú sumu.':'Platba bola prijatá vopred. Tento doklad nie je ďalšou výzvou na zaplatenie.',9,muted);gap(18);
 text(`Rezervácia: ${s.appointmentId}`,8,muted);text(`Platba Stripe: ${s.intent}`,8,muted);text('Vystavil: Mindbanger pre Milkam s. r. o. (automaticky)',8,muted);
 return Buffer.from(await pdf.save());
}
