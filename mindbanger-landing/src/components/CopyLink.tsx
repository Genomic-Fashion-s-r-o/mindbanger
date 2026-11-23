'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="flex bg-black/40 border border-white/10 rounded-lg p-1">
      <input 
        type="text" 
        readOnly 
        className="bg-transparent text-sm text-slate-300 w-full px-3 py-2 outline-none" 
        value={link}
      />
      <button 
        onClick={handleCopy}
        className="bg-white/5 hover:bg-white/10 text-white p-2 rounded-md transition-colors flex items-center justify-center min-w-[40px]"
        title="Copy to clipboard"
      >
        {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
      </button>
    </div>
  );
}