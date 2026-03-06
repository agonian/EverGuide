import React, { useState, useEffect } from 'react';
import { Guide, Step, SocialConfig, SiteSettings, ThemeColor } from '../types';
import { Plus, Trash2, Save, Layout, Image as ImageIcon, Sparkles, Bot, X, Loader2, Settings, Globe, Wand2, Edit, Check, Clock, BarChart, CalendarDays, Eye, Palette, ExternalLink, Type as TypeIcon, RefreshCw, Key, FileJson, Download } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { DataService, VALID_CATEGORIES, slugify } from '../services/db';

interface AdminPanelProps {
  guides: Guide[];
  onSave: (guide: Guide) => void;
  onDelete: (id: string) => void;
  onCancel: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ guides, onSave, onDelete, onCancel }) => {
  const { themeColor, setThemeColor, settings, updateSettings } = useApp();
  const [activeTab, setActiveTab] = useState<'content' | 'settings' | 'api'>('content');

  // Content Form State
  const initialFormState: Partial<Guide> = { title: '', category: 'Genel', difficulty: 'Kolay', duration: '', description: '', imageUrl: '', related: [] };
  const [formData, setFormData] = useState<Partial<Guide>>(initialFormState);
  const [steps, setSteps] = useState<Step[]>([{ step_title: '', step_content: '' }]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Settings Form State
  const [localSettings, setLocalSettings] = useState<SiteSettings>(settings);
  const [settingsSaved, setSettingsSaved] = useState(false);
  
  // API Keys Form State
  const [apiKeys, setApiKeys] = useState({
      googleAds: ''
  });
  
  // Sitemap Generation State
  const [isGeneratingSitemap, setIsGeneratingSitemap] = useState(false);

  useEffect(() => {
      setLocalSettings(settings);
      // Load keys: Try settings (DB) first for Ads, then local storage fallback, then .env default
      setApiKeys({
          googleAds: settings.apiKeys?.googleAdsId || localStorage.getItem('evergreen_google_ads_id') || import.meta.env?.VITE_GOOGLE_ADS_ID || ''
      });
  }, [settings]);
  
  // Confirmation Modal State
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  
  // AI Modal States
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiSelectedCategory, setAiSelectedCategory] = useState(''); 
  const [isGenerating, setIsGenerating] = useState(false);

  const difficultyOptions = ['Kolay', 'Orta', 'İleri'];
  const categorySuggestions = VALID_CATEGORIES;
  const durationPlaceholder = "Örn: 3 Gün";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'title') setErrors(prev => ({ ...prev, title: '' }));
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
      setDeleteConfirmationId(id); 
  }

  const confirmDelete = () => {
      if (deleteConfirmationId) {
          onDelete(deleteConfirmationId);
          setDeleteConfirmationId(null);
      }
  }

  const handleViewClick = (guide: Guide, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      window.open(`/guide/${guide.slug || guide.id}`, '_blank');
  }

  const handleResetForm = () => { setFormData(initialFormState); setSteps([{ step_title: '', step_content: '' }]); setEditingId(null); };

  const handleAiGeneration = async (mode: 'topic' | 'auto') => {
    if (mode === 'topic' && !aiTopic.trim()) return;
    setIsGenerating(true);
    
    try {
        const generatedData = await DataService.generateContentWithAI(mode, aiTopic, aiSelectedCategory, guides);
        
        if (generatedData) {
            // Image is already generated by generateContentWithAI (Gemini or Pollinations fallback)
            const imageUrl = generatedData.imageUrl || `https://picsum.photos/seed/${Date.now()}/800/600`;

            setFormData({ 
                ...formData, 
                title: generatedData.title, 
                category: generatedData.category, 
                difficulty: generatedData.difficulty, 
                duration: generatedData.duration, 
                description: generatedData.description, 
                imageUrl: imageUrl
            });
            if (generatedData.steps) setSteps(generatedData.steps);
            setIsAiModalOpen(false); 
            setAiTopic('');
            setAiSelectedCategory('');
        }
    } catch (error) { 
        console.error("AI Generation failed:", error); 
        alert("İçerik üretilirken hata oluştu. API Key'inizi kontrol edin."); 
    } finally { 
        setIsGenerating(false); 
    }
  };

  const handleRegenerateImage = async () => {
    if (!formData.title) return;
    setIsGenerating(true);
    try {
        const newImageUrl = await DataService.generateImage(formData.title);
        if (newImageUrl) {
            setFormData(prev => ({ ...prev, imageUrl: newImageUrl }));
        } else {
            alert("Görsel üretilemedi.");
        }
    } catch (error) {
        console.error("Image regeneration failed:", error);
        alert("Görsel üretilirken hata oluştu.");
    } finally {
        setIsGenerating(false);
    }
  };

  const uploadImageToServer = async (base64Image: string, slug: string): Promise<string | null> => {
      try {
          const response = await fetch('/api/upload-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: base64Image, slug })
          });
          
          if (response.ok) {
              const data = await response.json();
              return data.url;
          } else {
              console.error("Upload failed with status:", response.status);
              return null;
          }
      } catch (error) {
          console.error("Upload failed:", error);
          return null;
      }
  };

  const handleSubmitContent = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors: Record<string, string> = {};
    if (!formData.title) validationErrors.title = 'Başlık zorunludur.';
    if (!formData.description) validationErrors.description = 'Açıklama zorunludur.';
    if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }
    
    setIsSaving(true);
    
    let slug = slugify(formData.title!);
    if (!slug) slug = `guide-${Date.now()}`;

    // Handle Image Upload if Base64
    let finalImageUrl = formData.imageUrl;
    if (finalImageUrl && finalImageUrl.startsWith('data:image')) {
        const uploadedUrl = await uploadImageToServer(finalImageUrl, slug);
        if (uploadedUrl) {
            finalImageUrl = uploadedUrl;
        } else {
            alert("Görsel sunucuya yüklenemedi, işlem iptal edildi.");
            setIsSaving(false);
            return;
        }
    }
    
    const newGuide: Guide = {
        id: editingId || Date.now().toString(),
        title: formData.title!,
        slug: slug,
        category: formData.category || 'Genel',
        difficulty: (formData.difficulty as any) || 'Kolay',
        duration: formData.duration!,
        description: formData.description!,
        imageUrl: finalImageUrl || 'https://picsum.photos/800/600',
        steps: steps.filter(s => s.step_title.trim()),
        related: [],
        views: formData.views,
        createdAt: formData.createdAt || Date.now()
    };

    try {
        await onSave(newGuide);
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
      const finalSettings = { ...localSettings };
      await updateSettings(finalSettings);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
  };
  
  const handleApiKeysSave = async (e: React.FormEvent) => {
      e.preventDefault();
      
      // Save Ads keys to BOTH LocalStorage (backup) and Firestore Settings (Primary for persistence)
      localStorage.setItem('evergreen_google_ads_id', apiKeys.googleAds.trim());

      // Update global settings in DB with new keys
      const updatedSettings: SiteSettings = {
          ...settings,
          apiKeys: {
              ...settings.apiKeys, // preserve other keys if any
              gemini: undefined, // remove gemini key from DB if it was there
              googleAdsId: apiKeys.googleAds.trim()
          }
      };
      
      try {
        await updateSettings(updatedSettings);
        alert("API Anahtarları veritabanına ve tarayıcıya kaydedildi! Uygulama yeniden başlatılıyor...");
        
        // FIX: Safer reload for Blob/Preview environments
        try {
            window.location.href = window.location.href.split('#')[0];
        } catch (e) {
            window.location.reload();
        }
        
      } catch (err: any) {
          console.error("Failed to save keys to DB:", err);
          alert("Veritabanına kayıt başarısız oldu, ancak yerel olarak kaydedildi. Sayfa yenileniyor.");
          try {
            window.location.href = window.location.href.split('#')[0];
          } catch (e) {
            window.location.reload();
          }
      }
  };

  const handleDownloadSitemap = async () => {
    setIsGeneratingSitemap(true);
    try {
        const allGuides = await DataService.getAllGuides();
        const baseUrl = "https://guidelonia.com";
        const today = new Date().toISOString().split('T')[0];

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

        allGuides.forEach(g => {
            const date = new Date(g.createdAt || Date.now()).toISOString().split('T')[0];
            xml += `
  <url>
    <loc>${baseUrl}/guide/${g.slug}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
        });

        xml += `\n</urlset>`;

        // Trigger Download
        const blob = new Blob([xml], { type: 'text/xml' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sitemap.xml';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        alert(`Sitemap başarıyla oluşturuldu!\n\nToplam ${allGuides.length} rehber eklendi.\nBu dosyayı projenizin 'public' klasörüne koyup deploy etmelisiniz.`);

    } catch (e) {
        console.error("Sitemap generation failed", e);
        alert("Sitemap oluşturulurken bir hata oluştu.");
    } finally {
        setIsGeneratingSitemap(false);
    }
  };
  
  const updateHeroText = (field: 'title' | 'titleHighlight' | 'description', value: string) => {
      setLocalSettings(prev => ({
          ...prev,
          hero: { ...prev.hero, [field]: value }
      }));
  };

  const updateSocial = (field: keyof SocialConfig, value: string) => {
      setLocalSettings(prev => ({
          ...prev,
          socials: { ...prev.socials, [field]: value }
      }));
  };

  const updateAutoGen = (field: string, value: any) => {
      setLocalSettings(prev => {
          const newAutoGen = { ...prev.autoGen, [field]: value };
          if (field === 'intervalMinutes') {
              const mins = typeof value === 'string' ? parseInt(value) : value;
              if (!isNaN(mins) && mins > 0) {
                  newAutoGen.nextRunTime = Date.now() + (mins * 60 * 1000);
                  newAutoGen.isGenerating = false;
              }
          }
          return { ...prev, autoGen: newAutoGen };
      });
  }

  const handleResetTimer = () => {
      const now = Date.now();
      const intervalMs = (localSettings.autoGen.intervalMinutes || 1440) * 60 * 1000;
      setLocalSettings(prev => ({
          ...prev,
          autoGen: { ...prev.autoGen, nextRunTime: now + intervalMs, isGenerating: false }
      }));
  };

  return (
    <div className="animate-fade-in pb-20 relative">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-900 dark:bg-slate-800 text-white rounded-xl shadow-lg shadow-slate-900/20"><Layout size={24} /></div>
            <div><h1 className="text-2xl font-bold text-slate-900 dark:text-white">Yönetim Paneli</h1><p className="text-slate-500 dark:text-slate-400 text-sm">İçerik ve site ayarlarını yönetin</p></div>
        </div>
        <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
            <button onClick={() => setActiveTab('content')} type="button" className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'content' ? 'bg-brand-100 text-brand-900 dark:bg-brand-900 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}>İçerik Yönetimi</button>
            <button onClick={() => setActiveTab('settings')} type="button" className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'settings' ? 'bg-brand-100 text-brand-900 dark:bg-brand-900 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}><Settings size={14} /> Site Ayarları</button>
            <button onClick={() => setActiveTab('api')} type="button" className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'api' ? 'bg-brand-100 text-brand-900 dark:bg-brand-900 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}><Key size={14} /> API Yapılandırma</button>
        </div>
        <button onClick={onCancel} type="button" className="hidden md:flex text-slate-400 hover:text-red-500 items-center gap-1 font-medium text-sm"><X size={16} /> Paneli Kapat</button>
      </div>

      {activeTab === 'content' && (
        <>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">{editingId ? 'Rehberi Düzenle' : 'Yeni Rehber Ekle'}</h2>
                <div className="flex gap-2">
                    {editingId && <button onClick={handleResetForm} type="button" className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-slate-300 dark:hover:bg-slate-600">İptal</button>}
                    <button onClick={() => setIsAiModalOpen(true)} type="button" className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-200"><Sparkles size={14} /> AI Asistanı</button>
                </div>
            </div>
            <form onSubmit={handleSubmitContent} className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                        
                        <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Başlık</label><input name="title" value={formData.title} onChange={handleChange} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm dark:bg-slate-900 dark:text-white dark:border-slate-600 ${errors.title ? 'border-red-500' : 'border-slate-200'}`} /></div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Kategori</label>
                                <input 
                                    name="category" 
                                    value={formData.category} 
                                    onChange={handleChange} 
                                    list="category-suggestions"
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" 
                                />
                                <datalist id="category-suggestions">
                                    {categorySuggestions.map(cat => (
                                        <option key={cat} value={cat} />
                                    ))}
                                </datalist>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Zorluk</label>
                                <select name="difficulty" value={formData.difficulty} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none">
                                    {difficultyOptions.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Süre</label><input name="duration" value={formData.duration} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder={durationPlaceholder} /></div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Kapak Görseli</label>
                            
                            {formData.imageUrl && (
                                <div className="mb-3 relative group">
                                    <img src={formData.imageUrl} alt="Preview" className="w-full h-48 object-cover rounded-lg border border-slate-200 dark:border-slate-600" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                        <button type="button" onClick={handleRegenerateImage} disabled={isGenerating} className="bg-white text-slate-900 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-100">
                                            {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                                            Yeniden Üret
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="relative">
                                <ImageIcon size={14} className="absolute left-3 top-2.5 text-slate-400" />
                                <input name="imageUrl" value={formData.imageUrl} onChange={handleChange} className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Görsel URL veya Base64" />
                            </div>
                            <button type="button" onClick={handleRegenerateImage} disabled={isGenerating || !formData.title} className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                                <Sparkles size={12} /> Yapay Zeka ile Görsel Üret
                            </button>
                        </div>
                        <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Açıklama</label><textarea name="description" value={formData.description} onChange={handleChange} rows={4} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none" /></div>
                    </div>
                </div>
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-700"><h3 className="font-bold text-slate-900 dark:text-white">Adımlar</h3><button type="button" onClick={addStep} className="text-brand-600 text-xs font-bold hover:underline flex items-center gap-1"><Plus size={14} /> Ekle</button></div>
                        <div className="space-y-4">{steps.map((step, index) => (<div key={index} className="flex gap-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700"><span className="flex-shrink-0 w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-full flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400">{index + 1}</span><div className="flex-grow space-y-2"><input value={step.step_title} onChange={(e) => handleStepChange(index, 'step_title', e.target.value)} className="w-full bg-transparent border-b border-transparent focus:border-brand-300 outline-none font-bold text-slate-800 dark:text-slate-200 text-sm pb-1" placeholder="Adım Başlığı" /><textarea value={step.step_content} onChange={(e) => handleStepChange(index, 'step_content', e.target.value)} rows={2} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded p-2 text-xs focus:ring-1 focus:ring-brand-200 dark:text-slate-300 outline-none resize-none" placeholder="Adım Detayı" /></div>{steps.length > 1 && <button type="button" onClick={() => removeStep(index)} className="text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>}</div>))}</div>
                    </div>
                    <div className="flex items-center justify-between">
                        {saveSuccess ? <div className="text-green-600 font-bold flex items-center gap-1"><Check size={18} /> Kaydedildi</div> : <div></div>}
                        <button type="submit" disabled={isSaving} className="bg-slate-900 dark:bg-slate-700 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 shadow-lg flex items-center gap-2 disabled:opacity-70">
                            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} 
                            {editingId ? 'Güncelle' : 'Kaydet ve Yayınla'}
                        </button>
                    </div>
                </div>
            </form>
            <div className="flex justify-between items-center mb-6 pt-6 border-t border-slate-200 dark:border-slate-700"><h2 className="text-lg font-bold text-slate-800 dark:text-white">Mevcut İçerikler</h2><span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">{guides.length}</span></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {guides.map(guide => {
                     const dateStr = guide.createdAt ? new Date(guide.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
                     return (
                         <div key={guide.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-full relative hover:shadow-md transition-shadow">
                            
                             <div className="h-40 overflow-hidden relative bg-slate-100 dark:bg-slate-900">
                                 <img 
                                    src={guide.imageUrl} 
                                    alt={guide.title} 
                                    className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity" 
                                    loading="lazy" 
                                    onError={(e) => { 
                                        e.currentTarget.src = `https://picsum.photos/seed/${guide.id}/800/600`; 
                                        e.currentTarget.onerror = null;
                                    }} 
                                 />
                                 <div className="absolute top-3 left-3"><span className="bg-white/95 backdrop-blur-sm text-slate-800 text-[10px] font-bold px-2 py-1 rounded shadow-sm uppercase">{guide.category}</span></div>
                             </div>
                             
                             <div className="p-4 flex flex-col flex-grow">
                                 <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold mb-2">{dateStr && <span className="flex items-center gap-1"><CalendarDays size={12} /> {dateStr}</span>}<span className="flex items-center gap-1"><Eye size={12} /> {guide.views || 0}</span></div>
                                 <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 line-clamp-2 min-h-[2.5rem] leading-snug">{guide.title}</h3>
                                 <div className="flex items-center gap-3 mt-auto text-[10px] font-bold text-slate-400 uppercase"><span className="flex items-center gap-1"><Clock size={12} /> {guide.duration}</span><span className="flex items-center gap-1"><BarChart size={12} /> {guide.difficulty}</span></div>
                             </div>

                             <div className="absolute top-2 right-2 z-[100] flex gap-2">
                                <button type="button" onClick={(e) => handleViewClick(guide, e)} className="bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 p-2 rounded-lg shadow-md hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer border border-slate-100 dark:border-slate-600" title="Görüntüle"><ExternalLink size={16} /></button>
                                <button type="button" onClick={(e) => handleEditClick(guide, e)} className="bg-white dark:bg-slate-700 text-brand-700 dark:text-brand-400 p-2 rounded-lg shadow-md hover:bg-brand-50 dark:hover:bg-slate-600 transition-colors cursor-pointer border border-slate-100 dark:border-slate-600" title="Düzenle"><Edit size={16} /></button>
                                <button type="button" onClick={(e) => handleDeleteClick(guide.id, e)} className="bg-white dark:bg-slate-700 text-red-500 p-2 rounded-lg shadow-md hover:bg-red-50 dark:hover:bg-slate-600 transition-colors cursor-pointer border border-slate-100 dark:border-slate-600" title="Sil"><Trash2 size={16} /></button>
                            </div>
                         </div>
                     );
                })}
            </div>
        </>
      )}

      {activeTab === 'settings' && (
        <form onSubmit={handleSettingsSave} className="max-w-4xl mx-auto space-y-8">
            
            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm border-l-4 border-l-sky-500">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <FileJson size={20} className="text-sky-600" /> SEO / Sitemap
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                    Siteniz "Single Page App" (SPA) olduğu için ve verileriniz Firebase'de tutulduğu için, Google'ın sitenizi tarayabilmesi adına düzenli olarak güncel bir sitemap oluşturup yüklemeniz gerekir.
                    <br/><br/>
                    Aşağıdaki butona bastığınızda, veritabanındaki <strong>tüm ({guides.length} adet)</strong> rehberler çekilir, XML formatına dönüştürülür ve bilgisayarınıza indirilir. 
                    Bu dosyayı projenizin <code>public</code> klasörüne atıp yeniden deploy etmelisiniz.
                </p>
                <button 
                    type="button" 
                    onClick={handleDownloadSitemap} 
                    disabled={isGeneratingSitemap}
                    className="bg-sky-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-sky-700 transition-colors shadow-lg shadow-sky-200 dark:shadow-none flex items-center gap-2 disabled:opacity-70"
                >
                    {isGeneratingSitemap ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                    Sitemap Oluştur ve İndir
                </button>
            </div>

             <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2"><Bot size={20} className="text-brand-600" /> Otomatik İçerik Üretimi</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 border-l-4 border-indigo-200 dark:border-indigo-900 pl-4 py-1">Belirlenen aralıklarla yapay zeka tarafından otomatik olarak yeni rehberler oluşturulur.</p>
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={localSettings.autoGen?.enabled || false} onChange={(e) => updateAutoGen('enabled', e.target.checked)} />
                            <div className="w-11 h-6 bg-slate-200 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Otomatik Üretimi Etkinleştir</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                             <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Üretim Sıklığı (Dakika)</label>
                             <input type="number" min="1" className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" value={localSettings.autoGen?.intervalMinutes || 1440} onChange={(e) => updateAutoGen('intervalMinutes', parseInt(e.target.value))} />
                         </div>
                         <div>
                             <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Sonraki Üretim Zamanı</label>
                             <div className="flex items-center gap-3">
                                 <div className="bg-slate-100 dark:bg-slate-900 px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 font-mono border border-slate-200 dark:border-slate-600 flex-grow">
                                     {localSettings.autoGen?.nextRunTime ? new Date(localSettings.autoGen.nextRunTime).toLocaleString('tr-TR') : '-'}
                                 </div>
                                 <button type="button" onClick={handleResetTimer} className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-900 transition-colors" title="Zamanlayıcıyı Sıfırla">
                                     <RefreshCw size={18} />
                                 </button>
                             </div>
                         </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2"><TypeIcon size={20} className="text-brand-600" /> Hero & Başlık Ayarları</h3>
                <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Site İsmi (Logo Yazısı)</label>
                        <input type="text" className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" value={localSettings.siteName || ''} onChange={(e) => setLocalSettings({...localSettings, siteName: e.target.value})} placeholder="Örn: Evergreen Rehber" />
                     </div>
                     <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Ana Başlık</label>
                        <input type="text" className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" value={localSettings.hero.title} onChange={(e) => updateHeroText('title', e.target.value)} />
                     </div>
                     <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Vurgulu Metin (Renkli)</label>
                        <input type="text" className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" value={localSettings.hero.titleHighlight} onChange={(e) => updateHeroText('titleHighlight', e.target.value)} />
                     </div>
                     <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Alt Açıklama</label>
                        <textarea rows={3} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-brand-500 outline-none resize-none" value={localSettings.hero.description} onChange={(e) => updateHeroText('description', e.target.value)} />
                     </div>
                </div>
            </div>

             <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2"><Palette size={20} className="text-brand-600" /> Tema Rengi</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div>
                       <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Varsayılan Vurgu Rengi</label>
                       <p className="text-xs text-slate-500 mb-3">Bu, yeni gelen ziyaretçiler için varsayılan renktir. Kullanıcılar kendi tercihlerini yapabilirler.</p>
                       <div className="flex gap-3">
                            {(['default', 'indigo', 'green', 'rose', 'amber'] as ThemeColor[]).map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setThemeColor(color)}
                                    className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${themeColor === color ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent hover:scale-105'}`}
                                >
                                    <div className={`w-8 h-8 rounded-full ${color === 'default' ? 'bg-slate-500' : color === 'indigo' ? 'bg-indigo-500' : color === 'green' ? 'bg-green-500' : color === 'rose' ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                                </button>
                            ))}
                       </div>
                   </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2"><Globe size={20} className="text-brand-600" /> Sosyal Medya Linkleri</h3>
                <div className="space-y-5">
                    <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Twitter (X)</label><input type="text" className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" placeholder="https://twitter.com/..." value={localSettings.socials.twitter} onChange={(e) => updateSocial('twitter', e.target.value)} /></div>
                    <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Instagram</label><input type="text" className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" placeholder="https://instagram.com/..." value={localSettings.socials.instagram} onChange={(e) => updateSocial('instagram', e.target.value)} /></div>
                    <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">YouTube</label><input type="text" className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" placeholder="https://youtube.com/..." value={localSettings.socials.youtube} onChange={(e) => updateSocial('youtube', e.target.value)} /></div>
                    <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">LinkedIn</label><input type="text" className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" placeholder="https://linkedin.com/in/..." value={localSettings.socials.linkedin} onChange={(e) => updateSocial('linkedin', e.target.value)} /></div>
                </div>
                <div className="mt-8 flex items-center justify-between">{settingsSaved ? <span className="text-green-600 font-bold text-sm animate-fade-in">Ayarlar Kaydedildi</span> : <span></span>}<button type="submit" className="bg-brand-900 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-brand-800 transition-colors">Ayarları Kaydet</button></div>
            </div>
        </form>
      )}
      
      {activeTab === 'api' && (
          <form onSubmit={handleApiKeysSave} className="max-w-4xl mx-auto space-y-8">
              <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm border-l-4 border-l-green-500">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><Layout size={20} className="text-green-600" /> Google Ads (AdSense)</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                      Reklam yayıncısı kimliği (Publisher ID). Bu bilgi <strong>veritabanında (Settings)</strong> saklanır.
                  </p>
                  <input 
                    type="text"
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="ca-pub-0000000000000000"
                    value={apiKeys.googleAds}
                    onChange={(e) => setApiKeys({...apiKeys, googleAds: e.target.value})}
                  />
              </div>

              <div className="flex justify-end">
                  <button type="submit" className="bg-brand-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-brand-800 transition-colors shadow-lg flex items-center gap-2">
                      <Save size={18} /> Kaydet ve Uygula
                  </button>
              </div>
          </form>
      )}

      {isAiModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center text-white"><h3 className="font-bold flex items-center gap-2"><Bot size={20} /> AI Asistanı</h3><button onClick={() => setIsAiModalOpen(false)}><X size={20} /></button></div>
                <div className="p-6">
                    <div className="mb-4">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Konu Başlığı</label>
                        <input type="text" value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} placeholder="Örn: Etkili Zaman Yönetimi" className="w-full px-4 py-3 text-base border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-xl focus:border-indigo-500 outline-none" />
                        <button onClick={() => handleAiGeneration('topic')} disabled={isGenerating || !aiTopic} className="mt-2 w-full bg-indigo-600 text-white py-2.5 rounded-xl font-bold flex justify-center items-center gap-2 disabled:bg-slate-300 hover:bg-indigo-700 transition-colors">{isGenerating && aiTopic ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />} Konu Hakkında Üret</button>
                    </div>
                    
                    <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                        <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase">VEYA</span>
                        <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                    </div>

                    <div className="mt-2">
                         <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Kategori (Opsiyonel)</label>
                         <select 
                            value={aiSelectedCategory} 
                            onChange={(e) => setAiSelectedCategory(e.target.value)} 
                            className="w-full px-4 py-3 text-base border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-xl focus:border-purple-500 outline-none bg-white mb-2 text-slate-700"
                        >
                            <option value="">Rastgele Seç (Sürpriz)</option>
                            {VALID_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <button onClick={() => handleAiGeneration('auto')} disabled={isGenerating} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2.5 rounded-xl font-bold flex justify-center items-center gap-2 disabled:opacity-50 hover:opacity-90 transition-opacity">
                            {isGenerating && !aiTopic ? <Loader2 className="animate-spin" /> : <Wand2 size={18} />} 
                            {aiSelectedCategory ? `"${aiSelectedCategory}" Konusu Üret` : 'Rastgele Bir Konu Üret'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {deleteConfirmationId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 space-y-4">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto text-red-600 mb-2">
                    <Trash2 size={24} />
                </div>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Rehberi Sil?</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Bu işlem geri alınamaz. Devam etmek istiyor musunuz?</p>
                </div>
                <div className="flex gap-3 mt-4">
                    <button onClick={() => setDeleteConfirmationId(null)} className="flex-1 py-2.5 rounded-xl font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">İptal</button>
                    <button onClick={confirmDelete} className="flex-1 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-lg shadow-red-200">Evet, Sil</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
