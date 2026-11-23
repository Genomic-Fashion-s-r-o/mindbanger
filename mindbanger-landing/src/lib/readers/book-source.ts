// Attribution describes the link used, never proof of a book purchase.
export const SOUL_BOOK_PATH = '/the-soul-that-met-itself';
export const LEGACY_SOUL_BOOK_PATH = '/one_soul-in-two-lives';
export const soulBookSources = {
  'book-page': 'soul-book-page',
  'amazon-paperback': 'soul-amazon-paperback',
  kindle: 'soul-amazon-kindle',
  bookshop: 'soul-bookshop',
} as const;
export function bookRegistrationSource(from: unknown): string {
  return typeof from === 'string' && Object.hasOwn(soulBookSources, from)
    ? soulBookSources[from as keyof typeof soulBookSources] : soulBookSources['book-page'];
}
