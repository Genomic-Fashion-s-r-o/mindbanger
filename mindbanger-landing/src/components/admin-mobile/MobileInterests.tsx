'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Leaf } from 'lucide-react';
import type { MobileInterestPage } from '@/lib/admin-mobile/model';

const registeredAt = new Intl.DateTimeFormat('sk-SK', { timeZone: 'Europe/Bratislava', dateStyle: 'medium', timeStyle: 'short' });
export function MobileInterests({ refreshKey }: { refreshKey: number }) {
  const [page, setPage] = useState(1), [retry, setRetry] = useState(0);
  const [data, setData] = useState<MobileInterestPage | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError('');
      try {
        const response = await fetch('/api/admin/mobile/interests?page=' + page, { cache: 'no-store', signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw Error(result.error || 'Zoznam emailov sa nepodarilo načítať.');
        if (controller.signal.aborted) return;
        if (result.page !== page) { setPage(result.page); return; }
        setData(result);
      } catch (failure) {
        if (!controller.signal.aborted) { setData(null); setError(failure instanceof Error ? failure.message : 'Zoznam emailov je nedostupný.'); }
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [page, refreshKey, retry]);
  const rows = data?.page === page ? data : null;
  function changePage(next: number) {
    setPage(next); section.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  const pagination = (position: string) => rows && <nav className="ma-pagination" aria-label={'Stránkovanie emailov ' + position}>
    <button aria-label="Predchádzajúca strana emailov" disabled={loading || rows.page <= 1} onClick={() => changePage(rows.page - 1)}><ChevronLeft size={17} /><span>Späť</span></button>
    <span aria-live="polite">Strana {rows.page} z {rows.pageCount}</span>
    <button aria-label="Nasledujúca strana emailov" disabled={loading || rows.page >= rows.pageCount} onClick={() => changePage(rows.page + 1)}><span>Ďalej</span><ChevronRight size={17} /></button>
  </nav>;
  return <section className="ma-all-interests" aria-labelledby="ma-all-interests-title" aria-busy={loading} ref={section}>
    <h2 className="ma-list-title" id="ma-all-interests-title">Všetky emailové adresy</h2>
    <p className="ma-count-note">Najnovšie registrácie ako prvé · 50 na stránku. Zoznam zahŕňa všetky dni.</p>
    {pagination('hore')}
    {loading && <p className="ma-loading" role="status">Načítavam emailové adresy…</p>}
    {error && <div className="ma-alert" role="alert"><p>{error}</p><button className="ma-secondary" onClick={() => setRetry(value => value + 1)}>Skúsiť znova</button></div>}
    {rows && (rows.total ? <><div className="ma-interest-list ma-all-interest-list">{rows.items.map(interest => <article key={interest.id}><span>{interest.email}</span><time dateTime={interest.registered_at}>{registeredAt.format(new Date(interest.registered_at))}</time></article>)}</div>
      <p className="ma-count-note">Zobrazené {(rows.page - 1) * rows.pageSize + 1}–{(rows.page - 1) * rows.pageSize + rows.items.length} z {rows.total} emailových adries.</p></>
      : <div className="ma-empty"><Leaf size={34} /><h3>Zatiaľ žiadny email</h3><p>Nové registrácie sa tu zobrazia automaticky.</p></div>)}
    {rows && rows.total > rows.pageSize && pagination('dole')}
  </section>;
}
