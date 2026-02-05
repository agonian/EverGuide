
import React, { useState, useMemo, useEffect } from 'react';
import { Guide } from '../types';
import { DataService } from '../services/db';
import { Tag, ArrowRight, Clock, BarChart, CheckCircle2, ListChecks, Search, Eye, CalendarDays, Timer, Sparkles } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

interface GuideListProps {
  guides: Guide[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  userId: string;
}

const GuideList: React.FC<GuideListProps> = ({ guides, searchTerm, onSearchChange, userId }) => {
  const { t, currentHero, settings } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});

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

  // Countdown State - Initialize with function to avoid flash
  const [timeLeft, setTimeLeft] = useState<{h: number, m: number, s: number} | null>(calculateTimeLeft);
  
  // Calculate initial progress percent
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

  // Countdown Timer Logic
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

    updateTimer(); // Update immediately on mount/change
    const intervalId = setInterval(updateTimer, 1000);

    return () => clearInterval(intervalId);
  }, [settings.autoGen]);

  const categories = useMemo(() => {
    const cats = new Set(guides.map((g) => g.category));
    return [
        { id: 'ALL', label: t('all') },
        ...Array.from(cats).sort().map(cat => ({ id: cat, label: cat }))
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

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
        
        {/* Hero Content */}
        <div className="max-w-2xl z-10 mb-6">
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
                {currentHero.title} <span className="text-brand-600">{currentHero.titleHighlight}</span>
            </h1>
            <p className="text-slate-500 text-lg">{currentHero.description}</p>
        </div>

        {/* Countdown Timer Section */}
        {settings.autoGen?.enabled && (
             <div className="w-full max-w-md bg-slate-50 rounded-xl border border-slate-200 p-4 mb-6 z-10">
                {settings.autoGen.isGenerating ? (
                    <div className="flex items-center justify-center gap-2 text-indigo-600 font-bold animate-pulse">
                        <Sparkles size={18} /> {t('generatingNow')}
                    </div>
                ) : timeLeft ? (
                    <>
                        <div className="flex justify-between items-center mb-2">
                             <span className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                                 <Sparkles size={12} className="text-indigo-500" /> {t('newTopicIn')}
                             </span>
                             <span className="font-mono font-bold text-slate-800">
                                 {String(timeLeft.h).padStart(2,'0')}:{String(timeLeft.m).padStart(2,'0')}:{String(timeLeft.s).padStart(2,'0')}
                             </span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 ease-linear" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                    </>
                ) : (
                     /* If calculation returns null briefly (shouldn't happen with sync init) or disabled */
                    <div className="text-xs text-slate-400 font-medium opacity-0">...</div>
                )}
             </div>
        )}

        <div className="w-full max-w-lg relative z-10 md:hidden">
             <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
             <input type="text" className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder={t('searchPlaceholder')} value={searchTerm} onChange={(e) => onSearchChange(e.target.value)} />
        </div>

        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-brand-50 rounded-full blur-3xl -z-0 opacity-50"></div>
        <div className="absolute bottom-0 right-0 w-40 h-40 bg-indigo-50 rounded-full blur-3xl -z-0 opacity-50"></div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
        {categories.map((cat) => (
            <button 
                key={cat.id} 
                onClick={() => setSelectedCategory(cat.id)} 
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border ${selectedCategory === cat.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
            >
            {cat.label}
            </button>
        ))}
      </div>

      {filteredGuides.length > 0 ? (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGuides.slice(0, 3).map((guide) => <GuideCard key={guide.id} guide={guide} progressMap={progressMap} onNav={handleNavigation} t={t} />)}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGuides.slice(3).map((guide) => <GuideCard key={guide.id} guide={guide} progressMap={progressMap} onNav={handleNavigation} t={t} />)}
            </div>
        </>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
          <Tag className="mx-auto text-slate-300 mb-3" size={32} />
          <p className="text-slate-500 font-medium">{t('noResults')}</p>
          <button onClick={() => {onSearchChange(''); setSelectedCategory('ALL');}} className="mt-2 text-brand-600 text-sm font-bold hover:underline">{t('clearFilters')}</button>
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
        <a href={`#${guide.slug}`} onClick={(e) => onNav(guide.slug, e)} className={`group bg-white rounded-xl border border-slate-200 hover:border-brand-400 hover:shadow-lg transition-all duration-300 flex flex-col h-full overflow-hidden ${isCompleted ? 'opacity-75' : ''}`}>
            <div className="h-40 overflow-hidden relative bg-slate-100">
                <img src={guide.imageUrl} alt={guide.title} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" loading="lazy" onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop"; }} />
                <div className="absolute top-3 left-3"><span className="bg-white/95 backdrop-blur-sm text-slate-800 text-[10px] font-bold px-2 py-1 rounded shadow-sm uppercase">{guide.category}</span></div>
                {isCompleted && <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]"><span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle2 size={12} /> {t('completed')}</span></div>}
            </div>
            
            <div className="p-4 flex flex-col flex-grow">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold mb-2">
                    {dateStr && <span className="flex items-center gap-1"><CalendarDays size={12} /> {dateStr}</span>}
                    <span className="flex items-center gap-1"><Eye size={12} /> {guide.views || 0}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-700 mb-2 line-clamp-2 min-h-[3rem] leading-snug">{guide.title}</h3>
                <div className="flex items-center gap-3 mb-3 text-[10px] font-bold text-slate-400 uppercase">
                    <span className="flex items-center gap-1"><Clock size={12} /> {guide.duration}</span>
                    <span className="flex items-center gap-1"><BarChart size={12} /> {guide.difficulty}</span>
                </div>
                {(hasProgress || isCompleted) && (
                    <div className="mb-3">
                         <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 mb-1">
                            <span className="flex items-center gap-1"><ListChecks size={12} /> {completedCount}/{totalSteps} {t('steps')}</span>
                            <span className={isCompleted ? 'text-green-600' : 'text-brand-600'}>%{percentage}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : 'bg-brand-500'}`} style={{ width: `${percentage}%` }}></div>
                        </div>
                    </div>
                )}
                <div className="mt-auto pt-3 border-t border-slate-50 flex items-center justify-between text-xs font-bold text-brand-600">
                    <span>{isCompleted ? t('readAgain') : (hasProgress ? t('continue') : t('start'))}</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
            </div>
        </a>
    );
}

export default GuideList;
