'use client';
import { useEffect, useState } from 'react';
import { Appointment, statusLabels, dateLabel, money } from '@/lib/booking/model';
type Summary = Pick<Appointment, 'id' | 'status' | 'starts_at' | 'ends_at' | 'service_name' | 'price' | 'location' | 'hold_until'>;
export default function ManageBooking() {
  const [booking, setBooking] = useState<Summary | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(true), [confirm, setConfirm] = useState(false);
  async function request(action: 'view' | 'cancel') {
    setLoading(true); setError('');
    try {
      const token = window.location.hash.slice(1);
      if (!/^[a-f0-9]{64}$/.test(token)) throw new Error('Otvorte súkromný odkaz z emailu.');
      const response = await fetch('/api/appointments/manage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, action }), cache: 'no-store' });
      const result = await response.json(); if (!response.ok) throw new Error(result.error); setBooking(result.booking); setConfirm(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'Rezerváciu sa nepodarilo načítať.'); } finally { setLoading(false); }
  }
  useEffect(() => { void request('view'); }, []);
  return <div className="personal-manage">{loading && <p role="status">Načítavam rezerváciu…</p>}{error && <p className="personal-notice" role="alert">{error}<button className="personal-text-link" onClick={() => request('view')} style={{ marginLeft: 12 }}>Skúsiť znova</button></p>}{booking && <><p className="personal-notice" role="status">{statusLabels[booking.status]}</p><dl><div><dt>Stretnutie</dt><dd>{booking.service_name}</dd></div><div><dt>Termín</dt><dd>{dateLabel(booking.starts_at)}</dd></div><div><dt>Miesto</dt><dd>{booking.location}</dd></div><div><dt>Cena služby</dt><dd>{money(Number(booking.price))}</dd></div></dl>{booking.status === 'pending' && booking.hold_until && <p>Čaká na osobné potvrdenie. Blokovanie termínu vyprší {dateLabel(booking.hold_until)}.</p>}{['pending','confirmed'].includes(booking.status) && Date.parse(booking.starts_at) > Date.now() && (confirm ? <div><p>Naozaj chcete zrušiť tento termín? Zrušenie je bezplatné.</p><div className="personal-actions"><button disabled={loading} className="personal-button" onClick={() => request('cancel')}>Áno, zrušiť termín</button><button disabled={loading} className="personal-text-link" onClick={() => setConfirm(false)}>Ponechať termín</button></div></div> : <button disabled={loading} className="personal-text-link" onClick={() => setConfirm(true)}>Zrušiť žiadosť alebo termín</button>)}<p>Ak potrebujete zmenu termínu, kontaktujte prevádzkovateľa. Tento súkromný odkaz nepreposielajte.</p></>}</div>;
}
