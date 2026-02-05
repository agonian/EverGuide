import React, { useState, useEffect } from 'react';
import { Guide, Step, SocialConfig, SiteSettings, ThemeColor } from '../types';
import { Plus, Trash2, Save, Layout, Image as ImageIcon, Sparkles, Bot, X, Loader2, Settings, Globe, Wand2, Edit, Check, Clock, BarChart, CalendarDays, Eye, Palette, ExternalLink, Type as TypeIcon, Timer, RefreshCw } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { DataService, VALID_CATEGORIES, slugify } from '../services/db';

interface AdminPanelProps {
  guides: Guide[];
  onSave: (guide: Guide, shouldTranslate: boolean) => void;
  onDelete: (id: string) => void;
  onCancel: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ guides, onSave, onDelete, onCancel }) => {
  const { t, themeColor, setThemeColor, language, setLanguage, settings, updateSettings } = useApp();
  const [activeTab, setActiveTab] = useState<'content' | 'settings'>('content');

  // Content Form State
  const initialFormState: Partial<Guide> = { title: '', category: 'Genel', difficulty: 'Kolay', duration: '', description: '', imageUrl: '', related: [] };
  const [formData, setFormData] = useState<Partial<Guide>>(initialFormState);
  const [steps, setSteps] = useState<Step[]>([{ step_title: '', step_content: '' }]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Settings Form State (Synced with global settings)
  const [localSettings, setLocalSettings] = useState<SiteSettings>(settings);
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
      setLocalSettings(settings);
  }, [settings]);
  
  // Confirmation Modal State
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  
  // AI Modal States
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiSelectedCategory, setAiSelectedCategory] = useState(''); // New state for category selection
  const [isGenerating, setIsGenerating] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (e.target.name === 'title') setErrors({ ...errors, title: '' });
  };

  const handleStepChange = (index: number, field: keyof Step, value: string) => {
    const newSteps = [...steps];
    newSteps[index][field] = value;
    setSteps(newSteps);
  };

  const addStep = () => setSteps([...steps, { step_title: '', step_content: '' }]);
  const removeStep = (index: number) => { if (steps.length > 1) setSteps(steps.filter((_, i) => i !== index)); };

  const handleEditClick = (guide: Guide, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setFormData({ 
          title: guide.title, 
          category: guide.category, 
          difficulty: guide.difficulty, 
          duration: guide.duration, 
          description: guide.description, 
          imageUrl: guide.imageUrl, 
          related: guide.related, 
          views: guide.views, 
          createdAt: guide.createdAt 
      });
      setSteps(guide.steps || []);
      setEditingId(guide.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDeleteConfirmationId(id); // Open custom modal
  }

  const confirmDelete = () => {
      if (deleteConfirmationId) {
          onDelete(deleteConfirmationId);
          setDeleteConfirmationId(null);
      }
  }

  const handleViewClick = (slug: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      window.location.hash = slug;
  }

  const handleResetForm = () => { setFormData(initialFormState); setSteps([{ step_title: '', step_content: '' }]); setEditingId(null); };

  const handleAiGeneration = async (mode: 'topic' | 'auto') => {
    if (mode === 'topic' && !aiTopic.trim()) return;
    setIsGenerating(true);
    
    try {
        const generatedData = await DataService.generateContentWithAI(mode, aiTopic, aiSelectedCategory, guides);
        
        if (generatedData) {
            setFormData({ 
                ...formData, 
                title: generatedData.title, 
                category: generatedData.category, 
                difficulty: generatedData.difficulty, 
                duration: generatedData.duration, 
                description: generatedData.description, 
                imageUrl: `https://source.unsplash.com/1600x900/?${encodeURIComponent(generatedData.imageKeyword || 'technology')}` 
            });
            if (generatedData.steps) setSteps(generatedData.steps);
            setIsAiModalOpen(false); 
            setAiTopic('');
            setAiSelectedCategory('');
        }
    } catch (error) { 
        console.error("AI Generation failed:", error); 
        alert("İçerik üretilirken hata oluştu."); 
    } finally { 
        setIsGenerating(false); 
    }
  };

  const handleSubmitContent = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors: Record<string, string> = {};
    if (!formData.title) validationErrors.title = 'Başlık zorunludur.';
    if (!formData.description) validationErrors.description = 'Açıklama zorunludur.';
    if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }
    
    setIsSaving(true);
    
    // Sağlamlaştırılmış SLUG oluşturma
    let slug = slugify(formData.title!);
    // Eğer slug boş kaldıysa (örn: sadece özel karakter girildiyse), timestamp kullan
    if (!slug) slug = `guide-${Date.now()}`;
    
    const newGuide: Guide = {
        id: editingId || Date.now().toString(),
        title: formData.title!,
        slug: slug,
        language: 'tr', 
        category: formData.category || 'Genel',
        difficulty: (formData.difficulty as any) || 'Kolay',
        duration: formData.duration!,
        description: formData.description!,
        imageUrl: formData.imageUrl || 'https://picsum.photos/800/600',
        steps: steps.filter(s => s.step_title.trim()),
        related: [],
        views: formData.views,
        createdAt: formData.createdAt || Date.now()
    };

    const shouldTranslate = !editingId;
    
    try {
        await onSave(newGuide, shouldTranslate);
        setSaveSuccess(true); 
        setTimeout(() => setSaveSuccess(false), 3000); 
        handleResetForm();
    } catch(err: any) {
        alert("Kaydetme hatası: " + err.message);
    } finally {
        setIsSaving(false);
    }
  };

  const handleSettingsSave = async (e: React.FormEvent) => {
      e.preventDefault();
      // Ensure theme matches currently selected if changed via buttons but not saved
      const finalSettings = {
          ...localSettings,
          themeColor: themeColor // Use context theme color as source of truth for saving
      };
      
      await updateSettings(finalSettings);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
  };
  
  const updateHeroText = (field: 'title' | 'titleHighlight' | 'description', value: string) => {
      setLocalSettings(prev => ({
          ...prev,
          hero: {
              ...prev.hero,
              [language]: {
                  ...prev.hero[language],
                  [field]: value
              }
          }
      }));
  };

  const updateSocial = (field: keyof SocialConfig, value: string) => {
      setLocalSettings(prev => ({
          ...prev,
          socials: {
              ...prev.socials,
              [field]: value
          }
      }));
  };

  const updateAutoGen = (field: string, value: any) => {
      setLocalSettings(prev => {
          const newAutoGen = {
              ...prev.autoGen,
              [field]: value
          };

          // SYNC LOGIC: If intervalMinutes changes, automatically update nextRunTime
          // This ensures the "Next Production Time" reflects "Now + New Interval" immediately
          if (field === 'intervalMinutes') {
              const mins = typeof value === 'string' ? parseInt(value) : value;
              if (!isNaN(mins) && mins > 0) {
                  // Set next run time to NOW + X Minutes
                  newAutoGen.nextRunTime = Date.now() + (mins * 60 * 1000);
                  // Ensure we unlock generation if we are resetting the timer
                  newAutoGen.isGenerating = false;
              }
          }

          return {
              ...prev,
              autoGen: newAutoGen
          };
      });
  }

  const handleResetTimer = () => {
      const now = Date.now();
      // Set to 10 seconds from now for immediate testing effect (or based on current interval)
      // To respect the interval, we could use: now + (localSettings.autoGen.intervalMinutes * 60000)
      // But user likely wants a quick reset. Let's start the cycle based on the current interval.
      const intervalMs = (localSettings.autoGen.intervalMinutes || 1440) * 60 * 1000;
      
      setLocalSettings(prev => ({
          ...prev,
          autoGen: {
              ...prev.autoGen,
              nextRunTime: now + intervalMs,
              isGenerating: false
          }
      }));
  };

  return (
    <div className="animate-fade-in pb-20 relative">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-900 text-white rounded-xl shadow-lg shadow-slate-900/20"><Layout size={24} /></div>
            <div><h1 className="text-2xl font-bold text-slate-900">{t('adminPanel')}</h1><p className="text-slate-500 text-sm">{t('adminTitle')}</p></div>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-slate-200">
            <button onClick={() => setActiveTab('content')} type="button" className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'content' ? 'bg-brand-100 text-brand-900' : 'text-slate-500 hover:text-slate-900'}`}>{t('contentMgmt')}</button>
            <button onClick={() => setActiveTab('settings')} type="button" className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'settings' ? 'bg-brand-100 text-brand-900' : 'text-slate-500 hover:text-slate-900'}`}><Settings size={14} /> {t('siteSettings')}</button>
        </div>
        <button onClick={onCancel} type="button" className="hidden md:flex text-slate-400 hover:text-red-500 items-center gap-1 font-medium text-sm"><X size={16} /> {t('closePanel')}</button>
      </div>

      {activeTab === 'content' ? (
        <>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-800">{editingId ? t('editGuide') : t('newGuide')}</h2>
                <div className="flex gap-2">
                    {editingId && <button onClick={handleResetForm} type="button" className="bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-slate-300">{t('cancel')}</button>}
                    <button onClick={() => setIsAiModalOpen(true)} type="button" className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-200"><Sparkles size={14} /> {t('aiAssistant')}</button>
                </div>
            </div>
            <form onSubmit={handleSubmitContent} className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('title')}</label><input name="title" value={formData.title} onChange={handleChange} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm ${errors.title ? 'border-red-500' : 'border-slate-200'}`} /></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('category')}</label><input name="category" value={formData.category} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" /></div>
                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('difficulty')}</label><select name="difficulty" value={formData.difficulty} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none"><option value="Kolay">Kolay</option><option value="Orta">Orta</option><option value="İleri">İleri</option></select></div>
                        </div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('duration')}</label><input name="duration" value={formData.duration} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Örn: 3 Gün" /></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('image')}</label><div className="relative"><ImageIcon size={14} className="absolute left-3 top-2.5 text-slate-400" /><input name="imageUrl" value={formData.imageUrl} onChange={handleChange} className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" /></div></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('desc')}</label><textarea name="description" value={formData.description} onChange={handleChange} rows={4} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none" /></div>
                    </div>
                </div>
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100"><h3 className="font-bold text-slate-900">{t('stepsTitle')}</h3><button type="button" onClick={addStep} className="text-brand-600 text-xs font-bold hover:underline flex items-center gap-1"><Plus size={14} /> {t('add')}</button></div>
                        <div className="space-y-4">{steps.map((step, index) => (<div key={index} className="flex gap-3 bg-slate-50 p-4 rounded-lg border border-slate-100"><span className="flex-shrink-0 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-500">{index + 1}</span><div className="flex-grow space-y-2"><input value={step.step_title} onChange={(e) => handleStepChange(index, 'step_title', e.target.value)} className="w-full bg-transparent border-b border-transparent focus:border-brand-300 outline-none font-bold text-slate-800 text-sm pb-1" placeholder={t('stepTitlePlaceholder')} /><textarea value={step.step_content} onChange={(e) => handleStepChange(index, 'step_content', e.target.value)} rows={2} className="w-full bg-white border border-slate-200 rounded p-2 text-xs focus:ring-1 focus:ring-brand-200 outline-none resize-none" placeholder={t('stepDescPlaceholder')} /></div>{steps.length > 1 && <button type="button" onClick={() => removeStep(index)} className="text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>}</div>))}</div>
                    </div>
                    <div className="flex items-center justify-between">
                        {saveSuccess ? <div className="text-green-600 font-bold flex items-center gap-1"><Check size={18} /> {t('saved')}</div> : <div></div>}
                        <button type="submit" disabled={isSaving} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 shadow-lg flex items-center gap-2 disabled:opacity-70">
                            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} 
                            {editingId ? t('update') : t('saveAndPublish')}
                        </button>
                    </div>
                </div>
            </form>
            <div className="flex justify-between items-center mb-6 pt-6 border-t border-slate-200"><h2 className="text-lg font-bold text-slate-800">{t('existingContent')}</h2><span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">{guides.length}</span></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {guides.map(guide => {
                     const dateStr = guide.createdAt ? new Date(guide.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
                     return (
                         <div key={guide.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full relative hover:shadow-md transition-shadow">
                            
                             <div className="h-40 overflow-hidden relative bg-slate-100">
                                 <img src={guide.imageUrl} alt={guide.title} className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity" loading="lazy" onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop"; }} />
                                 <div className="absolute top-3 left-3"><span className="bg-white/95 backdrop-blur-sm text-slate-800 text-[10px] font-bold px-2 py-1 rounded shadow-sm uppercase">{guide.category}</span></div>
                             </div>
                             
                             <div className="p-4 flex flex-col flex-grow">
                                 <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold mb-2">{dateStr && <span className="flex items-center gap-1"><CalendarDays size={12} /> {dateStr}</span>}<span className="flex items-center gap-1"><Eye size={12} /> {guide.views || 0}</span></div>
                                 <h3 className="text-sm font-bold text-slate-900 mb-2 line-clamp-2 min-h-[2.5rem] leading-snug">{guide.title}</h3>
                                 <div className="flex items-center gap-3 mt-auto text-[10px] font-bold text-slate-400 uppercase"><span className="flex items-center gap-1"><Clock size={12} /> {guide.duration}</span><span className="flex items-center gap-1"><BarChart size={12} /> {guide.difficulty}</span></div>
                             </div>

                             {/* Lang Badge */}
                             <div className="absolute top-2 left-2 z-10 pointer-events-none">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase shadow-sm ${guide.language === 'en' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>{guide.language}</span>
                            </div>

                             {/* Action Buttons - Fixed z-index and clickability */}
                             <div className="absolute top-2 right-2 z-[100] flex gap-2">
                                <button type="button" onClick={(e) => handleViewClick(guide.slug, e)} className="bg-white text-slate-700 p-2 rounded-lg shadow-md hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer border border-slate-100" title="Görüntüle"><ExternalLink size={16} /></button>
                                <button type="button" onClick={(e) => handleEditClick(guide, e)} className="bg-white text-brand-700 p-2 rounded-lg shadow-md hover:bg-brand-50 hover:text-brand-900 transition-colors cursor-pointer border border-slate-100" title="Düzenle"><Edit size={16} /></button>
                                <button type="button" onClick={(e) => handleDeleteClick(guide.id, e)} className="bg-white text-red-500 p-2 rounded-lg shadow-md hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer border border-slate-100" title="Sil"><Trash2 size={16} /></button>
                            </div>
                         </div>
                     );
                })}
            </div>
        </>
      ) : (
        <form onSubmit={handleSettingsSave} className="max-w-4xl mx-auto space-y-8">
            
            {/* Auto Generation Settings */}
             <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2"><Bot size={20} className="text-brand-600" /> {t('autoGenTitle')}</h3>
                <p className="text-sm text-slate-500 mb-6 border-l-4 border-indigo-200 pl-4 py-1">{t('autoGenDesc')}</p>
                
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={localSettings.autoGen?.enabled || false} onChange={(e) => updateAutoGen('enabled', e.target.checked)} />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                        <span className="text-sm font-bold text-slate-700">{t('enableAutoGen')}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                             <label className="block text-sm font-semibold text-slate-700 mb-2">{t('intervalMinutes')}</label>
                             <input type="number" min="10" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" value={localSettings.autoGen?.intervalMinutes || 1440} onChange={(e) => updateAutoGen('intervalMinutes', parseInt(e.target.value))} />
                         </div>
                         <div>
                             <label className="block text-sm font-semibold text-slate-700 mb-2">{t('nextGenTime')}</label>
                             <div className="flex items-center gap-3">
                                 <div className="bg-slate-100 px-4 py-2 rounded-lg text-sm text-slate-600 font-mono border border-slate-200 flex-grow">
                                     {localSettings.autoGen?.nextRunTime ? new Date(localSettings.autoGen.nextRunTime).toLocaleString('tr-TR') : '-'}
                                 </div>
                                 <button type="button" onClick={handleResetTimer} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg border border-indigo-100 transition-colors" title={t('resetTimer')}>
                                     <RefreshCw size={18} />
                                 </button>
                             </div>
                         </div>
                    </div>
                </div>
            </div>

            {/* Hero Content Settings */}
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2"><TypeIcon size={20} className="text-brand-600" /> Hero & Başlık Ayarları <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded border uppercase">{language}</span></h3>
                <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Ana Başlık</label>
                        <input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" value={localSettings.hero[language].title} onChange={(e) => updateHeroText('title', e.target.value)} />
                     </div>
                     <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Vurgulu Metin (Renkli)</label>
                        <input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" value={localSettings.hero[language].titleHighlight} onChange={(e) => updateHeroText('titleHighlight', e.target.value)} />
                     </div>
                     <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Alt Açıklama</label>
                        <textarea rows={3} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none resize-none" value={localSettings.hero[language].description} onChange={(e) => updateHeroText('description', e.target.value)} />
                     </div>
                </div>
            </div>

            {/* Theme Settings */}
             <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2"><Palette size={20} className="text-brand-600" /> {t('themeColor')} & Dil</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div>
                       <label className="block text-sm font-semibold text-slate-700 mb-3">Vurgu Rengi</label>
                       <div className="flex gap-3">
                            {(['default', 'indigo', 'green', 'rose', 'amber'] as ThemeColor[]).map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setThemeColor(color)}
                                    className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${themeColor === color ? 'border-slate-900 scale-110' : 'border-transparent hover:scale-105'}`}
                                >
                                    <div className={`w-8 h-8 rounded-full ${
                                        color === 'default' ? 'bg-slate-500' : 
                                        color === 'indigo' ? 'bg-indigo-500' :
                                        color === 'green' ? 'bg-green-500' :
                                        color === 'rose' ? 'bg-rose-500' : 'bg-amber-500'
                                    }`}></div>
                                </button>
                            ))}
                       </div>
                   </div>

                   <div>
                       <label className="block text-sm font-semibold text-slate-700 mb-3">Yönetim Paneli Dili</label>
                       <div className="flex gap-2 bg-slate-100 p-1 rounded-lg inline-flex">
                           <button onClick={() => setLanguage('tr')} type="button" className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${language === 'tr' ? 'bg-white shadow-sm text-brand-900' : 'text-slate-500'}`}>Türkçe</button>
                           <button onClick={() => setLanguage('en')} type="button" className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${language === 'en' ? 'bg-white shadow-sm text-brand-900' : 'text-slate-500'}`}>English</button>
                       </div>
                   </div>
                </div>
            </div>

            {/* Social Links */}
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2"><Globe size={20} className="text-brand-600" /> {t('socialLinks')}</h3>
                <div className="space-y-5">
                    <div><label className="block text-sm font-semibold text-slate-700 mb-1">Twitter (X)</label><input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" placeholder="https://twitter.com/..." value={localSettings.socials.twitter} onChange={(e) => updateSocial('twitter', e.target.value)} /></div>
                    <div><label className="block text-sm font-semibold text-slate-700 mb-1">Instagram</label><input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" placeholder="https://instagram.com/..." value={localSettings.socials.instagram} onChange={(e) => updateSocial('instagram', e.target.value)} /></div>
                    <div><label className="block text-sm font-semibold text-slate-700 mb-1">YouTube</label><input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" placeholder="https://youtube.com/..." value={localSettings.socials.youtube} onChange={(e) => updateSocial('youtube', e.target.value)} /></div>
                    <div><label className="block text-sm font-semibold text-slate-700 mb-1">LinkedIn</label><input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" placeholder="https://linkedin.com/in/..." value={localSettings.socials.linkedin} onChange={(e) => updateSocial('linkedin', e.target.value)} /></div>
                </div>
                <div className="mt-8 flex items-center justify-between">{settingsSaved ? <span className="text-green-600 font-bold text-sm animate-fade-in">{t('saved')}</span> : <span></span>}<button type="submit" className="bg-brand-900 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-brand-800 transition-colors">{t('saveSettings')}</button></div>
            </div>
        </form>
      )}

      {isAiModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden">
                <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center text-white"><h3 className="font-bold flex items-center gap-2"><Bot size={20} /> {t('aiAssistant')}</h3><button onClick={() => setIsAiModalOpen(false)}><X size={20} /></button></div>
                <div className="p-6">
                    <div className="mb-4">
                        <label className="block text-sm font-bold text-slate-700 mb-2">{t('aiPrompt')}</label>
                        <input type="text" value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} placeholder="Örn: Etkili Zaman Yönetimi" className="w-full px-4 py-3 text-base border-2 border-slate-200 rounded-xl focus:border-indigo-500 outline-none" />
                        <button onClick={() => handleAiGeneration('topic')} disabled={isGenerating || !aiTopic} className="mt-2 w-full bg-indigo-600 text-white py-2.5 rounded-xl font-bold flex justify-center items-center gap-2 disabled:bg-slate-300 hover:bg-indigo-700 transition-colors">{isGenerating && aiTopic ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />} {t('generateTopic')}</button>
                    </div>
                    
                    <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-slate-200"></div>
                        <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase">VEYA</span>
                        <div className="flex-grow border-t border-slate-200"></div>
                    </div>

                    <div className="mt-2">
                         <label className="block text-sm font-bold text-slate-700 mb-2">Kategori (Opsiyonel)</label>
                         <select 
                            value={aiSelectedCategory} 
                            onChange={(e) => setAiSelectedCategory(e.target.value)} 
                            className="w-full px-4 py-3 text-base border-2 border-slate-200 rounded-xl focus:border-purple-500 outline-none bg-white mb-2 text-slate-700"
                        >
                            <option value="">Rastgele Seç (Sürpriz)</option>
                            {VALID_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <button onClick={() => handleAiGeneration('auto')} disabled={isGenerating} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2.5 rounded-xl font-bold flex justify-center items-center gap-2 disabled:opacity-50 hover:opacity-90 transition-opacity">
                            {isGenerating && !aiTopic ? <Loader2 className="animate-spin" /> : <Wand2 size={18} />} 
                            {aiSelectedCategory ? `"${aiSelectedCategory}" Konusu Üret` : t('youPickTopic')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {deleteConfirmationId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 space-y-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600 mb-2">
                    <Trash2 size={24} />
                </div>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-slate-900">Rehberi Sil?</h3>
                    <p className="text-slate-500 text-sm mt-1">Bu işlem geri alınamaz. Devam etmek istiyor musunuz?</p>
                </div>
                <div className="flex gap-3 mt-4">
                    <button onClick={() => setDeleteConfirmationId(null)} className="flex-1 py-2.5 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors">İptal</button>
                    <button onClick={confirmDelete} className="flex-1 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-lg shadow-red-200">Evet, Sil</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;