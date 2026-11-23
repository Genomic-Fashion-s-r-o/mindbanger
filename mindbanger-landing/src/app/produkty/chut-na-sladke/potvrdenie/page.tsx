import type {Metadata} from 'next';
import Link from 'next/link';
import {PersonalShell} from '@/components/personal/PersonalShell';
import {getLocalizedBookingSettings} from '@/lib/booking/store';
import {interestTokenValid} from '@/lib/program-interest';
import {localizedPath} from '@/lib/site-locale';
import {siteLocale} from '@/lib/site-locale-server';
import '../sugar-program.css';

export const dynamic='force-dynamic';
export async function generateMetadata():Promise<Metadata>{const cs=(await siteLocale())==='cs';return {title:cs?'Potvrzení zájmu | Mindbanger':'Potvrdenie záujmu | Mindbanger',robots:{index:false,follow:false},referrer:'no-referrer'};}

export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const [params,{settings,locale}]=await Promise.all([searchParams,getLocalizedBookingSettings()]),cs=locale==='cs',c=(sk:string,cz:string)=>cs?cz:sk,p=(path:string)=>localizedPath(path,locale),leave=interestTokenValid(params.odhlasit),token=leave?params.odhlasit:params.token,valid=interestTokenValid(token),state=params.stav;
 const title=state==='potvrdene'?c('Tvoj záujem je potvrdený.','Tvůj zájem je potvrzený.'):state==='odhlasene'?c('Záujem je zrušený.','Zájem je zrušený.'):leave?c('Chceš zrušiť svoj záujem?','Chceš zrušit svůj zájem?'):valid?c('Ešte jeden malý krok.','Ještě jeden malý krok.'):c('Odkaz už nemusí byť platný.','Odkaz už nemusí být platný.');
 const body=state==='potvrdene'?c('Si v zozname záujemcov o prvý, približne 10-dňový turnus v novembri 2026. Podrobnosti dostaneš emailom pred otvorením prihlášok. Teraz nič neplatíš a nejde o záväznú rezerváciu miesta.','Jsi v seznamu zájemců o první, přibližně 10denní běh v listopadu 2026. Podrobnosti dostaneš e-mailem před otevřením přihlášek. Nyní nic neplatíš a nejde o závaznou rezervaci místa.'):state==='odhlasene'?c('Email sme odstránili zo zoznamu tohto programu.','E-mail jsme odstranili ze seznamu tohoto programu.'):leave?c('Potvrdením odstránime tvoj email zo zoznamu záujemcov o tento program.','Potvrzením odstraníme tvůj e-mail ze seznamu zájemců o tento program.'):valid?c('Potvrď, že chceš dostávať informácie o pripravovanom prvom turnuse.','Potvrď, že chceš dostávat informace o připravovaném prvním běhu.'):c('Vráť sa na stránku programu a vyžiadaj si nový potvrdzovací email.','Vrať se na stránku programu a vyžádej si nový potvrzovací e-mail.');
 return <PersonalShell settings={settings}><main id="obsah" className="sugar-program"><section className="sugar-confirm"><p className="personal-eyebrow">CHUŤ NA SLADKÉ POD KONTROLOU</p><h1>{title}</h1><p>{body}</p>{valid&&!state&&<form method="post" action="/api/program-interest/confirm"><input type="hidden" name="token" value={String(token)}/><input type="hidden" name="action" value={leave?'unsubscribe':'confirm'}/><input type="hidden" name="locale" value={locale}/><button className="personal-button">{leave?c('Zrušiť záujem a odstrániť email','Zrušit zájem a odstranit e-mail'):c('Potvrdiť môj záujem ↗','Potvrdit můj zájem ↗')}</button></form>}<Link className="personal-text-link" href={p('/produkty/chut-na-sladke')}>{c('Späť na program ↗','Zpět na program ↗')}</Link></section></main></PersonalShell>;
}
