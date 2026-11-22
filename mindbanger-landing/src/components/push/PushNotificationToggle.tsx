'use client';

import React, { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2, Info } from 'lucide-react';
import { useDictionary } from '@/lib/i18n-client';

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export default function PushNotificationToggle() {
  const { dict } = useDictionary();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  };

  const subscribeToPush = async () => {
    setIsLoading(true);
    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        throw new Error('Permission denied');
      }

      const registration = await navigator.serviceWorker.ready;
      
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
         throw new Error('Missing VAPID key in env. Check setup.');
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // Send subscription to server
      const res = await fetch('/api/user/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });

      if (!res.ok) throw new Error('Failed to save subscription on server');

      setIsSubscribed(true);
      alert((dict.settings as any)?.push?.tempSave || 'Push notifikácie boli úspešne zapnuté!');
    } catch (error) {
      console.error('Error subscribing to push:', error);
      alert((dict.settings as any)?.push?.errEnable || 'Zaseknuté? Kliknite na "Návod na zapnutie" nižšie.');
      // Update permission state just in case
      if ('Notification' in window) {
         setPermission(Notification.permission);
      }
      setShowHelp(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="text-sm text-slate-500 italic p-4 bg-slate-900/50 rounded-xl border border-white/5 space-y-2">
        <p>{(dict.settings as any)?.push?.unsupported || 'Prehliadač nepodporuje Push Notifikácie.'}</p>
        <p className="text-xs text-amber-500 font-medium">
             {(dict.settings as any)?.push?.iosHeader || '📱 Pre iPhone (iOS):'} <br/>
             1. {(dict.settings as any)?.push?.iosStep1 || 'Kliknite na'} {` `}<strong>{(dict.settings as any)?.push?.iosStep1Bold || 'Zdieľať'}</strong> {(dict.settings as any)?.push?.iosStep1Suffix || '(štvorec so šípkou)'}<br/>
             2. {(dict.settings as any)?.push?.iosStep2 || 'Vyberte'} {` `}<strong>{(dict.settings as any)?.push?.iosStep2Bold || 'Pridať na plochu'}</strong> {(dict.settings as any)?.push?.iosStep2Suffix || '(Add to Home Screen)'}<br/>
             3. {(dict.settings as any)?.push?.iosStep3 || 'Otvorte aplikáciu z plochy a vráťte sa sem.'}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-slate-800/30 rounded-xl border border-white/10 space-y-4">
      
      {/* Hlavný riadok s prepínačom */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-slate-300 font-medium flex items-center gap-2">
            {isSubscribed ? <Bell className="text-amber-500" size={18} /> : <BellOff className="text-slate-500" size={18} />}
            {(dict.settings as any)?.push?.title || 'Notifikácie do zariadenia'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            {(dict.settings as any)?.push?.desc || 'Dostávaj denné ranné reštarty priamo na uzamknutú obrazovku mobilu.'}
          </p>
        </div>

        <button
          type="button"
          onClick={subscribeToPush}
          disabled={isSubscribed || isLoading || permission === 'denied'}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
            isSubscribed 
              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
              : permission === 'denied'
              ? 'bg-red-500/10 text-red-500 border border-red-500/20 cursor-not-allowed'
              : 'bg-amber-500 text-slate-900 hover:bg-amber-400'
          }`}
        >
            {isLoading ? <Loader2 className="animate-spin" size={16} /> : null}
            {isSubscribed 
              ? ((dict.settings as any)?.push?.btnOn || 'Zapnuté')
              : permission === 'denied'
              ? ((dict.settings as any)?.push?.btnBlocked || 'Zablokované')
              : ((dict.settings as any)?.push?.btnOff || 'Zapnúť')}
        </button>
      </div>

      {/* Stav zablokovania / Pomoc */}
      {(!isSubscribed) && (
        <div className="bg-slate-900/50 p-3 rounded-lg text-xs space-y-2">
            {permission === 'denied' ? (
                <div className="flex items-start gap-2 text-red-400">
                    <Info size={14} className="mt-0.5 shrink-0" />
                    <p>{(dict.settings as any)?.push?.blockedInfo || 'Notifikácie sú v prehliadači zablokované. Musíte ich povoliť ručne.'}</p>
                </div>
            ) : null}

            <button 
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className="text-amber-500 hover:text-amber-400 font-medium underline decoration-dashed underline-offset-4 flex items-center gap-1"
            >
              <Info size={12}/>
              {(dict.settings as any)?.push?.helpToggle || 'Návod: Ako zapnúť notifikácie? ▼'}
            </button>
            
            {showHelp && (
            <div className="pt-2 text-slate-300 space-y-3 pl-2 border-l-2 border-amber-500/20 ml-1 mt-2">
                <div className="space-y-1">
                    <strong className="block text-white text-xs uppercase tracking-wider">{(dict.settings as any)?.push?.androidTitle || '🤖 Android / Chrome (Mobil & PC)'}</strong>
                    <p>
                        {(dict.settings as any)?.push?.androidDesc || 'Kliknite na ikonu zámku 🔒 alebo nastavení v adresnom riadku (hore pri mindbanger.com) → Povolenia → Oznámenia →'} <strong>{(dict.settings as any)?.push?.androidDescBold || 'Povoliť.'}</strong>
                    </p>
                </div>
                <div className="space-y-1">
                     <strong className="block text-white text-xs uppercase tracking-wider">{(dict.settings as any)?.push?.iosTitle2 || '📱 iPhone (iOS)'}</strong>
                     <p>
                        1. {(dict.settings as any)?.push?.iosStep1 || 'Kliknite na'} <strong>{(dict.settings as any)?.push?.iosStep1Bold || 'Zdieľať'}</strong> {(dict.settings as any)?.push?.iosStep1Suffix || '(štvorec so šípkou)'}<br/>
                        2. {(dict.settings as any)?.push?.iosStep2 || 'Vyberte'} <strong>{(dict.settings as any)?.push?.iosStep2Bold || 'Pridať na plochu'}</strong> {(dict.settings as any)?.push?.iosStep2Suffix || '(Add to Home Screen)'}<br/>
                        3. {(dict.settings as any)?.push?.iosStep3 || 'Otvorte aplikáciu z plochy a vráťte sa sem.'}
                     </p>
                </div>
                <div className="space-y-1">
                     <strong className="block text-white text-xs uppercase tracking-wider">{(dict.settings as any)?.push?.troubleTitle || '⚠️ Problémy?'}</strong>
                     <p>
                        {(dict.settings as any)?.push?.troubleDesc || 'Skontrolujte, či nemáte zapnutý režim "Nerušiť" alebo "Sústredenie".'}
                     </p>
                 </div>
            </div>
            )}
        </div>
      )}

    </div>
  );
}
