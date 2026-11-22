'use client';
import { useEffect, useState } from 'react';
type Row = { day: string; path: string; request_count: number };
type Report = { rows: Row[]; startedAt: string };
export default function SiteRequestOverview({ from, to }: { from: string; to: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [daily, setDaily] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setReport(null); setError('');
    void fetch(`/api/admin/site-requests?from=${from}&to=${to}`, { cache: 'no-store', signal: controller.signal })
      .then(async r => { const body = await r.json(); if (!r.ok) throw Error(body.error); return body as Report; })
      .then(body => { if (!controller.signal.aborted) setReport(body); })
      .catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Prehľad sa nepodarilo načítať.'); });
    return () => controller.abort();
  }, [from, to, refresh]);
  const paths = new Map<string, number>();
  for (const r of report?.rows || []) paths.set(r.path, (paths.get(r.path) || 0) + Number(r.request_count));
  const totals = [...paths].sort((a, b) => b[1] - a[1]);
  const total = totals.reduce((sum, r) => sum + r[1], 0);
  function download() {
    if (!report) return;
    const csv = '\uFEFFdeň;stránka;požiadavky\r\n' + report.rows.map(r => `${r.day};${r.path};${r.request_count}`).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `mindbanger-stranky-${from}-${to}.csv`; a.click(); URL.revokeObjectURL(url);
  }
  return <section aria-labelledby="site-request-title" className="site-request-overview">
    <h2 id="site-request-title">Otvorenia stránok bez analytických cookies</h2>
    <p>Počítame serverové požiadavky na verejné HTML stránky aj bez súhlasu s GA4. Nie sú to unikátni ľudia ani potvrdené prečítania. Opakované načítanie sa počíta znova. Známe roboty, náhľady odkazov a prednačítanie vynechávame; časť automatických požiadaviek môže zostať.</p>
    <p>Nie je to sledovanie cesty človeka: prepínanie stránok bez nového HTML načítania, posúvanie, video a kliknutia do tohto počítadla nepatria. Neukladáme IP, identifikátor návštevy, reklamné parametre ani obsah formulára. Rezervácie a platby sú uvedené samostatne nižšie.</p>
    <div className="marketing-toolbar"><button type="button" onClick={() => setRefresh(v => v + 1)}>Obnoviť počítadlo</button>{report && <><button type="button" onClick={() => setDaily(v => !v)}>{daily ? 'Súčet podľa stránok' : 'Rozpis po dňoch'}</button><button type="button" onClick={download}>Stiahnuť CSV</button></>}</div>
    {error && <p role="alert">{error}</p>}{!report && !error && <p role="status">Načítavam počítadlo…</p>}
    {report && <><p><strong>{total.toLocaleString('sk-SK')} požiadaviek</strong> v zvolenom období. Počítadlo bolo aktivované {new Date(report.startedAt).toLocaleString('sk-SK', { timeZone: 'Europe/Bratislava' })}. Staršie údaje spätne nedopĺňame; denné súčty uchovávame 90 dní. Prvý deň môže byť neúplný.</p>
      {report.rows.length ? <div className="marketing-table-wrap"><table style={{ minWidth: 560 }}><caption>{daily ? 'Denné počty požiadaviek · čas Bratislava' : 'Súčty podľa stránok za zvolené obdobie'}</caption><thead><tr>{daily && <th>Deň</th>}<th>Stránka</th><th>Požiadavky</th></tr></thead><tbody>{daily ? report.rows.map(r => <tr key={r.day + r.path}><td>{r.day}</td><td>{r.path}</td><td>{Number(r.request_count).toLocaleString('sk-SK')}</td></tr>) : totals.map(([path, count]) => <tr key={path}><td>{path}</td><td>{count.toLocaleString('sk-SK')}</td></tr>)}</tbody></table></div> : <p>V tomto období zatiaľ nie sú spočítané žiadne požiadavky.</p>}
    </>}
  </section>;
}
