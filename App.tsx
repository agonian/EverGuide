
import React, { useState, useEffect, useRef } from 'react';
import { Guide, Data } from './types';
import GuideList from './components/GuideList';
import GuideDetail from './components/GuideDetail';
import AdminPanel from './components/AdminPanel';
import { DataService } from './services/db';
import { isFirebaseEnabled } from './services/firebase';
import { AppProvider, useApp } from './contexts/AppContext';
import { BookOpen, Lock, X, LogIn, LogOut, Search, Twitter, Instagram, Youtube, Linkedin, Sparkles, LayoutDashboard, User, Database, Bot, CloudOff } from 'lucide-react';

// Inner App Component to use the Context Hook
const AppContent: React.FC = () => {
  const { t, language, setLanguage, settings, updateSettings } = useApp();
  const [data, setData] = useState<Data>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentRoute, setCurrentRoute] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [showAiRoadmapModal, setShowAiRoadmapModal] = useState<boolean>(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  
  // Ref to track if component is mounted to prevent state updates on unmount
  const isMounted = useRef(true);

  // INITIALIZATION
  useEffect(() => {
    isMounted.current = true;
    
    // Check if we are in forced offline/quota exceeded mode (Initial)
    setIsOfflineMode(DataService.isQuotaLimited());

    const initApp = async () => {
        setLoading(true);
        
        // Safety timeout to prevent infinite loading
        const safetyTimer = setTimeout(() => {
            if (isMounted.current) {
                console.warn("Initialization timed out. Forcing app load.");
                setLoading(false);
            }
        }, 5000); // 5 seconds max load time

        try {
            const storedAdmin = localStorage.getItem('evergreen_is_admin') === 'true';
            if (isMounted.current) setIsAuthenticated(storedAdmin);

            // FIX: If user is not admin but URL has #admin, clear it to prevent auto-open modal
            if (!storedAdmin && window.location.hash === '#admin') {
                try {
                    const cleanUrl = window.location.href.split('#')[0];
                    window.history.replaceState(null, '', cleanUrl);
                } catch (e) {
                    window.location.hash = '';
                }
                if (isMounted.current) setCurrentRoute('');
            }

            let currentUserId = localStorage.getItem('evergreen_user_id');
            if (!currentUserId) {
                currentUserId = 'user_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('evergreen_user_id', currentUserId);
            }
            if (isMounted.current) setUserId(storedAdmin ? 'admin' : currentUserId);

            // Fetch guides based on current language
            const guides = await DataService.getGuides(language);
            if (isMounted.current) {
                setData(guides);
                // Re-check quota status because fetching guides might have triggered the limit
                setIsOfflineMode(DataService.isQuotaLimited());
            }

            // AUTO-GENERATION CHECK (The "Surprise" feature)
            // Skip if firebase is disabled OR quota is exceeded
            if (isFirebaseEnabled && !DataService.isQuotaLimited()) {
                // We don't await this to block the UI, we let it run in background or fast-fail
                DataService.checkAndTriggerAutoGenerate().then(async (wasTriggered) => {
                    if (wasTriggered && isMounted.current) {
                         console.log("Auto-generation executed. Refreshing data...");
                         const freshGuides = await DataService.getGuides(language);
                         if (isMounted.current) setData(freshGuides);
                         const freshSettings = await DataService.getSettings();
                         if (isMounted.current) updateSettings(freshSettings);
                    }
                }).catch(err => console.warn("Auto-gen check failed silently:", err));
            }

        } catch (err) {
            console.error("Init Error", err);
            if (isMounted.current) setError("Veriler yüklenirken hata oluştu.");
        } finally {
            clearTimeout(safetyTimer);
            if (isMounted.current) setLoading(false);
        }
    };

    initApp();

    return () => {
        isMounted.current = false;
    };
  }, [language]); // Re-run when language changes

  // Handle Hash Routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      setCurrentRoute(hash);
      window.scrollTo(0, 0);
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // 404 Guard
  useEffect(() => {
    if (!loading && currentRoute && currentRoute !== 'admin' && data.length > 0) {
        const exists = data.some(g => g.slug === currentRoute);
        if (!exists) {
            try {
                const cleanUrl = window.location.href.split('#')[0];
                window.history.replaceState(null, '', cleanUrl);
            } catch (e) {
                window.location.hash = ''; 
            }
            setCurrentRoute('');
        }
    }
  }, [loading, currentRoute, data]);

  // Auth Protection
  useEffect(() => {
    if (currentRoute === 'admin' && !isAuthenticated) {
        setShowLoginModal(true);
    }
  }, [currentRoute, isAuthenticated]);

  const handleSaveGuide = async (guideData: Guide, shouldTranslate: boolean) => {
    const newGuide = { ...guideData, createdAt: guideData.createdAt || Date.now() };
    
    if (newGuide.language === language) {
        const isEdit = data.some(g => g.id === newGuide.id);
        if (isEdit) {
            setData(data.map(g => g.id === newGuide.id ? newGuide : g));
        } else {
            setData([newGuide, ...data]);
        }
    }
    
    await DataService.saveGuide(newGuide, shouldTranslate);
    const guides = await DataService.getGuides(language);
    setData(guides);
  };

  const handleDeleteGuide = async (id: string) => {
      const previousData = [...data];
      setData(data.filter(g => g.id !== id));
      
      try {
          await DataService.deleteGuide(id);
      } catch (err: any) {
          console.error("Delete failed:", err);
          alert("Silme işlemi başarısız oldu: " + err.message);
          setData(previousData);
      }
  };

  const incrementViewCount = async (id: string) => {
      setData(prev => prev.map(g => g.id === id ? { ...g, views: (g.views || 0) + 1 } : g));
      await DataService.incrementView(id);
  };

  const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      if (loginForm.username === 'admin' && loginForm.password === '12345') {
          setIsAuthenticated(true);
          setUserId('admin');
          localStorage.setItem('evergreen_is_admin', 'true');
          setShowLoginModal(false);
          setLoginError('');
          setLoginForm({ username: '', password: '' });
          window.location.hash = 'admin';
      } else {
          setLoginError('Kullanıcı adı veya şifre hatalı.');
      }
  };

  const logout = () => {
      setIsAuthenticated(false);
      const guestId = localStorage.getItem('evergreen_user_id') || 'guest';
      setUserId(guestId);
      localStorage.removeItem('evergreen_is_admin');
      window.location.hash = ''; 
  };

  const renderContent = () => {
    if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div></div>;
    if (error) return <div className="text-center py-20 text-red-600">{error}</div>;

    if (currentRoute === 'admin') {
        if (!isAuthenticated) return <GuideList guides={data} userId={userId} searchTerm={searchTerm} onSearchChange={setSearchTerm} />;
        return (
            <AdminPanel 
                guides={data}
                onSave={handleSaveGuide} 
                onDelete={handleDeleteGuide}
                onCancel={() => window.location.hash = ''} 
            />
        );
    }

    const activeGuide = (currentRoute && currentRoute.length > 0) 
        ? data.find((g) => g.slug === currentRoute) 
        : undefined;
        
    if (activeGuide) {
        return <GuideDetail guide={activeGuide} userId={userId} allGuides={data} onView={incrementViewCount} />;
    }

    return <GuideList guides={data} userId={userId} searchTerm={searchTerm} onSearchChange={setSearchTerm} />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans selection:bg-brand-100 selection:text-brand-900 relative">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all duration-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 lg:gap-8 flex-grow max-w-3xl">
            <a href="#" onClick={(e) => { e.preventDefault(); window.location.hash = ''; }} className="flex items-center gap-2 group flex-shrink-0">
              <div className="bg-brand-900 text-white p-1.5 rounded-lg group-hover:bg-brand-800 transition-colors shadow-sm">
                <BookOpen size={20} />
              </div>
              <span className="font-bold text-lg tracking-tight text-brand-900">Evergreen<span className="text-brand-500">Rehber</span></span>
            </a>
            
            <button onClick={() => setShowAiRoadmapModal(true)} className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 hover:shadow-md hover:scale-105 transition-all">
                <Sparkles size={14} className="text-indigo-500" />
                <span>{t('aiRoadmap')}</span>
            </button>

            <div className="h-5 w-px bg-slate-300 mx-1 hidden md:block"></div>

            <div className="relative flex-grow hidden md:block group max-w-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="text-slate-400 group-focus-within:text-brand-500 transition-colors" size={16} />
                </div>
                <input type="text" placeholder={t('searchPlaceholder')} className="w-full bg-slate-100 border-none rounded-full py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-3">
             <button onClick={() => setShowAiRoadmapModal(true)} className="md:hidden p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"><Sparkles size={20} /></button>

            <button onClick={() => setLanguage(language === 'tr' ? 'en' : 'tr')} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full text-xs font-bold uppercase w-8 h-8 flex items-center justify-center border border-slate-200">
                {language}
            </button>

            <div className="flex items-center gap-1 border-r border-slate-200 pr-3 mr-1">
                {settings.socials.twitter && (<a href={settings.socials.twitter} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-400 hover:text-sky-500 transition-colors"><Twitter size={18} /></a>)}
                {settings.socials.instagram && (<a href={settings.socials.instagram} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-400 hover:text-pink-600 transition-colors"><Instagram size={18} /></a>)}
                {settings.socials.youtube && (<a href={settings.socials.youtube} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"><Youtube size={18} /></a>)}
                {settings.socials.linkedin && (<a href={settings.socials.linkedin} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-400 hover:text-blue-700 transition-colors"><Linkedin size={18} /></a>)}
            </div>

            {(!isFirebaseEnabled || isOfflineMode) && (
                <div className="hidden lg:flex items-center text-[10px] bg-amber-50 text-amber-600 px-2 py-1 rounded border border-amber-200 mr-2 animate-pulse" title="Database quota exceeded or disabled.">
                    {isOfflineMode ? <CloudOff size={12} className="mr-1" /> : <Database size={12} className="mr-1" />} 
                    {t('localMode')}
                </div>
            )}

            {isAuthenticated ? (
                <div className="flex items-center gap-2">
                    {currentRoute !== 'admin' && (
                        <button onClick={() => window.location.hash = 'admin'} className="text-xs font-bold text-slate-700 hover:text-brand-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors border border-slate-200">
                            <LayoutDashboard size={14} /> {t('panel')}
                        </button>
                    )}
                    <button onClick={logout} className="text-xs font-bold text-red-500 hover:text-red-700 border border-red-200 px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors">
                        <LogOut size={14} /> {t('logout')}
                    </button>
                </div>
            ) : (
                <button onClick={() => setShowLoginModal(true)} className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-brand-900 border border-slate-200 hover:border-brand-900 px-3 py-1.5 rounded-full transition-all">
                    <User size={14} /> {t('login')}
                </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 py-6 w-full">
        {renderContent()}
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center md:text-left">
          <p className="text-slate-500 text-sm">&copy; {new Date().getFullYear()} Evergreen Rehber. Tüm hakları saklıdır.</p>
        </div>
      </footer>

      {showLoginModal && !isAuthenticated && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                  <div className="p-6">
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Lock className="text-brand-600" size={20} /> {t('loginTitle')}</h3>
                          <button onClick={() => {setShowLoginModal(false); if(currentRoute === 'admin') window.location.hash = '';}} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                      </div>
                      <form onSubmit={handleLogin} className="space-y-4">
                          <input type="text" placeholder={t('username')} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" value={loginForm.username} onChange={(e) => setLoginForm({...loginForm, username: e.target.value})} />
                          <input type="password" placeholder={t('password')} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" value={loginForm.password} onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} />
                          {loginError && <div className="text-xs text-red-500 font-medium bg-red-50 p-2 rounded">{loginError}</div>}
                          <button type="submit" className="w-full bg-brand-900 text-white py-2.5 rounded-lg font-bold hover:bg-brand-800 transition-colors flex justify-center items-center gap-2"><LogIn size={18} /> {t('login')}</button>
                      </form>
                  </div>
              </div>
          </div>
      )}

      {showAiRoadmapModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative">
                  <button onClick={() => setShowAiRoadmapModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10 p-2 bg-slate-100 rounded-full"><X size={20} /></button>
                  <div className="p-8 text-center">
                      <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                          <Bot size={40} className="text-indigo-600" />
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 mb-2">AI Roadmap <span className="text-indigo-600">Coming Soon</span></h3>
                      <button onClick={() => setShowAiRoadmapModal(false)} className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20">OK</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
