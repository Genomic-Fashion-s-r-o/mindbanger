# Book readers and welcome emails

The English book page is https://www.mindbanger.com/the-soul-that-met-itself. The previous /one_soul-in-two-lives address redirects permanently and preserves the source query.

A reader uses one Mindbanger account. Book and channel attribution are optional metadata, never proof of purchase. Administration is available in the reader section under Accounts and sources.

After verified reader registration, one welcome is queued per identity. Slovak and English copy is in src/lib/readers/welcome-copy.ts; other languages temporarily use English. Welcome processing does not enable marketing consent. Authentication emails remain separate. Delivery uses the existing Brevo configuration, with a private queue, duplicate protection and review of uncertain attempts.

Required database migrations include reader_registration_sources, reader_book_canonical_path and reader_welcome_email. Apply migrations before using the new routes. Configure Supabase, Brevo, site URL and cron credentials through environment variables; no credentials are included here.

Checks: npx tsx --test scripts/readers.test.ts scripts/reader-welcome.test.ts. Generate email previews with npx tsx scripts/preview-reader-welcome.ts. The live HTTP checks use disposable existing-reader fixtures so they cannot send welcome emails.

This branch synchronizes the application with its tested production source because the default branch was behind production. Local environment files, build output, research, the complete manuscript, database backups and internal deployment reports are excluded.
