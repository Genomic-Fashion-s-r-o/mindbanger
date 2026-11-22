import en from '@/dictionaries/en.json';
import sk from '@/dictionaries/sk.json';
import cs from '@/dictionaries/cs.json';

export const dictionaries = {
  en,
  sk,
  cs,
};

export type Locale = keyof typeof dictionaries;

export const getDictionary = (locale: string): any => {
  if (locale in dictionaries) {
    return dictionaries[locale as Locale];
  }
  return dictionaries.en;
};