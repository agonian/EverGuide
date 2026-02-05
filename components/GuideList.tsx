
import React, { useState, useMemo, useEffect } from 'react';
import { Guide } from '../types';
import { DataService } from '../services/db';
import { Tag, ArrowRight, Clock, BarChart, CheckCircle2, ListChecks, Search, Eye, CalendarDays, Timer, Sparkles, Loader2 } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import AdUnit from './AdUnit';

interface GuideListProps {
  guides: Guide[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  userId: string;
}

const GuideList: React.FC<GuideListProps> = ({ guides, searchTerm, onSearchChange, userId }) => {
  const { t, currentHero, settings, themeColor, language } = useApp(); // Added language to destructuring
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  
  // Responsive Ad Placement Logic
  const [firstBatchSize, setFirstBatchSize] = useState(3);

  // FIX: Reset category when language changes to avoid "No Results" due to category name mismatch
  useEffect(() => {
    setSelectedCategory('ALL');
  }, [language]);

  useEffect(() => {
      const handleResize = () => {
          const width = window.innerWidth;
          if (width < 768) {
              setFirstBatchSize(1); // Mobile: 1 col, ad after 1
          } else if (width < 1024) {
              setFirstBatchSize(2); // Tablet: 2 cols, ad after 2
          } else {
              setFirstBatchSize(3); // Desktop: 3 cols, ad after 3
          }
      };

      // Initial check
      handleResize();

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Helper to calculate time immediately
  const calculateTimeLeft = () => {
      if (!settings.autoGen?.enabled) return null;
      const now = Date.now();
      const next = settings.autoGen.nextRunTime;
      const diff = next - now;
      if (diff <= 0) return { h: 0, m: 0, s: 0 };
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      return { h, m, s };
  };

  const [timeLeft, setTimeLeft] = useState<{h: number, m: number, s: number} | null>(calculateTimeLeft);
  
  const calculateInitialPercent = () => {
      if (!settings.autoGen?.enabled) return 0;
      const now = Date.now();
      const next = settings.autoGen.nextRunTime;
      const diff = next - now;
      if (diff <= 0) return 100;
      const totalDuration = settings.autoGen.intervalMinutes * 60 * 1000;
      const elapsed = totalDuration - diff;
      return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  }
  
  const [progressPercent, setProgressPercent] = useState(calculateInitialPercent);

  useEffect(() => {
    const fetchAllProgress = async () => {
        const progress = await DataService.getAllUserProgress(userId);
        setProgressMap(progress);
    };
    fetchAllProgress();
  }, [guides, userId]);

  useEffect(() => {
    if (!settings.autoGen?.enabled) {
        setTimeLeft(null);
        return;
    }

    const updateTimer = () => {
        const now = Date.now();
        const next = settings.autoGen.nextRunTime;
        const diff = next - now;

        if (diff <= 0) {
            setTimeLeft({ h: 0, m: 0, s: 0 });
            setProgressPercent(100);
            return;
        }

        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ h, m, s });

        const totalDuration = settings.autoGen.intervalMinutes * 60 * 1000;
        const elapsed = totalDuration - diff;
        const percent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
        setProgressPercent(percent);
    };

    updateTimer(); 
    const intervalId = setInterval(updateTimer, 1000);

    return () => clearInterval(intervalId);
  }, [settings.autoGen]);

  const categories = useMemo(() => {
    const cats = new Set<string>(guides.map((g) => g.category));
    
    // Count guides per category
    const counts: Record<string, number> = {};
    guides.forEach(g => {
        counts[g.category] = (counts[g.category] || 0) + 1;
    });

    return [
        { id: 'ALL', label: t('all'), count: guides.length },
        ...Array.from(cats).sort().map(cat => ({ 
            id: cat, 
            label: cat,
            count: counts[cat] || 0
        }))
    ];
  }, [guides, t]);

  const filteredGuides = guides.filter((guide) => {
    const matchesSearch = guide.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          guide.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || guide.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleNavigation = (slug: string, e: React.MouseEvent) => {
      e.preventDefault();
      window.location.hash = slug;
  };

  // Define subtle, eye-pleasing gradients based on theme
  const heroGradientClass = useMemo(() => {
      const gradients: Record<string, string> = {
          default: "bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800",
          indigo: "bg-gradient-to-br from-indigo-50 via-white to-blue-50 dark:from-slate-800 dark:via-slate-900 dark:to-indigo-950/30",
          green: "bg-gradient-to-br from-emerald-50 via-white to-green-50 dark:from-slate-800 dark:via-slate-900 dark:to-green-950/30",
          rose: "bg-gradient-to-br from-rose-50 via-white to-pink-50 dark:from-slate-800 dark:via-slate-900 dark:to-rose-950/30",
          amber: "bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-slate-800 dark:via-slate-900 dark:to-amber-950/30",
      };
      return gradients[themeColor] || gradients['default'];
  }, [themeColor]);

  // Determine if we should show the "Generating" state
  // Show generating if:
  // 1. The DB says it's generating (settings.autoGen.isGenerating)
  // 2. OR The local timer has hit 00:00:00 (to prevent the "stuck at 0" visual glitch while backend works)
  const isTimeUp = timeLeft && timeLeft.h === 0 && timeLeft.m === 0 && timeLeft.s === 0;
  const showGeneratingState = settings.autoGen?.isGenerating || isTimeUp;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className={`${heroGradientClass} rounded-2xl p-6 md:p-8 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center text-center relative overflow-hidden transition-colors duration-500`}>
        
        <div className="max-w-2xl z-10 mb-6">
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
                {currentHero.title} <span className="text-brand-600 dark:text-brand-400">{currentHero.titleHighlight}</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed">{currentHero.description}</p>
        </div>

        {settings.autoGen?.enabled && (
             <div className="w-full max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-6 z-10 shadow-sm transition-all">
                {showGeneratingState ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-1">
                         <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold animate-pulse">
                            <Loader2 className="animate-spin" size={20} />
                            <span>{t('generatingNow')}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-2">
                             <div className="h-full bg-indigo-500 animate-[loading_2s_ease-in-out_infinite] w-full origin-left-right"></div>
                        </div>
                    </div>
                ) : timeLeft ? (
                    <>
                        <div className="flex justify-between items-center mb-2">
                             <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1">
                                 <Sparkles size={12} className="text-indigo-500" /> {t('newTopicIn')}
                             </span>
                             <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                 {String(timeLeft.h).padStart(2,'0')}:{String(timeLeft.m).padStart(2,'0')}:{String(timeLeft.s).padStart(2,'0')}
                             </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            {/* Improved contrast: Using indigo-600 for light mode instead of generic brand color */}
                            <div 
                                className="h-full bg-indigo-600 dark:bg-indigo-500 shadow-[0_0_10px_rgba(79,70,229,0.5)] transition-all duration-1000 ease-linear" 
                                style={{ width: `${progressPercent}%` }}
                            ></div>
                        </div>
                    </>
                ) : (
                    <div className="text-xs text-slate-400 font-medium opacity-0">...</div>
                )}
             </div>
        )}

        <div className="w-full max-w-lg relative z-10 md:hidden">
             <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
             <input type="text" className="w-full bg-white dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-brand-500 outline-none placeholder-slate-400 shadow-sm" placeholder={t('searchPlaceholder')} value={searchTerm} onChange={(e) => onSearchChange(e.target.value)} />
        </div>

        {/* Dynamic Background Blobs */}
        <div className="absolute top-0 left-0 w-48 h-48 bg-brand-200/40 dark:bg-brand-500/10 rounded-full blur-3xl -z-0"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-brand-100/40 dark:bg-brand-400/10 rounded-full blur-3xl -z-0"></div>
      </div>

      <div className="flex flex-nowrap md:flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 pb-2 -mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto md:overflow-visible no-scrollbar">
        {categories.map((cat) => (
            <button 
                key={cat.id} 
                onClick={() => setSelectedCategory(cat.id)} 
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border ${selectedCategory === cat.id ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 border-slate-800 dark:border-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
                <span>{cat.label}</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${selectedCategory === cat.id ? 'bg-white/20 text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                    {cat.count}
                </span>
            </button>
        ))}
      </div>

      {filteredGuides.length > 0 ? (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGuides.slice(0, firstBatchSize).map((guide) => <GuideCard key={guide.id} guide={guide} progressMap={progressMap} onNav={handleNavigation} t={t} />)}
            </div>
            
            {/* UPDATED SLOT ID TO PREVENT 400 ERRORS */}
            <AdUnit type="horizontal" className="my-8" slotId="1234567890" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGuides.slice(firstBatchSize).map((guide) => <GuideCard key={guide.id} guide={guide} progressMap={progressMap} onNav={handleNavigation} t={t} />)}
            </div>
        </>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
          <Tag className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={32} />
          <p className="text-slate-500 dark:text-slate-400 font-medium">{t('noResults')}</p>
          <button onClick={() => {onSearchChange(''); setSelectedCategory('ALL');}} className="mt-2 text-brand-600 dark:text-brand-400 text-sm font-bold hover:underline">{t('clearFilters')}</button>
        </div>
      )}
    </div>
  );
};

const GuideCard = ({ guide, progressMap, onNav, t }: any) => {
    const completedCount = progressMap[guide.id] || 0;
    const totalSteps = guide.steps.length;
    const isCompleted = completedCount === totalSteps && totalSteps > 0;
    const hasProgress = completedCount > 0;
    const percentage = Math.round((completedCount / totalSteps) * 100);
    const dateStr = guide.createdAt ? new Date(guide.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

    return (
        <a href={`#${guide.slug}`} onClick={(e) => onNav(guide.slug, e)} className={`group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-brand-400 dark:hover:border-brand-500 hover:shadow-lg transition-all duration-300 flex flex-col h-full overflow-hidden ${isCompleted ? 'opacity-75' : ''}`}>
            <div className="h-40 overflow-hidden relative bg-slate-100 dark:bg-slate-900">
                <img 
                    src={guide.imageUrl} 
                    alt={guide.title} 
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" 
                    loading="lazy" 
                    onError={(e) => { 
                        e.currentTarget.src = `https://picsum.photos/seed/${guide.id}/800/600`; 
                        e.currentTarget.onerror = null; 
                    }} 
                />
                <div className="absolute top-3 left-3"><span className="bg-white/95 backdrop-blur-sm text-slate-800 text-[10px] font-bold px-2 py-1 rounded shadow-sm uppercase">{guide.category}</span></div>
                {isCompleted && <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]"><span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle2 size={12} /> {t('completed')}</span></div>}
            </div>
            
            <div className="p-4 flex flex-col flex-grow">
                <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-semibold mb-2">
                    {dateStr && <span className="flex items-center gap-1"><CalendarDays size={12} /> {dateStr}</span>}
                    <span className="flex items-center gap-1"><Eye size={12} /> {guide.views || 0}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-brand-700 dark:group-hover:text-brand-400 mb-2 line-clamp-2 min-h-[3rem] leading-snug">{guide.title}</h3>
                <div className="flex items-center gap-3 mb-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                    <span className="flex items-center gap-1"><Clock size={12} /> {guide.duration}</span>
                    <span className="flex items-center gap-1"><BarChart size={12} /> {guide.difficulty}</span>
                </div>
                {(hasProgress || isCompleted) && (
                    <div className="mb-3">
                         <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                            <span className="flex items-center gap-1"><ListChecks size={12} /> {completedCount}/{totalSteps} {t('steps')}</span>
                            <span className={isCompleted ? 'text-green-600 dark:text-green-400' : 'text-brand-600 dark:text-brand-400'}>%{percentage}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : 'bg-brand-500'}`} style={{ width: `${percentage}%` }}></div>
                        </div>
                    </div>
                )}
                <div className="mt-auto pt-3 border-t border-slate-50 dark:border-slate-700 flex items-center justify-between text-xs font-bold text-brand-600 dark:text-brand-400">
                    <span>{isCompleted ? t('readAgain') : (hasProgress ? t('continue') : t('start'))}</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
            </div>
        </a>
    );
}

export default GuideList;
