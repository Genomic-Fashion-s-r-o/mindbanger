'use client';
import {useState} from 'react';
import {QuestionnaireFields} from '@/components/client/QuestionnaireFields';
import {questionnaireLibrary} from '@/lib/coaching-service-questionnaires';
import {isParentForm,isTeenForm,type CardContent} from '@/lib/coaching-cards-model';

function labelFor(key:string,label:string,content:CardContent){
  if(key.startsWith('service:'))return key==='service:teenager-pod-tlakom'?'Teenager pod tlakom – vstupný dotazník pre rodiča (online)':'Vstupný dotazník – '+label+' (online)';
  if(key==='intake')return 'Všeobecný vstupný dotazník pre dospelého (online)';
  if(key==='guardian')return 'Súhlas zákonného zástupcu – teenage koučing';
  if(key==='parent-intake')return 'Vstupný dotazník pre rodiča teenagera (online)';
  if(key==='teen-intake')return 'Vstupný dotazník pre teenagera (súkromný online formulár)';
  if(key==='progress')return 'Priebežný dotazník pre dospelého – medzi stretnutiami';
  if(key==='teen-progress')return 'Priebežný dotazník pre teenagera – medzi stretnutiami';
  return content.title+' (online)';
}
export function QuestionnairePreview({content}:{content:CardContent}){
  const parent=isParentForm(content.formType);
  return <section className="cards-questionnaire-preview" aria-label="Náhľad online dotazníka">
    <h3>{content.title}</h3><p className="cards-text">{content.text}</p>
    <p className="cards-muted">Náhľad formulára pre klienta. Polia sú tu iba na čítanie; žiadne odpovede ani súhlasy sa neukladajú.</p>
    <fieldset disabled className="cards-preview-fields"><legend>Obsah formulára</legend>
      {content.answerMode==='acknowledgements'?<div className="questionnaire-section"><h4>Jednotlivé súhlasy</h4>{content.questions.map((q,i)=><label className="cards-check" key={i}><input type="checkbox"/><span>{q}</span></label>)}</div>:
      <QuestionnaireFields content={content} answers={[]} onChange={()=>{}} sensitiveAllowed basic={<><label>{parent?'Meno zákonného zástupcu':'Meno a priezvisko'}<input placeholder="Vyplní klient"/></label>{parent&&<><label>Meno teenagera<input placeholder="Vyplní zákonný zástupca"/></label><label>Vek teenagera<input type="number" placeholder="Od 13 do dovŕšenia 18 rokov"/></label></>}{!isTeenForm(content.formType)&&<p className="questionnaire-help">Email klienta sa overuje pri prihlásení.</p>}</>}
        sensitiveConsent={<aside className="cards-notice"><strong>Nepovinné citlivé otázky</strong><p>Klient ich môže nechať na osobný rozhovor. Vo vlastnom formulári ich otvorí až osobitným výslovným súhlasom. Tu sú zobrazené iba na kontrolu znenia.</p><label className="cards-check"><input type="checkbox"/><span>Samostatný výslovný súhlas klienta so spracovaním dobrovoľných citlivých odpovedí.</span></label></aside>}/>}
      {parent&&<p className="cards-notice">Formulár obsahuje aj nepovinné povolenie priamej komunikácie s teenagerom. Jeho samostatné odpovede zostávajú iba koučovi.</p>}
    </fieldset>
  </section>;
}
export default function QuestionnaireTemplatePicker({serviceId,busy,onPrepare}:{serviceId?:string;busy:boolean;onPrepare:(content:CardContent)=>void}){
  const initial=questionnaireLibrary.find(t=>t.key==='service:'+serviceId)?.key||'intake';
  const [key,setKey]=useState(initial);
  const selected=questionnaireLibrary.find(t=>t.key===key)!;
  return <section className="cards-panel cards-questionnaire-picker"><h2>Vyber a prezri online dotazník</h2>
    <p>Vyber formulár, skontroluj jeho otázky a možnosti nižšie a potom priprav zaslanie klientovi.</p>
    <label>Dotazník na zaslanie<select value={key} disabled={busy} onChange={e=>setKey(e.target.value)}>
      <optgroup label="Vstupné dotazníky podľa služby">{questionnaireLibrary.filter(t=>t.key.startsWith('service:')).map(t=><option key={t.key} value={t.key}>{labelFor(t.key,t.label,t.content)}</option>)}</optgroup>
      <optgroup label="Všeobecné dotazníky a rodičovský súhlas">{questionnaireLibrary.filter(t=>t.key!=='custom'&&!t.key.includes(':')).map(t=><option key={t.key} value={t.key}>{labelFor(t.key,t.label,t.content)}</option>)}</optgroup>
      <optgroup label="Ďalšie tematické dotazníky">{questionnaireLibrary.filter(t=>t.key.startsWith('source:')).map(t=><option key={t.key} value={t.key}>{labelFor(t.key,t.label,t.content)}</option>)}</optgroup>
    </select></label>
    <QuestionnairePreview content={selected.content}/>
    <div className="cards-questionnaire-send"><p>{isTeenForm(selected.content.formType)?'Najprv skontroluješ email a rodičom povolený kontakt teenagera. Odpovede sa rodičovi nezobrazia.':'Najprv skontroluješ adresáta a text emailu. Samotný výber formulára nič neodosiela.'}</p><button className="cards-primary" disabled={busy} onClick={()=>onPrepare(selected.content)}>Zaslať vybraný dotazník…</button></div>
  </section>;
}
