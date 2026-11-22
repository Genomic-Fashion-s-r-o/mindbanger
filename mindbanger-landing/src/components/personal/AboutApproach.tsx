export default function AboutApproach({ locale = 'sk' }: { locale?: 'sk' | 'cs' | 'en' }) {
  const cs = locale === 'cs';
  return <>
    <p className="about-approach-paragraph">{cs?'Mým cílem je pomoci ti najít řešení tvé aktuální situace a zároveň tě naučit postupy, které využiješ i v budoucnu. Společně budeme uspořádávat tvé hodnoty a myšlenky a hledat řešení, která jsou pro tebe přirozená a odpovídají tomu, na čem ti záleží.':'Mojím cieľom je pomôcť ti nájsť riešenie tvojej aktuálnej situácie a zároveň ťa naučiť postupy, ktoré využiješ aj v budúcnosti. Spolu budeme usporadúvať tvoje hodnoty a myšlienky a hľadať riešenia, ktoré sú prirodzené pre teba a zodpovedajú tomu, na čom ti záleží.'}</p>
    <p className="about-approach-paragraph">{cs?'Chci, abys těmto postupům rozuměl a postupně si je osvojil tak, aby ses v dalších životních situacích dokázal rozhodovat samostatně, s co největším klidem a v souladu se sebou.':'Chcem, aby si týmto postupom rozumel a postupne si ich osvojil tak, aby si sa v ďalších životných situáciách dokázal rozhodovať samostatne, s čo najväčším pokojom a v súlade so sebou.'}</p>
  </>;
}
