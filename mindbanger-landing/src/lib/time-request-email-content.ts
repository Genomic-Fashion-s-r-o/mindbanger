import {portalHtml,portalText}from '@/lib/portal-text';
function timeRequestEmailBase(audience:'client'|'owner',locale:'sk'|'cs'|'en'='sk') {
  const owner=audience==='owner',cs=!owner&&locale==='cs';
  const subject=owner?'Nová požiadavka na individuálny termín | Mindbanger':cs?'Tvůj požadavek na termín jsme přijali | Mindbanger':'Tvoju požiadavku na termín sme prijali | Mindbanger';
  const paragraphs=owner?[
    'Na Mindbangeri pribudla nová požiadavka od človeka, ktorý nenašiel vhodný voľný termín.',
    'Kontaktné údaje a časové možnosti nájdeš v zabezpečenom admine. Ozvi sa klientovi osobne a skúste nájsť vhodný termín.',
    'Požiadavka sama nevytvára rezerváciu ani platbu.',
  ]:cs?[
    'Ahoj, děkuji za tvůj zájem o online setkání. Tvůj požadavek na vhodný termín jsme v pořádku přijali.',
    'Podívám se na tvé časové možnosti a ozvu se ti osobně na uvedený e-mail nebo telefon. Společně zkusíme najít termín, který ti bude vyhovovat.',
    'Zatím nejde o potvrzenou rezervaci a nic neplatíš. Termín si nejprve domluvíme.',
    'Pokud chceš své časové možnosti doplnit, stačí odpovědět na tento e-mail.',
    'Těším se na naše setkání.',
  ]:[
    'Ahoj, ďakujem za tvoj záujem o online stretnutie. Tvoju požiadavku na vhodný termín sme v poriadku prijali.',
    'Pozriem sa na tvoje časové možnosti a ozvem sa ti osobne na uvedený email alebo telefón. Spoločne skúsime nájsť termín, ktorý ti bude vyhovovať.',
    'Zatiaľ nejde o potvrdenú rezerváciu a nič neplatíš. Termín si najprv dohodneme.',
    'Ak chceš svoje časové možnosti doplniť, stačí odpovedať na tento email.',
    'Teším sa na naše stretnutie.',
  ];
  const url='https://www.mindbanger.com/mindbanger_daily/admin/poziadavky-na-termin';
  const text=[...paragraphs,...(owner?[url]:['Mgr. Miroslav Jobus','Mindbanger'])].join('\n\n');
  // Deliberately no contact details, service names or free-text notes in email.
  const html=`<!doctype html><html lang="${cs?'cs':'sk'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f7f6ef;color:#23483e;font-family:Arial,sans-serif"><div style="max-width:580px;margin:0 auto;padding:32px 24px;background:#fff"><p style="font-size:14px;letter-spacing:2px">MINDBANGER</p><h1 style="font-size:26px;line-height:1.3">${owner?'Nová požiadavka na termín':cs?'Děkuji, požadavek dorazil.':'Ďakujem, požiadavka dorazila.'}</h1>${paragraphs.map(p=>`<p style="font-size:17px;line-height:1.65">${p}</p>`).join('')}${owner?`<p style="margin:30px 0"><a href="${url}" style="display:inline-block;background:#23483e;color:#fff;padding:15px 22px;text-decoration:none;border-radius:4px;font-weight:bold">Otvoriť požiadavky v admine ↗</a></p>`:'<p style="font-size:17px;line-height:1.65">Mgr. Miroslav Jobus<br>Mindbanger</p>'}</div></body></html>`;
  return {subject,text,html};
}

export function timeRequestEmail(audience:'client'|'owner',locale:'sk'|'cs'|'en'='sk'){const r=timeRequestEmailBase(audience,locale);return audience==='owner'?r:{subject:portalText(r.subject,locale),text:r.text.split('\n').map(s=>portalText(s,locale)).join('\n'),html:portalHtml(r.html,locale)};}
