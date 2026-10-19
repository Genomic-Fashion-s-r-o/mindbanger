"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { QRCodeSVG } from "qrcode.react";
import { Lock, Smartphone, KeyRound, AlertTriangle } from "lucide-react";
import { useRouter } from 'next/navigation';

const ADMIN_EMAILS = ['miroslav.jobus@gmail.com', 'jobusmiro@gmail.com'];

export default function MfaLock({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [mfaStatus, setMfaStatus] = useState<'needs_enroll' | 'needs_verify' | 'verified'>('needs_verify');
  const [qrCode, setQrCode] = useState("");
  const [factorId, setFactorId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
  async function checkMfaStatus() {
    setLoading(true);
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session || !ADMIN_EMAILS.includes(session.user.email?.toLowerCase() || '')) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }

    try {
      // Skontrolujeme aktuálnu úroveň (AAL)
      const { data, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      
      if (aalError) throw aalError;

      if (data.currentLevel === 'aal2') {
        setMfaStatus('verified');
      } else {
        // Kontrola či už má nejakú MFA metódu
        const { data: factors, error: mfaError } = await supabase.auth.mfa.listFactors();
        if (mfaError) throw mfaError;

        const totpFactor = factors?.totp?.[0]; // Najdeme prvú TOTP metódu

        if (totpFactor && totpFactor.status === 'verified') {
          // Má priradené zariadenie, len treba overiť aktuálnu session
          const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
            factorId: totpFactor.id
          });
          if (challengeError) throw challengeError;
          
          setFactorId(totpFactor.id);
          setMfaStatus('needs_verify');
        } else {
          // Ešte nemá spárovanú appku
          const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
            factorType: 'totp',
            issuer: 'Mindbanger Admin',
            friendlyName: `${session.user.email} - ${new Date().getTime()}`
          });
          
          if (enrollError) throw enrollError;
          // IMPORTANT: `qrCode` for QRCodeSVG must be the raw URI (otpauth://...)
          // The `enrollData.totp.qr_code` contains a gigantic SVG path string that crashes the QRCodeSVG generator because it's "too long".
          setQrCode(enrollData.totp.uri);
          setFactorId(enrollData.id);
          setMfaStatus('needs_enroll');
        }
      }
    } catch (e: any) {
      console.error(e);
      setError("Error verifying MFA: " + e.message);
    }
    
    setLoading(false);
  }

  void checkMfaStatus();
  }, []);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Verify enrollment alebo standard challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verificationCode
      });

      if (verifyError) throw verifyError;

      // Ak úspešne, re-loadneme session aby malo AAL2
      setMfaStatus('verified');
      router.refresh();
    } catch (e: any) {
      setError("Invalid code. Skúste to znova.");
    }
    setLoading(false);
  }

  if (loading) return <div className="p-10 text-center text-slate-400">Overujem zabezpečený prístup...</div>;

  if (accessDenied) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-8 rounded-2xl max-w-md text-center">
          <AlertTriangle className="mx-auto mb-4" size={48} />
          <h2 className="text-xl font-bold mb-2">Prístup odopretý</h2>
          <p>Tento účet nemá administrátorské práva. Prístup len pre vývojára.</p>
        </div>
      </div>
    );
  }

  if (mfaStatus === 'verified') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="bg-slate-900 border border-white/5 rounded-[2rem] p-8 md:p-10 max-w-md w-full shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex justify-center mb-6">
          <div className="bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20 text-amber-500">
            <Lock size={32} />
          </div>
        </div>

        <h2 className="text-2xl font-serif text-white text-center mb-2">
          {mfaStatus === 'needs_enroll' ? 'Nastavenie 2-fázového overenia' : 'Zadajte 2FA kód'}
        </h2>
        <p className="text-slate-400 text-center mb-8 text-sm">
          {mfaStatus === 'needs_enroll' 
            ? 'Pre zvýšenú bezpečnosť použite Google Authenticator a naskenujte QR kód.' 
            : 'Otvorte aplikáciu na overovanie (Authenticator) a zadajte vygenerovaný kód.'}
        </p>

        {mfaStatus === 'needs_enroll' && qrCode && (
          <div className="bg-white p-4 rounded-xl flex justify-center mb-8">
            <QRCodeSVG value={qrCode} size={200} />
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4 relative z-10">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">6-Miestny Kód</label>
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                maxLength={6}
                value={verificationCode}
                onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors text-lg tracking-widest"
                required
              />
            </div>
          </div>
          
          {error && <div className="text-red-400 text-sm text-center bg-red-400/10 py-2 rounded-lg">{error}</div>}

          <button
            type="submit"
            disabled={loading || verificationCode.length < 6}
            className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Overujem...' : 'Overiť totožnosť'}
          </button>
        </form>
      </div>
    </div>
  );
}
