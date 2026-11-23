export const WELCOME_VERSION = 'readers-welcome-2026-11-22';

// Keep each translation complete. Additional languages can be added here later.
export const welcomeMessages = {
  sk: {
    subject: 'Vitajte!',
    paragraphs: [
      '**Niektoré cesty sa začínajú, keď stretneme niekoho výnimočného. Iné sa začínajú, keď objavíme niečo výnimočné v sebe samých.**',
      'Vitaj!',
      'Mám úprimnú radosť, že si našiel cestu práve sem.',
      'Keď som písal knihu *Duša, ktorá stretla samu seba*, mojím najväčším želaním nebolo iba podeliť sa o nový pohľad na lásku, vedomie či tajomstvo Twin Flames.',
      'Chcel som ponúknuť niečo, čo ti možno pomôže pozrieť sa na vlastný život úplne inak.',
      'Objaviť lásku, ktorú už máš v sebe. Nájsť slobodu tam, kde bol kedysi strach. A možno znovu objaviť sny, ktoré v sebe už celé roky potichu nosíš.',
      'Tento priestor je pokračovaním tejto cesty.',
      '**Budem tu s tebou postupne zdieľať nové zamyslenia, meditácie, osobné poznania aj novinky z výskumného projektu MIRIEC.**',
      'Nemusíš ničomu veriť, nič dokazovať ani sa stať niekým iným, aby si sem patril.',
      'Stačí, ak si prinesieš svoju zvedavosť, otvorenosť a toho úžasného človeka, ktorým už dnes si.',
      '**Tvoj život nečaká na dokonalý okamih. Tvoj život sa odohráva práve teraz.**',
      'A ja si zo srdca želám, aby ti to, čo tu objavíš, pomohlo urobiť ho ešte krajším.',
      'S láskou a vierou v tvoju cestu,',
      '**Miroslav Jobus**',
      '*Autor knihy Duša, ktorá stretla samu seba*',
    ],
    open: 'Prejsť do čitateľského priestoru',
    footer: 'Toto je jednorazové privítanie po tvojej registrácii do Mindbangeru. Prijímanie noviniek a ponúk je dobrovoľné.',
    preferences: 'Nastavenia emailov',
  },
  en: {
    subject: 'Welcome — Your Journey Begins Here',
    paragraphs: [
      '**Some journeys begin when we meet someone extraordinary. Others begin when we discover something extraordinary within ourselves.**',
      'Welcome!',
      "I'm truly happy you've found your way here.",
      'When I wrote *The Soul That Met Itself*, my greatest wish was not simply to share a new perspective on love, consciousness, or the mystery of Twin Flames.',
      'I wanted to offer something that might help you look at your own life differently.',
      "To recognize the love already within you. To find freedom where there was once fear. And perhaps to rediscover dreams you've been carrying quietly for years.",
      'This space is an extension of that journey.',
      "**I'll gradually be sharing new reflections, meditations, personal insights, and updates from the MIRIEC research project.**",
      'There is nothing you need to believe, prove, or become to belong here.',
      'Just bring your curiosity, your openness, and the wonderful person you already are.',
      '**Your life is not waiting for the perfect moment. Your life is happening now.**',
      'And I hope something you find here helps make it even more beautiful.',
      'With love and faith in your journey,',
      '**Miroslav Jobus**',
      '*Author of The Soul That Met Itself*',
    ],
    open: 'Open your reader space',
    footer: 'This is a one-time welcome following your Mindbanger registration. News and offers are optional.',
    preferences: 'Email preferences',
  },
} as const;

export function welcomeCopy(locale: string) {
  const language = Object.hasOwn(welcomeMessages, locale) ? locale as keyof typeof welcomeMessages : 'en';
  return { language, ...welcomeMessages[language] };
}
