
import React, { useState, useEffect } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

interface CookieBannerProps {
  onConsentUpdate: (granted: boolean) => void;
  onOpenPrivacy: () => void;
}

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

const CookieBanner: React.FC<CookieBannerProps> = ({ onConsentUpdate, onOpenPrivacy }) => {
  const [isVisible, setIsVisible] = useState(false);
  const { isDarkMode } = useApp();

  useEffect(() => {
    // Check if consent was previously given
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setIsVisible(true);
    } else if (consent === 'accepted') {
      // If already accepted in previous session, ensure Gtag knows
      updateGtagConsent('granted');
      onConsentUpdate(true);
    }
  }, []);

  const updateGtagConsent = (status: 'granted' | 'denied') => {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        'ad_storage': status,
        'ad_user_data': status,
        'ad_personalization': status,
        'analytics_storage': status
      });
      // Important: Push a dataLayer event to verify update occurred
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({'event': 'default_consent'});
    }
  };

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    updateGtagConsent('granted');
    onConsentUpdate(true);
    setIsVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem('cookie-consent', 'rejected');
    updateGtagConsent('denied');
    onConsentUpdate(false);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-8 md:right-auto md:max-w-md z-[9999] animate-fade-in-up">
      {/* 
         THEME FIX: 
         Light Mode: bg-white, text-slate-900 
         Dark Mode: bg-slate-900, text-white 
      */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-900 dark:text-white p-6 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col gap-4">
        
        <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg flex-shrink-0">
                <ShieldCheck size={20} className="text-white" />
            </div>
            <div>
                <h4 className="font-bold text-lg mb-1">Çerez Tercihleri</h4>
                <p className="text-sm opacity-80 leading-relaxed text-slate-600 dark:text-slate-300">
                    Size en iyi deneyimi sunmak, trafiği analiz etmek ve kişiselleştirilmiş içerikler göstermek için çerezleri kullanıyoruz.
                    <button onClick={onOpenPrivacy} className="text-indigo-600 dark:text-indigo-400 hover:underline ml-1 font-bold">Gizlilik Politikamızı</button> inceleyebilirsiniz.
                </p>
            </div>
        </div>

        <div className="flex gap-3 mt-1">
          <button 
            onClick={handleAccept} 
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold transition-colors shadow-lg shadow-indigo-500/20"
          >
            Hepsini Kabul Et
          </button>
          <button 
            onClick={handleReject} 
            className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 px-4 py-2.5 rounded-xl font-medium transition-colors"
          >
            Reddet
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
