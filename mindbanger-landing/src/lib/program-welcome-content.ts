import {escapeEmail, type ProgramEmail} from './program-email-content';

export const programWelcome: ProgramEmail = {
  subject: 'Vitaj! Prvý krok k menšej chuti na sladké máš za sebou 🍬',
  body: 'Ahoj,\n\nďakujem, že si prejavil/a záujem o pripravovaný novembrový program Chuť na sladké pod kontrolou. Tvoju nezáväznú registráciu sme úspešne prijali a teším sa, že budeš pri tom.\n\nIde o približne 10-dňový online skupinový program. Program pripravujem pre ľudí, ktorí chcú lepšie porozumieť svojej chuti na sladké a postupne meniť návyky — bez zbytočného tlaku a výčitiek. Verím, že spoločné objavovanie bude nielen užitočné, ale aj zábavné.\n\nČoskoro sa ti ozveme s podrobnosťami k programu, jeho priebehu, termínu a možnostiam účasti. Zatiaľ nemusíš nič ďalšie robiť.\n\nTáto registrácia je nezáväzná. Nič si si neobjednal/a a nevzniká ti žiadna povinnosť platiť.\n\nAk máš medzitým otázku, pokojne odpovedz na tento email.\n\nTeším sa na spoločný začiatok!\n\nMgr. Miroslav Jobus\nMindbanger',
  buttonText: '',
  buttonUrl: '',
};

export function renderWelcomeEmail(unsubscribe: string) {
  const privacy = 'https://www.mindbanger.com/ochrana-udajov#program-zaujem';
  const paragraphs = programWelcome.body.split(/\n\s*\n/).map(paragraph =>
    '<p style="margin:0 0 20px">' + escapeEmail(paragraph).replaceAll('\n', '<br>') + '</p>'
  ).join('').replace('Mgr. Miroslav Jobus<br>Mindbanger', '<strong>Mgr. Miroslav Jobus</strong><br>Mindbanger');
  return {
    subject: programWelcome.subject,
    text: programWelcome.body + '\n\nOdhlásiť sa a odstrániť email: ' + unsubscribe +
      '\nPrevádzkovateľ programu: Genomic Fashion s.r.o.\nOchrana údajov: ' + privacy,
    html: `<!doctype html><html lang="sk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f6f5ef;padding:24px;color:#25473d;font-family:Arial,sans-serif;font-size:16px;line-height:1.75"><div style="max-width:600px;margin:auto;background:#fffefa;padding:28px;border-radius:8px"><p style="font-size:12px;letter-spacing:2px;margin:0 0 20px">MINDBANGER</p><h1 style="font-family:Georgia,serif;font-size:30px;line-height:1.25;margin:0 0 24px">${escapeEmail(programWelcome.subject)}</h1>${paragraphs}<hr style="border:0;border-top:1px solid #c7d1bc;margin:28px 0"><p style="font-size:12px;color:#4d6258;margin:0">Túto správu dostávaš po registrácii záujmu o program.<br><a style="color:#25473d" href="${escapeEmail(unsubscribe)}">Odhlásiť sa a odstrániť email</a><br>Prevádzkovateľ programu: Genomic Fashion s.r.o. · <a style="color:#25473d" href="${privacy}">Ochrana údajov</a></p></div></body></html>`,
  };
}
