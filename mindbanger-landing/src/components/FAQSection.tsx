// src/components/FAQSection.tsx
'use client';
import { useDictionary } from './LanguageProvider';

import React, { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

const faqs = [
  {
    q: 'What do I get every day?',
    a: 'A daily theme, short signal, focus, affirmation and audio reset.',
  },
  {
    q: 'Is this a meditation app?',
    a: 'No. It is a daily mind ritual designed for clarity, calm and direction.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes.',
  },
  {
    q: 'Is the content in English?',
    a: 'Yes. English is the main version.',
  },
  {
    q: 'Do I get access to past days?',
    a: 'Yes, through the archive.',
  },
];

export default function FAQSection() {
  const { dict } = useDictionary();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="py-24 bg-slate-950 px-6 relative">
      <div className="max-w-2xl mx-auto space-y-12 relative z-10">
        <h2 className="text-3xl md:text-5xl font-serif text-white text-center tracking-tight">{dict?.landing?.faq?.title || 'Questions'}</h2>

        <div className="space-y-4">
          {(dict?.landing?.faq?.faqs || faqs).map((item: { q: string, a: string }, idx: number) => (
            <div
              key={idx}
              className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm"
            >
              <button
                onClick={() => toggle(idx)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors focus:outline-none"
              >
                <span className="text-lg font-medium text-slate-200">{item.q}</span>
                <span className="text-slate-500">
                  {openIndex === idx ? <Minus size={20} /> : <Plus size={20} />}
                </span>
              </button>
              
              <div 
                className={`transition-all duration-300 overflow-hidden ${
                  openIndex === idx ? 'max-h-40 opacity-100 p-6 pt-0' : 'max-h-0 opacity-0'
                }`}
              >
                <p className="text-slate-400 font-light leading-relaxed">
                  {item.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
