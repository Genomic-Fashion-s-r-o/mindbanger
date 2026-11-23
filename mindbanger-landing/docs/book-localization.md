# Book and reader languages

The public book page and shared Mindbanger reader registration support English, Czech, Slovak, Spanish, French, German, Italian and Polish. The book remains the English edition of *The Soul That Met Itself*.

Use `https://www.mindbanger.com/the-soul-that-met-itself` for a language-neutral printed link or QR code. Its redirect preserves attribution parameters. Each translation also has a stable URL ending in `/en`, `/cs`, `/sk`, `/es`, `/fr`, `/de`, `/it` or `/pl`, with canonical and alternate-language metadata.

Language priority is a manual `lang` query, the explicit language in the URL, the separate `mindbanger-book-lang` preference, a supported browser language in quality order, then a country default, then English. Vercel provides country-level detection; the application does not request precise browser location. A native language selector allows visitors to override detection. Automatic redirects are private and are not shared-cacheable.

Main-site language remains separate: Slovakia defaults to Slovak, Czechia to Czech, other countries to English. Existing explicit URL and manual preferences take priority. The book links to the appropriate main-site home; main navigation does not link back to the book.

Reader registration submits the selected language to the existing shared account flow. It preserves the book/source attribution, requires account terms and adulthood, and keeps marketing optional. Confirmation/sign-in emails use the selected supported language. The author's personal welcome letter remains Slovak or English; other languages intentionally use the approved English letter until further translations are supplied. This change needs no database migration and sends no email as part of verification.

Validation: TypeScript, reader and welcome regression suites, translation shape and routing tests, local HTTP checks of all eight book pages and registration forms, responsive browser review, staged deployment checks and production HTTP checks. Production country detection is verified by the Vercel header contract and locally simulated country headers; it is not a physical test from every country.
