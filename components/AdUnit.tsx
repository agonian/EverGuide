import React from 'react';

interface AdUnitProps {
  type?: 'horizontal' | 'square' | 'vertical';
  className?: string;
}

const AdUnit: React.FC<AdUnitProps> = ({ type = 'horizontal', className = '' }) => {
  // Bu bileşen AdSense kodlarını barındıracak.
  // Gerçek kullanımda <ins> etiketleri burada olacak.
  
  let sizeClasses = "h-24 w-full"; // Default horizontal
  if (type === 'square') sizeClasses = "h-64 w-full";
  if (type === 'vertical') sizeClasses = "h-[600px] w-full";

  return (
    <div className={`bg-slate-100 border border-slate-200 border-dashed rounded-lg flex flex-col items-center justify-center text-slate-400 my-6 overflow-hidden relative ${sizeClasses} ${className}`}>
      <span className="text-xs font-bold tracking-widest uppercase mb-1">Reklam Alanı</span>
      <span className="text-[10px] opacity-70">Google AdSense</span>
      
      {/* Pattern Overlay for Demo */}
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"></div>
    </div>
  );
};

export default AdUnit;