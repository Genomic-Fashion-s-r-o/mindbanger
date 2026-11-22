'use client';

import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { UploadCloud, Users, X, Info } from 'lucide-react';

export default function B2BPurchaseModal({ 
  isOpen, 
  onClose, 
  orgId, 
  lang 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  orgId: string;
  lang: string;
}) {
  const [emails, setEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [manualCount, setManualCount] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const isSk = lang === 'sk' || lang === 'cs';
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      // Very basic CSV/TXT parser finding anything that looks like an email
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const foundEmails = content.match(emailRegex) || [];
      const uniqueEmails = Array.from(new Set(foundEmails.map(e => e.toLowerCase())));
      
      setEmails(uniqueEmails);
      
      if (uniqueEmails.length === 0) {
        toast.error(isSk ? 'V súbore neboli nájdené žiadne e-mailové adresy' : 'No email addresses found in file');
      } else {
        toast.success(
          isSk 
          ? `Nájdených ${uniqueEmails.length} adries` 
          : `Found ${uniqueEmails.length} addresses`
        );
      }
    };
    reader.readAsText(file);
  };

  const handleCheckout = async () => {
    // Determine quantity and emails payload
    let finalEmails = emails;

    if (emails.length === 0) {
       // Manual seats input
       const count = parseInt(manualCount);
       if (isNaN(count) || count <= 0) {
          toast.error(isSk ? 'Zadajte platný počet pre nákup alebo nahrajte súbor' : 'Enter a valid seat count or upload file');
          return;
       }
       // Build empty array since there are no pre-found emails, user will invite later
       finalEmails = Array(count).fill('placeholder'); // HACK: just to pass .length down to Stripe. In realistic terms we'd pass empty array. But our API calculates quantity via `emails.length`
    }

    setLoading(true);
    try {
      const res = await fetch('/api/b2b/buy-seats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orgId, 
          emails: finalEmails, 
          quantity: emails.length > 0 ? emails.length : parseInt(manualCount) || 0 
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to initialize checkout');

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.message);
      setLoading(false);
    }
  };

  // Simple pricing calc matching server
  const quantity = emails.length > 0 ? emails.length : (parseInt(manualCount) || 0);
  let unitPrice = 7.99;
  if (quantity >= 25) unitPrice = 7.99 * 0.75;
  else if (quantity >= 5) unitPrice = 7.99 * 0.85;
  const totalPrice = (unitPrice * quantity).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
            <X size={24} />
        </button>

        <div className="p-6 md:p-8 overflow-y-auto">
          <h2 className="text-2xl font-serif text-white mb-2">
            {isSk ? 'Získanie licencií pre tím' : 'Get Team Licenses'}
          </h2>
          <p className="text-slate-400 mb-6 text-sm">
            {isSk 
              ? 'Pridajte zamestnancov hromadným zoznamom a systém im automaticky zašle pozvánky po uhradení.' 
              : 'Add employees via bulk list and the system will automatically send invitations after payment.'}
          </p>

          {/* Option A: Upload File */}
          <div className="bg-slate-950/50 rounded-xl p-5 border border-dashed border-slate-700 mb-4 text-center">
            <UploadCloud className="mx-auto text-slate-500 mb-3" size={32} />
            <h3 className="font-semibold text-white text-sm mb-1">
              {isSk ? 'Nahrajte Excel/CSV s e-mailami' : 'Upload Excel/CSV with emails'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
               {isSk ? 'Systém spočíta počet adries a automaticky ich vybaví.' : 'The system counts the addresses and processes them.'}
            </p>
            <input 
              type="file" 
              accept=".csv,.txt" // Real excel might need XLSX parser, so keep simple text/csv
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-slate-800 hover:bg-slate-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition"
            >
               {emails.length > 0 
                  ? (isSk ? `Nahrať iný súbor (${emails.length} vložených)` : `Upload different file (${emails.length} parsed)`)
                  : (isSk ? 'Vybrať súbor' : 'Choose file')
               }
            </button>
          </div>

          <div className="flex items-center gap-4 my-6">
            <div className="h-px bg-slate-800 flex-1"></div>
            <span className="text-xs text-slate-500 uppercase tracking-wider">{isSk ? 'alebo manuálne' : 'or manual'}</span>
            <div className="h-px bg-slate-800 flex-1"></div>
          </div>

          {/* Option B: Manual seats */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-400 mb-2">
              {isSk ? 'Kupujem prístupy do zásoby (bez pozvánok)' : 'Buying spare seats (without invites)'}
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="number"
                min="1"
                disabled={emails.length > 0}
                value={emails.length > 0 ? emails.length : manualCount}
                onChange={(e) => setManualCount(e.target.value)}
                placeholder={isSk ? "Počet licencií (napr. 10)" : "Number of licenses (e.g. 10)"}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-3 placeholder-slate-500 focus:outline-none focus:border-amber-500 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-amber-200">{isSk ? 'Cena za licenciu:' : 'Price per license:'}</span>
              <span className="text-sm font-medium text-amber-500">€ {unitPrice.toFixed(2)} {isSk ? 'mesačne' : 'monthly'}</span>
            </div>
            <div className="flex justify-between items-center font-bold text-lg">
              <span className="text-amber-400">{isSk ? 'Spolu:' : 'Total:'}</span>
              <span className="text-amber-500">€ {totalPrice} {isSk ? 'mesačne' : 'monthly'}</span>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={loading || quantity <= 0}
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-3 px-4 rounded-xl transition duration-200 disabled:opacity-50 flex justify-center"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              isSk ? `Prejsť k platbe (Stripe)` : `Proceed to checkout (Stripe)`
            )}
          </button>
          
          <div className="mt-4 flex items-start gap-2 text-xs text-slate-500">
              <Info size={14} className="shrink-0 mt-0.5" />
              <p>{isSk 
                ? 'Faktúra a daňový doklad budú automaticky odoslané na fakturačný email zadávateľa. DPH bude vypočítaná Stripe systémom počas platby.' 
                : 'Invoice and tax document will be automatically sent to billing email. VAT will be calculated by Stripe during payment.'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}