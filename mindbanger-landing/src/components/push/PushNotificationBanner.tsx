'use client';

import React, { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2, X, Share } from 'lucide-react';
import { useDictionary } from '@/lib/i18n-client';

export default function PushNotificationBanner() {
  const { dict } = useDictionary();
  const [isVisible, setIsVisible] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if supported
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    // Check permission
    const currentPermission = Notification.permission;
    setPermission(currentPermission);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    // Detect Standalone (PWA mode)
    const isStand = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(isStand);

    // Logic: Show banner if permission is 'default' OR (iOS and not standalone)
    // Don't show if denied (user explicitly said no) or granted (already enabled)
    // Unless we want to bug them about "Add to Home Screen" on iOS

    const dismissed = localStorage.getItem('push_banner_dismissed');
    if (dismissed) return;

    if (currentPermission === 'default') {
        setIsVisible(true);
    } else if (ios && !isStand) {
        // Optional: Remind iOS users to add to home screen for better experience
        // But maybe too aggressive? Let's stick to permission for now.
    }

  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('push_banner_dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">

        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-full text-amber-500 shrink-0">
            <Bell size={20} />
          </div>
          <div>
            <p className="text-sm text-white font-medium">
               {(dict.settings as any)?.pushBannerTitle || 'Začni deň s čistou hlavou'}
            </p>
            <p className="text-xs text-slate-400">
               {(dict.settings as any)?.pushBannerText || 'Aktivuj si denné Mindsety ešte dnes.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
            <a
              href="/mindbanger_daily/checkout"
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-bold rounded-full transition-colors whitespace-nowrap text-center flex-1 sm:flex-none"
            >
              {(dict.settings as any)?.pushBannerBtn || 'Odoberať Mindsety'}
            </a>
            <button
              onClick={handleDismiss}
              className="p-1.5 text-slate-500 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
        </div>

      </div>
    </div>
  );
}
