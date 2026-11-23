-- Preserve source identities and history while changing only the book's canonical URL.
update public.reader_sources
set landing_path='/the-soul-that-met-itself'
where book_key='soul-that-met-itself' and landing_path='/one_soul-in-two-lives';
