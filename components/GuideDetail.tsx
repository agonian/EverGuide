
import React, { useEffect, useState, useMemo } from 'react';
import { Guide } from '../types';
import { DataService } from '../services/db';
import { ChevronLeft, Calendar, ArrowRight, Clock, BarChart, Trophy, RotateCcw, Check, Eye } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import AdUnit from './AdUnit';

interface GuideDetailProps {
  guide: Guide;
  allGuides: Guide[];
  userId: string;
  onView?: (id: string) => void;
}

const GuideDetail: React.FC<GuideDetailProps> = ({ guide, allGuides, userId, onView }) => {
  const { t } = useApp();
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const loadProgress = async () => {
        const steps = await DataService.getProgress(userId, guide.id);
        setCompletedSteps(steps);
        setShowConfetti(false);
    };
    loadProgress();
  }, [guide.id, userId]);

  useEffect(() => {
    document.title = `${guide.title} | Evergreen Rehber`;
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) metaDescription.setAttribute('content', guide.description);
    if (onView) onView(guide.id);
  }, [guide.id]);

  const toggleStep = async (index: number) => {
    const isCompleted = completedSteps.includes(index);
    let newSteps;
    if (isCompleted) {
      newSteps = completedSteps.filter((i) => i !== index);
    } else {
      newSteps = [...completedSteps, index];
    }
    setCompletedSteps(newSteps);
    await DataService.saveProgress(userId, guide.id, newSteps);
    if (newSteps.length === guide.steps.length && !isCompleted) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
    }
  };

  const resetProgress = async () => {
    if(confirm('İlerlemenizi sıfırlamak istediğinize emin misiniz?')) {
        setCompletedSteps([]);
        await DataService.saveProgress(userId, guide.id, []);
    }
  };

  const progressPercentage = Math.round((completedSteps.length / guide.steps.length) * 100);
  const dateStr = guide.createdAt ? new Date(guide.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  // SMART RELATED GUIDES LOGIC
  const relatedGuides = useMemo(() => {
      let list = allGuides.filter((g) => guide.related && guide.related.includes(g.slug));

      if (list.length < 4) {
          const sameCategory = allGuides.filter(g => 
              g.id !== guide.id && 
              g.category === guide.category && 
              !list.some(r => r.id === g.id)
          );
          list = [...list, ...sameCategory];
      }

      if (list.length < 4) {
          const others = allGuides.filter(g => 
              g.id !== guide.id && 
              !list.some(r => r.id === g.id)
          );
          list = [...list, ...others];
      }

      return list.slice(0, 4);
  }, [guide, allGuides]);

  const handleNavigation = (slug: string, e: React.MouseEvent) => {
      e.preventDefault();
      window.location.hash = slug;
  };

  return (
    <div className="animate-fade-in-up pb-20">
      
      <div className="mb-6 flex items-center justify-between pt-4">
        <a href="#" onClick={(e) => handleNavigation('', e)} className="inline-flex items-center text-slate-500 dark:text-slate-400 hover:text-brand-900 dark:hover:text-white transition-colors font-medium text-sm px-3 py-1.5 -ml-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
          <ChevronLeft size={16} className="mr-1" /> {t('allGuides')}
        </a>
        <div className="flex gap-2">
            {completedSteps.length > 0 && <button onClick={resetProgress} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Sıfırla"><RotateCcw size={18} /></button>}
        </div>
      </div>

      <div className="mb-12">
        <div className="flex flex-wrap gap-2 mb-4 items-center">
            {/* Fixed: Use solid slate background in dark mode for better readability against custom brand variables */}
            <span className="px-2.5 py-0.5 bg-brand-100 text-brand-900 dark:bg-slate-800 dark:text-brand-100 text-xs font-bold rounded-md uppercase border border-transparent dark:border-brand-500">{guide.category}</span>
            <span className="px-2.5 py-0.5 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-bold rounded-md flex items-center gap-1"><Clock size={12} /> {guide.duration}</span>
            <span className="px-2.5 py-0.5 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-bold rounded-md flex items-center gap-1"><BarChart size={12} /> {guide.difficulty}</span>
            {dateStr && <span className="text-xs text-slate-400 ml-auto font-medium">{dateStr}</span>}
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-6 leading-tight">{guide.title}</h1>
        <div className="rounded-2xl overflow-hidden mb-8 shadow-lg shadow-slate-200 dark:shadow-none relative">
            <img 
                src={guide.imageUrl || "https://picsum.photos/1200/600"} 
                alt={guide.title} 
                className="w-full h-64 md:h-96 object-cover" 
                onError={(e) => { 
                    e.currentTarget.src = `https://picsum.photos/seed/${guide.id}/1200/600`; 
                    e.currentTarget.onerror = null;
                }}
            />
            <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Eye size={14} /> {guide.views || 0} {t('views')}</div>
        </div>
        <p className="text-slate-600 dark:text-slate-300 text-lg md:text-xl leading-relaxed max-w-4xl border-l-4 border-brand-100 dark:border-brand-900 pl-6">{guide.description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8">
           
           {/* Inline Progress Bar (Replaces Fixed Header) */}
           <div className="mb-8 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
               <div className="flex justify-between items-center mb-2">
                   <span className="text-sm font-bold text-slate-700 dark:text-slate-200">İlerleme Durumu</span>
                   <span className="text-sm font-bold text-brand-600 dark:text-brand-400">%{progressPercentage}</span>
               </div>
               <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-600 transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }} />
               </div>
           </div>

           <div className="flex items-center justify-between mb-8 border-b border-slate-100 dark:border-slate-700 pb-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Calendar className="text-brand-500" size={20} /> {t('roadmap')}</h2>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{completedSteps.length} / {guide.steps.length} {t('steps').toUpperCase()}</span>
           </div>

           <div className="relative">
                <div className="space-y-0">
                    {guide.steps.map((step, index) => {
                        const isCompleted = completedSteps.includes(index);
                        const isNext = !isCompleted && (index === 0 || completedSteps.includes(index - 1));
                        const isLast = index === guide.steps.length - 1;

                        return (
                        <div key={index} onClick={() => toggleStep(index)} className={`flex group cursor-pointer ${isLast ? '' : 'pb-10'}`}>
                            <div className="relative flex-shrink-0 w-8 flex flex-col items-center">
                                {!isLast && <div className={`absolute top-2 bottom-[-40px] w-px transition-colors duration-300 ${isCompleted ? 'bg-brand-500/50 dark:bg-brand-600' : 'bg-slate-200 dark:bg-slate-700'}`} />}
                                <div className={`w-4 h-4 rounded-full border-2 z-10 box-content transition-all duration-300 mt-1.5 ${isCompleted ? 'bg-brand-500 border-brand-500 dark:border-brand-500' : isNext ? 'bg-white dark:bg-slate-900 border-brand-500 ring-4 ring-brand-100 dark:ring-brand-900/30 scale-110' : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 group-hover:border-slate-400'}`}>
                                    {isCompleted && <Check size={12} className="text-white mx-auto mt-0.5" />}
                                </div>
                            </div>
                            <div className={`flex-grow pl-6 transition-opacity duration-300 ${isCompleted ? 'opacity-60' : 'opacity-100'}`}>
                                <h3 className={`text-lg font-bold mb-2 transition-colors ${isCompleted ? 'text-slate-500 dark:text-slate-500 line-through decoration-slate-300 dark:decoration-slate-600' : 'text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-500'}`}>{step.step_title}</h3>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm md:text-base">{step.step_content}</p>
                                {isNext && !isCompleted && <div className="mt-3 inline-flex items-center text-xs font-bold text-brand-600 dark:text-brand-500 uppercase tracking-wide">Tamamla <ArrowRight size={12} className="ml-1" /></div>}
                            </div>
                        </div>
                    )})}
                     <div className={`flex mt-10 transition-all duration-500 ${completedSteps.length === guide.steps.length ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                        <div className="flex-shrink-0 w-8 flex justify-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md ${completedSteps.length === guide.steps.length ? 'bg-yellow-400 animate-bounce' : 'bg-slate-200 dark:bg-slate-700'}`}><Trophy size={16} /></div>
                        </div>
                        <div className="pl-6 pt-1">
                             <h3 className="font-bold text-slate-900 dark:text-white">{t('congrats')}</h3>
                             <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{completedSteps.length === guide.steps.length ? t('guideCompleted') : t('keepGoing')}</p>
                        </div>
                    </div>
                </div>
           </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
            <div className="sticky top-24">
                
                <AdUnit type="square" className="mb-6" slotId="sidebar-slot" />

                <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-sm uppercase tracking-wide text-gray-400">{t('youMightLike')}</h3>
                {relatedGuides.length > 0 ? (
                    <div className="space-y-3">
                        {relatedGuides.map(related => (
                            <a key={related.id} href={`#${related.slug}`} onClick={(e) => handleNavigation(related.slug, e)} className="flex gap-3 items-center group p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                                <img 
                                    src={related.imageUrl || "https://picsum.photos/100/100"} 
                                    alt={related.title} 
                                    className="w-12 h-12 object-cover rounded-md flex-shrink-0 bg-slate-100 dark:bg-slate-700" 
                                    onError={(e) => { 
                                        e.currentTarget.src = `https://picsum.photos/seed/${related.id}/100/100`; 
                                        e.currentTarget.onerror = null; 
                                    }}
                                />
                                <div>
                                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm group-hover:text-brand-600 dark:group-hover:text-brand-500 transition-colors line-clamp-1">{related.title}</h4>
                                    <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">{related.category}</span>
                                </div>
                            </a>
                        ))}
                    </div>
                ) : <p className="text-sm text-slate-500 italic">{t('noResults')}</p>}
                
                {showConfetti && (
                    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
                        <div className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 px-6 py-3 rounded-full text-lg font-bold animate-bounce shadow-2xl flex items-center gap-2">🎉 Harika İş!</div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default GuideDetail;
