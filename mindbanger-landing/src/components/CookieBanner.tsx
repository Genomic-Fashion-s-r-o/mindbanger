// src/components/CookieBanner.tsx
"use client";

import { useState, useEffect } from "react";
import { Cookie } from "lucide-react";

export function CookieBanner({ dict }: { dict: any }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-slate-900 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <Cookie className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-300">
              {dict.text}
            </p>
          </div>
          <button
            onClick={() => {
              localStorage.setItem("cookie-consent", "true");
              setShow(false);
            }}
            className="whitespace-nowrap rounded-full bg-amber-500 px-6 py-2.5 text-sm font-semibold text-slate-900 hover:bg-amber-400 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            {dict.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
