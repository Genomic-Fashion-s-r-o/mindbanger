"use client";

import React, { useState, useEffect } from 'react';
import { Building2, Users, CreditCard, CheckCircle, Calculator } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';

// Base price per seat
const BASE_PRICE = 7.99;

type B2BFormProps = {
  lang: 'en' | 'sk';
  texts: any;
};

export default function B2BRegistrationForm({ lang, texts }: B2BFormProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    taxId: '', // ICO
    vatId: '', // DIC
    address: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    seats: 5,
    billingCycle: 'monthly' // monthly or yearly
  });

  const [price, setPrice] = useState({ total: 0, perSeat: 0, discount: 0 });

  useEffect(() => {
    calculatePrice();
  }, [formData.seats, formData.billingCycle]);

  function calculatePrice() {
    const seats = formData.seats;
    let unitPrice = BASE_PRICE;
    let discountFilter = 0;

    if (formData.billingCycle === 'yearly') {
      if (seats < 10) {
         unitPrice = 7.11;
         discountFilter = 11;
      } else {
         const discountedMonthly = BASE_PRICE * 0.90;
         unitPrice = discountedMonthly * 0.89; // extra 11% off
         discountFilter = 20; 
      }
    } else {
      if (seats >= 10) {
         unitPrice = BASE_PRICE * 0.90; // 10% off
         discountFilter = 10;
      } else {
         unitPrice = BASE_PRICE;
         discountFilter = 0;
      }
    }

    const months = formData.billingCycle === 'yearly' ? 12 : 1;

    setPrice({
      total: parseFloat((unitPrice * seats * months).toFixed(2)),
      perSeat: parseFloat(unitPrice.toFixed(2)),
      discount: discountFilter
    });
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const mindbanger_ref = typeof window !== 'undefined' ? localStorage.getItem('mindbanger_ref') : null;
      
      const response = await fetch('/api/b2b/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, lang, price, affiliateId: mindbanger_ref }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Error initiating checkout');
      }
    } catch (err) {
      console.error(err);
      alert('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 md:p-8 max-w-2xl mx-auto shadow-2xl">
      <div className="mb-8 text-center">
        <h3 className="text-2xl font-serif text-white mb-2">{texts.form.submit}</h3>
        <p className="text-slate-400 text-sm">Step {step} of 2</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {step === 1 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <label className="block text-xs uppercase tracking-widest text-slate-500 mb-1">{texts.form.companyName}</label>
              <input 
                required
                type="text" 
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                placeholder={lang === 'sk' ? "Naša Firma s.r.o." : "Acme Corp Ltd."}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-slate-500 mb-1">{texts.form.taxId}</label>
                <input 
                  required
                  type="text" 
                  name="taxId"
                  value={formData.taxId}
                  onChange={handleChange}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                  placeholder="12345678"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-slate-500 mb-1">{texts.form.vatId}</label>
                <input 
                  type="text" 
                  name="vatId"
                  value={formData.vatId}
                  onChange={handleChange}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                  placeholder="SK1234567890"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-slate-500 mb-1">
                {lang === 'sk' ? "Sídlo spoločnosti" : "Headquarters Address"}
              </label>
              <input 
                required
                type="text" 
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                placeholder={lang === 'sk' ? "Ulica 123, 000 00 Mesto" : "123 Street, City, Country"}
              />
            </div>

            <button 
              type="button"
              onClick={() => {
                if(formData.companyName && formData.taxId && formData.address) setStep(2);
                else alert(lang === 'sk' ? 'Prosím vyplňte povinné polia' : 'Please fill required fields');
              }}
              className="w-full bg-white text-black font-bold py-4 rounded-full mt-4 hover:bg-slate-200 transition-colors"
            >
              {lang === 'sk' ? "Pokračovať" : "Continue"}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fadeIn">
             {/* Billing Cycle Toggle */}
             <div className="flex bg-slate-800 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, billingCycle: 'monthly' }))}
                  className={`flex-1 py-3 text-sm font-bold rounded-md transition-colors ${formData.billingCycle === 'monthly' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'}`}
                >
                  {lang === 'sk' ? "Mesačne" : "Monthly"}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, billingCycle: 'yearly' }))}
                  className={`flex-1 py-3 text-sm font-bold rounded-md transition-colors ${formData.billingCycle === 'yearly' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'}`}
                >
                  {lang === 'sk' ? "Ročne (Zvýhodnené)" : "Yearly (Save more)"}
                </button>
             </div>

             {/* Calculator Section */}
             <div className="bg-slate-800/50 p-6 rounded-xl border border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <label className="flex items-center gap-2 text-white font-medium">
                     <Users size={18} className="text-amber-500" />
                     {texts.form.seats}
                  </label>
                  <input 
                    type="number" 
                    name="seats"
                    min="1"
                    max="1000"
                    value={formData.seats}
                    onChange={handleChange}
                    className="w-24 bg-slate-900 border border-amber-500/50 rounded-lg px-3 py-2 text-white text-right font-bold text-lg focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex justify-between items-center text-sm mb-2 text-slate-400">
                  <span>Price per seat (Monthly)</span>
                  <span className={price.discount > 0 ? "line-through" : ""}>€{BASE_PRICE}</span>
                </div>
                
                {price.discount > 0 && (
                  <div className="flex justify-between items-center text-sm mb-2 text-green-400 font-medium">
                    <span>Discount applied ({price.discount}%)</span>
                    <span>€{price.perSeat}</span>
                  </div>
                )}
                
                <div className="h-px bg-white/10 my-3" />
                
                <div className="flex justify-between items-center text-xl font-serif text-white">
                    <span>{formData.billingCycle === 'yearly' ? 'Total Yearly (excl. VAT)' : 'Total Monthly (excl. VAT)'}</span>
                  <span>€{price.total}</span>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs uppercase tracking-widest text-slate-500 mb-1">{texts.form.contactName}</label>
                   <input 
                    required
                    type="text" 
                    name="contactName"
                    value={formData.contactName}
                    onChange={handleChange}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                   />
                </div>
                <div>
                   <label className="block text-xs uppercase tracking-widest text-slate-500 mb-1">{texts.form.contactEmail}</label>
                   <input 
                    required
                    type="email" 
                    name="contactEmail"
                    value={formData.contactEmail}
                    onChange={handleChange}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                   />
                </div>
             </div>

             <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-4 rounded-full border border-slate-600 text-slate-300 hover:text-white transition-colors"
                >
                  {lang === 'sk' ? "Späť" : "Back"}
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-amber-500 text-black font-bold py-4 rounded-full hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    <>
                      <CreditCard size={18} />
                      {lang === 'sk' ? "Prejsť k platbe" : "Proceed to Payment"}
                    </>
                  )}
                </button>
             </div>
          </div>
        )}

      </form>
    </div>
  );
}