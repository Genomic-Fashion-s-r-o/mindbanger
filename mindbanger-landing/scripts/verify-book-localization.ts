import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { bookLanguages, bookPath, mainHomePath } from '../src/lib/readers/book-languages';
import { bookText } from '../src/lib/readers/book-text';
import { readerText } from '../src/lib/readers/locale';
const origin=process.env.BOOK_I18N_ORIGIN||'http://localhost:3053';assert.ok(['http://localhost:3053','https://www.mindbanger.com'].includes(origin));
const local=origin.startsWith('http:'),checks:{name:string;status?:number}[]=[];
const decode=(html:string)=>html.replace(/&#x27;|&#39;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
async function request(path:string,headers:Record<string,string>={}){return fetch(origin+path,{redirect:'manual',headers:{'Accept-Language':'en',...headers},signal:AbortSignal.timeout(90000)});}
function pass(name:string,status?:number){checks.push({name,status});console.log('PASS '+name);}
async function main(){
for(const language of bookLanguages){
 const copy=bookText(language.code),page=await request(bookPath(language.code)+'?from=kindle',{Cookie:'user-lang=sk'});assert.equal(page.status,200);const html=await page.text(),plain=decode(html);assert.match(html,new RegExp('<html\\b[^>]*\\blang="'+language.code+'"'));assert.ok(plain.includes(copy.heroIntro),language.code+' body');assert.ok(html.includes('/readers/'+language.code+'/register?source=soul-amazon-kindle'));assert.ok(html.includes('https://www.mindbanger.com'+bookPath(language.code)));assert.ok(html.includes('href="'+mainHomePath(language.code)+'"'));assert.ok((html.match(/hreflang=/gi)||[]).length>=8);assert.ok(plain.includes(copy.edition));assert.ok(html.includes('the-soul-that-met-itself-3d.png'));pass('book '+language.code,200);
 const registration=await request('/readers/'+language.code+'/register?source=soul-book-page');assert.equal(registration.status,200);const form=await registration.text(),text=decode(form);assert.match(form,new RegExp('<html\\b[^>]*\\blang="'+language.code+'"'));assert.ok(text.includes(copy.registration.title));assert.ok(text.includes(readerText(language.code).email));assert.ok(text.includes(copy.registration.marketing));assert.ok(form.includes('/readers/'+language.code+'/terms'));assert.ok(form.includes('/readers/'+language.code+'/privacy'));assert.ok(!/<input[^>]*name="marketing"[^>]*required/.test(form));pass('registration '+language.code,200);
}
for(const [path,headers,expected]of [
 ['/the-soul-that-met-itself?from=kindle',{'Accept-Language':'fr-CA,fr;q=0.9',Cookie:'user-lang=sk'},'/the-soul-that-met-itself/fr'],
 ['/the-soul-that-met-itself?from=kindle',{'Accept-Language':'en',Cookie:'mindbanger-book-lang=it; user-lang=sk'},'/the-soul-that-met-itself/it'],
 ['/readers/register?source=soul-book-page',{'Accept-Language':'de-DE'},'/readers/de/register'],
]as const){const response=await request(path,headers);assert.equal(response.status,307);const target=new URL(response.headers.get('location')!,origin);assert.equal(target.pathname,expected);assert.ok(target.search);assert.match(response.headers.get('cache-control')||'',/no-store/);pass('automatic '+expected,307);}
const manual=await request('/the-soul-that-met-itself/pl?lang=es&from=kindle');assert.equal(manual.status,307);assert.equal(new URL(manual.headers.get('location')!,origin).pathname,bookPath('es'));assert.equal(new URL(manual.headers.get('location')!,origin).search,'?from=kindle');assert.ok(manual.headers.getSetCookie().some(c=>c.startsWith('mindbanger-book-lang=es;')));pass('manual choice cookie and source preserved',307);
const legacy=await request('/one_soul-in-two-lives?from=kindle');assert.equal(legacy.status,308);assert.equal(new URL(legacy.headers.get('location')!,origin).pathname,'/the-soul-that-met-itself');pass('legacy QR route preserved',308);
assert.equal((await request('/the-soul-that-met-itself/not-a-locale')).status,404);pass('invalid book language rejected',404);
const sitemap=await request('/sitemap.xml');assert.equal(sitemap.status,200);const xml=await sitemap.text();for(const language of bookLanguages)assert.ok(xml.includes(bookPath(language.code)));pass('sitemap has all eight book versions',200);
const home=await request('/en');assert.equal(home.status,200);const homeHtml=await home.text();assert.ok(!/<a\b[^>]*href="[^"]*(?:the-soul-that-met-itself|one_soul-in-two-lives)/i.test(homeHtml));assert.ok(homeHtml.includes('More trust in yourself.'));assert.match(homeHtml,/<html\b[^>]*\blang="en"/);pass('English main page and no book navigation link',200);
const czechHome=await request('/cz');assert.equal(czechHome.status,200);assert.match(await czechHome.text(),/<html\b[^>]*\blang="cs"/);pass('Czech main rewrite has no redirect loop',200);
if(local){for(const [country,expected]of [['SK','sk'],['CZ','cs'],['DE','de'],['MX','es'],['SN','fr'],['IT','it'],['PL','pl'],['JP','en']]){const r=await request('/the-soul-that-met-itself?from=bookshop',{'Accept-Language':'','x-vercel-ip-country':country});assert.equal(new URL(r.headers.get('location')!,origin).pathname,bookPath(expected as typeof bookLanguages[number]['code']));pass('country fallback '+country,307);}for(const [country,expected]of [['SK','/'],['CZ','/cz'],['DE','/en'],['JP','/en']]){const r=await request('/',{'Accept-Language':'fr','x-vercel-ip-country':country});if(expected==='/'){assert.equal(r.status,200);assert.match(await r.text(),/<html\b[^>]*\blang="sk"/);}else{assert.equal(r.status,307);assert.equal(new URL(r.headers.get('location')!,origin).pathname,expected);}pass('main country '+country,r.status);}}
writeFileSync('docs/book-localization-'+(local?'local':'production')+'.json',JSON.stringify({date:new Date().toISOString(),origin,status:'passed',checks,realEmailsSent:0,accountsCreated:0},null,2)+'\n');console.log(JSON.stringify({status:'passed',checks:checks.length,realEmailsSent:0,accountsCreated:0}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
