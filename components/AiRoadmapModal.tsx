
import React, { useState, useRef, useEffect } from 'react';
import { Guide, Step } from '../types';
import { DataService } from '../services/db';
import { X, Sparkles, Loader2, Download, Share2, Instagram, Check, ArrowRight, Map, Copy, FileText, Lightbulb } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface AiRoadmapModalProps {
  onClose: () => void;
}

const SUGGESTION_POOL = [
    "Sıfırdan İspanyolca Öğrenmek",
    "Maraton Koşusuna Hazırlık",
    "Kendi E-Ticaret Markanı Yarat",
    "Python ile Veri Analizi",
    "Evde Yoga Başlangıç",
    "Dijital Pazarlama Uzmanlığı",
    "Profesyonel Fotoğrafçılık",
    "Sağlıklı Beslenme Düzeni",
    "Yapay Zeka ile İçerik Üretimi",
    "Gitar Çalmayı Öğrenmek",
    "Finansal Özgürlük Planı",
    "Minimalist Yaşam Tarzı"
];

const AiRoadmapModal: React.FC<AiRoadmapModalProps> = ({ onClose }) => {
  const { t, isDarkMode, settings } = useApp();
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Partial<Guide> | null>(null);
  const [exporting, setExporting] = useState<'pdf' | 'story' | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  // Refs for capture areas
  const contentRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      // Pick 4 random suggestions on mount
      const shuffled = [...SUGGESTION_POOL].sort(() => 0.5 - Math.random());
      setSuggestions(shuffled.slice(0, 4));
  }, []);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const data = await DataService.generateContentWithAI('topic', topic);
      if (data) {
        setResult(data);
      } else {
        alert("Üzgünüm, yol haritası oluşturulamadı. Lütfen tekrar deneyin.");
      }
    } catch (e) {
      console.error(e);
      alert("Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!result) return;

    const textContent = `
🚀 *${result.title}*
${result.description}

📋 *Yol Haritası:*
${result.steps?.map((s, i) => `${i + 1}. ${s.step_title}`).join('\n')}

🔗 Kaynak: ${settings.siteName}
    `.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: result.title,
          text: textContent,
        });
        return; // Success with native share
      } catch (err) {
        console.log('Share canceled or not supported, falling back to clipboard');
      }
    }
    
    // Clipboard Fallback Logic with Legacy Support
    let success = false;
    try {
        await navigator.clipboard.writeText(textContent);
        success = true;
    } catch (e) {
        console.warn("Clipboard API failed, trying legacy execCommand:", e);
        try {
            const textArea = document.createElement("textarea");
            textArea.value = textContent;
            
            // Ensure textarea is not visible but part of DOM
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);
            
            textArea.focus();
            textArea.select();
            
            success = document.execCommand('copy');
            document.body.removeChild(textArea);
        } catch (err) {
            console.error("Fallback copy failed", err);
        }
    }

    if (success) {
      try {
          alert("İçerik panoya kopyalandı! İstediğiniz yere yapıştırabilirsiniz.");
      } catch (e) {
          // Alert might be blocked
      }
    } else {
      alert("Paylaşım yapılamadı.");
    }
  };

  const handleDownloadPDF = async () => {
    if (!contentRef.current || !result) return;
    setExporting('pdf');
    
    // Temporarily add a class for PDF styling to compact content
    contentRef.current.classList.add('pdf-mode');
    
    try {
      // Wait for style application
      await new Promise(resolve => setTimeout(resolve, 100));

      const element = contentRef.current;
      const canvas = await html2canvas(element, {
        scale: 2, // High resolution
        backgroundColor: '#ffffff', // Force white background for PDF
        useCORS: true,
        logging: false,
        windowWidth: 794 // A4 width in pixels at 96 DPI (approx)
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // If content is shorter than one page, just add it.
      // If longer, scale it down slightly to fit ONE page if it's close, 
      // otherwise split (but our CSS optimizations aim for single page).
      
      if (imgHeight <= pdfHeight) {
          pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      } else {
          // If it's just a bit too long, shrink to fit single page
          if (imgHeight < pdfHeight * 1.2) {
              pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, pdfHeight);
          } else {
              // Multi-page fallback
              let heightLeft = imgHeight;
              let position = 0;
              
              pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
              heightLeft -= pdfHeight;
              
              while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
                heightLeft -= pdfHeight;
              }
          }
      }
      
      pdf.save(`${result.title ? result.title.substring(0, 20).replace(/\s+/g, '-') : 'roadmap'}.pdf`);
    } catch (e) {
      console.error("PDF Error", e);
      alert("PDF oluşturulamadı.");
    } finally {
      if (contentRef.current) contentRef.current.classList.remove('pdf-mode');
      setExporting(null);
    }
  };

  const handleStoryImage = async () => {
    if (!storyRef.current || !result) return;
    setExporting('story');
    try {
      storyRef.current.style.display = 'flex';
      
      // Load any external images if needed before capture
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(storyRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null
      });
      storyRef.current.style.display = 'none';
      
      const link = document.createElement('a');
      link.download = `story-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error("Story Error", e);
      alert("Görsel oluşturulamadı.");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-0 md:p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 md:rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden relative border border-slate-200 dark:border-slate-700 flex flex-col h-full md:h-[90vh]">
        
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white/95 dark:bg-slate-800/95 backdrop-blur-md sticky top-0 z-20">
          <h3 className="text-base font-bold flex items-center gap-2 text-slate-800 dark:text-white">
            <div className="bg-indigo-100 dark:bg-indigo-900/50 p-1.5 rounded-lg">
                <Sparkles className="text-indigo-600 dark:text-indigo-400" size={16} />
            </div>
            {t('aiRoadmap')}
          </h3>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto flex-grow bg-slate-50/50 dark:bg-slate-900/50 scroll-smooth">
          {!result ? (
            <div className="flex flex-col items-center justify-center min-h-full p-6 space-y-6 animate-fade-in-up">
               <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 flex items-center justify-center">
                  <Map size={32} className="text-indigo-500" />
               </div>
               <div className="text-center max-w-sm">
                 <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">Hedefin Ne?</h2>
                 <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                   Öğrenmek istediğin konuyu yaz, yapay zeka sana özel bir yol haritası çıkarsın.
                 </p>
               </div>
               
               {/* Quick Suggestions */}
               <div className="w-full max-w-md">
                   <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center justify-center gap-1">
                       <Lightbulb size={12} /> Popüler Fikirler
                   </p>
                   <div className="flex flex-wrap gap-2 justify-center mb-4">
                       {suggestions.map((s, i) => (
                           <button
                                key={i}
                                onClick={() => setTopic(s)}
                                className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-full hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm"
                           >
                               {s}
                           </button>
                       ))}
                   </div>
               </div>
               
               <div className="w-full max-w-md space-y-3">
                 <div className="relative">
                     {/* FIX: Improved input styling for iOS Dark Mode compatibility */}
                     <input 
                        type="text" 
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="Örn: Evde Yoga Yapmak" 
                        className="w-full pl-4 pr-10 py-3 text-sm border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm appearance-none"
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                     />
                     <Sparkles className="absolute right-3 top-3 text-indigo-400 opacity-50" size={16} />
                 </div>
                 <button 
                    onClick={handleGenerate}
                    disabled={!topic || loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                 >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
                    {loading ? 'Planlanıyor...' : 'Yol Haritası Oluştur'}
                 </button>
               </div>
            </div>
          ) : (
            <div className="animate-fade-in max-w-4xl mx-auto p-4 md:p-8">
              {/* 
                  PREVIEW & PDF CAPTURE AREA 
                  Includes custom styles for PDF generation mode
              */}
              <style>{`
                  .pdf-mode {
                      padding: 20px !important;
                      border: none !important;
                      box-shadow: none !important;
                      color: black !important;
                      background: white !important;
                      width: 794px !important; /* A4 width */
                      margin: 0 auto !important;
                  }
                  .pdf-mode h1 { font-size: 24px !important; margin-bottom: 10px !important; color: #1e1b4b !important; }
                  .pdf-mode p.desc { font-size: 12px !important; margin-bottom: 20px !important; color: #475569 !important; }
                  .pdf-mode .step-item { padding-left: 0 !important; margin-bottom: 10px !important; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
                  .pdf-mode .step-badge { display: none !important; }
                  .pdf-mode .step-content-box { background: transparent !important; border: none !important; padding: 0 !important; }
                  .pdf-mode .step-title { font-size: 14px !important; font-weight: bold !important; color: #000 !important; margin-bottom: 2px !important; }
                  .pdf-mode .step-text { font-size: 11px !important; color: #333 !important; }
                  .pdf-mode .meta { display: none !important; }
                  .pdf-mode .pdf-header { display: flex !important; margin-bottom: 15px; border-bottom: 2px solid #1e1b4b; padding-bottom: 10px; }
              `}</style>

              <div ref={contentRef} className="bg-white dark:bg-slate-800 p-6 md:p-10 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all">
                 {/* Header for PDF only */}
                 <div className="pdf-header hidden items-center justify-between">
                     <div className="text-xl font-bold text-indigo-900">{settings.siteName}</div>
                     <div className="text-xs text-slate-500">{new Date().toLocaleDateString()}</div>
                 </div>

                 <div className="mb-6 md:mb-10 border-b border-slate-100 dark:border-slate-700 pb-6 md:pb-8">
                    <div className="flex justify-between items-start mb-3 meta">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-full text-[10px] font-bold uppercase tracking-wider border border-indigo-100 dark:border-indigo-800">
                           <Sparkles size={10} /> AI Yol Haritası
                        </span>
                    </div>
                    <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white mb-3 leading-tight tracking-tight">{result.title}</h1>
                    <p className="desc text-slate-600 dark:text-slate-300 text-sm md:text-lg leading-relaxed">{result.description}</p>
                 </div>

                 <div className="space-y-4 md:space-y-0 relative pl-0 md:pl-2">
                    <div className="hidden md:block absolute top-2 bottom-0 left-[22px] w-0.5 bg-indigo-100 dark:bg-slate-700 meta"></div>
                    {result.steps?.map((step, index) => (
                        <div key={index} className="step-item relative md:pl-12 md:pb-12 md:last:pb-0 group">
                            {/* Desktop Badge */}
                            <div className="step-badge hidden md:flex absolute left-0 top-0 w-12 h-12 rounded-xl bg-white dark:bg-slate-800 border-2 border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 items-center justify-center font-black text-lg shadow-sm z-10 group-hover:border-indigo-500 group-hover:text-indigo-600 transition-colors">
                                {index + 1}
                            </div>
                            
                            {/* Content Box */}
                            <div className="step-content-box bg-slate-50 dark:bg-slate-900/50 p-4 md:p-5 rounded-xl border border-slate-100 dark:border-slate-700/50 group-hover:border-indigo-200 dark:group-hover:border-indigo-900/50 transition-colors">
                                <div className="md:hidden mb-2 flex items-center gap-2">
                                     <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">{index + 1}</span>
                                     <h3 className="step-title font-bold text-base text-slate-900 dark:text-white">{step.step_title}</h3>
                                </div>
                                <h3 className="step-title hidden md:block font-bold text-lg text-slate-900 dark:text-white mb-2">{step.step_title}</h3>
                                <p className="step-text text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{step.step_content}</p>
                            </div>
                        </div>
                    ))}
                 </div>
                 
                 <div className="meta mt-8 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-[10px] text-slate-400">
                    <span className="font-bold flex items-center gap-1"><Map size={12} /> {settings.siteName}</span>
                    <span>AI Assistant</span>
                 </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Bar */}
        {result && (
            <div className="px-4 py-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                 <button onClick={() => {setResult(null); setTopic('');}} className="text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 underline decoration-dashed transition-colors whitespace-nowrap">
                    Yeni
                 </button>

                 <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                     <button onClick={handleDownloadPDF} disabled={!!exporting} className="flex-shrink-0 flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">
                        {exporting === 'pdf' ? <Loader2 className="animate-spin" size={14} /> : <FileText size={14} />}
                        PDF İndir
                     </button>
                     <button onClick={handleShare} className="flex-shrink-0 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm">
                        <Share2 size={14} />
                        Paylaş
                     </button>
                     <button onClick={handleStoryImage} disabled={!!exporting} className="flex-shrink-0 flex items-center justify-center gap-1.5 bg-gradient-to-tr from-purple-600 to-pink-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-90 shadow-sm">
                        {exporting === 'story' ? <Loader2 className="animate-spin" size={14} /> : <Instagram size={14} />}
                        Story
                     </button>
                 </div>
            </div>
        )}

      </div>

      {/* 
         IMPROVED STORY GENERATOR 
         Dimensions: 1080x1920
         Style: Modern, Gradient, Glassmorphism, Cleaner
      */}
      {result && (
          <div 
            ref={storyRef}
            style={{ 
                position: 'fixed', 
                top: 0, 
                left: '-9999px',
                width: '1080px', 
                height: '1920px', 
                background: 'linear-gradient(180deg, #4f46e5 0%, #0f172a 100%)',
                display: 'none',
                flexDirection: 'column',
                color: 'white',
                padding: '100px 80px',
                fontFamily: 'Inter, sans-serif',
                zIndex: -1,
                boxSizing: 'border-box'
            }}
          >
             {/* Background Pattern */}
             <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.1, backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.4) 2px, transparent 2px)', backgroundSize: '40px 40px' }}></div>
             
             {/* Header */}
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '60px', position: 'relative', zIndex: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', background: 'rgba(255,255,255,0.1)', padding: '15px 30px', borderRadius: '50px', backdropFilter: 'blur(10px)' }}>
                      <Map size={36} color="#fff" />
                      <span style={{ fontSize: '28px', fontWeight: 'bold', letterSpacing: '1px' }}>{settings.siteName}</span>
                  </div>
                  <div style={{ fontSize: '24px', opacity: 0.8, fontWeight: 500 }}>AI ROADMAP</div>
             </div>

             {/* Title Section */}
             <div style={{ position: 'relative', zIndex: 10, marginBottom: '60px' }}>
                <h1 style={{ fontSize: '72px', fontWeight: 900, lineHeight: 1.1, marginBottom: '20px', textShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                    {result.title}
                </h1>
                <p style={{ fontSize: '32px', lineHeight: 1.5, opacity: 0.9, fontWeight: 400 }}>
                    {result.description ? result.description.substring(0, 140) + (result.description.length > 140 ? '...' : '') : ''}
                </p>
             </div>

             {/* Steps Card */}
             <div style={{ flexGrow: 1, background: 'rgba(255, 255, 255, 0.95)', borderRadius: '40px', padding: '60px', color: '#0f172a', position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '30px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
                {result.steps?.slice(0, 5).map((step, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '30px' }}>
                        <div style={{ flexShrink: 0, width: '60px', height: '60px', background: '#4f46e5', color: 'white', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 'bold' }}>
                            {i + 1}
                        </div>
                        <div>
                            <h3 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px', lineHeight: 1.2 }}>{step.step_title}</h3>
                            <p style={{ fontSize: '24px', opacity: 0.7, lineHeight: 1.3 }}>{step.step_content.substring(0, 80)}...</p>
                        </div>
                    </div>
                ))}
                
                {result.steps && result.steps.length > 5 && (
                    <div style={{ marginTop: 'auto', textAlign: 'center', padding: '20px', background: '#f1f5f9', borderRadius: '20px', fontWeight: 'bold', fontSize: '28px', color: '#4f46e5' }}>
                        🔗 Tamamını web sitemizden incele
                    </div>
                )}
             </div>

             {/* Footer */}
             <div style={{ marginTop: '60px', textAlign: 'center', position: 'relative', zIndex: 10 }}>
                 <div style={{ display: 'inline-block', background: '#000', color: '#fff', padding: '20px 50px', borderRadius: '100px', fontSize: '32px', fontWeight: 'bold', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                    Hemen Başla 🚀
                 </div>
             </div>
          </div>
      )}

    </div>
  );
};

export default AiRoadmapModal;
