
import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../contexts/AppContext';

interface AdUnitProps {
  type?: 'horizontal' | 'square' | 'vertical';
  className?: string;
  slotId?: string; // Google Ad Slot ID (optional for auto ads, required for units)
}

const AdUnit: React.FC<AdUnitProps> = ({ type = 'horizontal', className = '', slotId = '1234567890' }) => {
  const adRef = useRef<HTMLModElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { settings } = useApp();
  const [adLoaded, setAdLoaded] = useState(false);

  // We use ResizeObserver to guarantee the element has width before pushing
  useEffect(() => {
    if (!containerRef.current || adLoaded) return;

    const clientId = settings.apiKeys?.googleAdsId || 
                     localStorage.getItem('evergreen_google_ads_id') ||
                     import.meta.env?.VITE_GOOGLE_ADS_ID;
    
    if (!clientId) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // If element has actual width > 0
        if (entry.contentRect.width > 0 && !adLoaded) {
          try {
            // Check if adRef is populated and empty
            if (adRef.current && adRef.current.innerHTML.trim() === '') {
                 // @ts-ignore
                (window.adsbygoogle = window.adsbygoogle || []).push({});
                setAdLoaded(true); // Prevent multiple pushes
                observer.disconnect(); // Stop observing once loaded
            }
          } catch (e) {
            console.error("AdSense push error:", e);
          }
        }
      }
    });

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [settings, adLoaded]);

  const clientId = settings.apiKeys?.googleAdsId || 
                   (typeof window !== 'undefined' ? localStorage.getItem('evergreen_google_ads_id') : null) ||
                   import.meta.env?.VITE_GOOGLE_ADS_ID;

  // Render logic
  let sizeStyle: React.CSSProperties = { width: '100%', height: '90px' };
  let format = 'auto';

  if (type === 'square') {
      sizeStyle = { width: '300px', height: '250px' };
      format = 'rectangle';
  } else if (type === 'vertical') {
      sizeStyle = { width: '300px', height: '600px' };
      format = 'vertical';
  }

  // If no Client ID configured
  if (!clientId) {
      return (
        <div className={`bg-slate-50 border border-slate-200 border-dashed rounded-lg flex flex-col items-center justify-center text-slate-400 my-6 overflow-hidden relative ${className}`} style={sizeStyle}>
          <span className="text-xs font-bold tracking-widest uppercase mb-1">Reklam Alanı</span>
          <span className="text-[10px] opacity-70">Google AdSense (Yapılandırılmadı)</span>
          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"></div>
        </div>
      );
  }

  return (
    <div ref={containerRef} className={`flex justify-center my-6 min-h-[50px] ${className}`}>
        <ins className="adsbygoogle"
             style={{ display: 'block', ...sizeStyle }}
             data-ad-client={clientId}
             data-ad-slot={slotId}
             data-ad-format={format}
             data-full-width-responsive="true"
             ref={adRef}>
        </ins>
    </div>
  );
};

export default AdUnit;
