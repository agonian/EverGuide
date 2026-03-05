
import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate, useParams } from 'react-router-dom';
import { Guide, Data, ThemeColor } from './types';
import GuideList from './components/GuideList';
import GuideDetail from './components/GuideDetail';
import AdminPanel from './components/AdminPanel';
import AiRoadmapModal from './components/AiRoadmapModal';
import LegalModal from './components/LegalModal'; 
import CookieBanner from './components/CookieBanner'; // Import Cookie Banner
import { DataService } from './services/db';
import { isFirebaseEnabled } from './services/firebase';
import { AppProvider, useApp } from './contexts/AppContext';
import { BookOpen, Lock, X, LogIn, LogOut, Search, Twitter, Instagram, Youtube, Linkedin, Sparkles, LayoutDashboard, Sun, Moon, Palette, ChevronDown, Check } from 'lucide-react';

// NotFound Component
const NotFound = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-fade-in">
        <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-6">
            <Search size={48} className="text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">İçerik Bulunamadı</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md">
            Aradığınız rehber silinmiş, adresi değişmiş veya şu an yayında olmayabilir.
        </p>
        <a href="/" className="bg-brand-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-800 transition-colors inline-flex items-center gap-2">
            <BookOpen size={18} /> Ana Sayfaya Dön
        </a>
    </div>
);

// Wrapper for GuideDetail to handle slug param
const GuideDetailWrapper: React.FC<{ data: Data, userId: string, onView: (id: string) => void }> = ({ data, userId, onView }) => {
    const { slug } = useParams<{ slug: string }>();
    // Fallback: Try to find by slug, if not found, try by ID (for backward compatibility)
    const guide = data.find(g => g.slug === slug || g.id === slug);
    
    if (!guide) {
        // Debugging log
        console.warn(`Guide not found for slug: ${slug}. Available slugs:`, data.map(g => g.slug));
        return <NotFound />;
    }

    return <GuideDetail guide={guide} userId={userId} allGuides={data} onView={onView} />;
};

// Inner App Component to use the Context Hook
const AppContent: React.FC = () => {
  const { settings, updateSettings, isDarkMode, toggleDarkMode, setThemeColor, themeColor } = useApp();
  const [data, setData] = useState<Data>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  const navigate = useNavigate();
  const location = useLocation();

  // Lazy Initialize Auth State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
      return typeof window !== 'undefined' && localStorage.getItem('evergreen_is_admin') === 'true';
  });

  // Lazy Initialize UserId
  const [userId, setUserId] = useState<string>(() => {
      if (typeof window === 'undefined') return '';
      const storedAdmin = localStorage.getItem('evergreen_is_admin') === 'true';
      if (storedAdmin) return 'admin';
      
      let current = localStorage.getItem('evergreen_user_id');
      if (!current) {
          current = 'user_' + Math.random().toString(36).substr(2, 9);
          localStorage.setItem('evergreen_user_id', current);
      }
      return current;
  });

  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [showAiRoadmapModal, setShowAiRoadmapModal] = useState<boolean>(false);
  const [showLegalModal, setShowLegalModal] = useState<'privacy' | 'terms' | 'about' | 'contact' | null>(null);

  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  
  // Consent State
  const [isConsentGiven, setIsConsentGiven] = useState(false);

  // Ref to track if component is mounted
  const isMounted = useRef(true);

  // Available themes mapping
  const themes: { id: ThemeColor; name: string; colorClass: string }[] = [
      { id: 'default', name: 'Slate', colorClass: 'bg-slate-500' },
      { id: 'indigo', name: 'Indigo', colorClass: 'bg-indigo-500' },
      { id: 'green', name: 'Green', colorClass: 'bg-green-500' },
      { id: 'rose', name: 'Rose', colorClass: 'bg-rose-500' },
      { id: 'amber', name: 'Amber', colorClass: 'bg-amber-500' },
  ];

  // INITIALIZATION
  useEffect(() => {
    isMounted.current = true;
    
    const initApp = async () => {
        setLoading(true);
        const safetyTimer = setTimeout(() => {
            if (isMounted.current) {
                setLoading(false);
            }
        }, 5000); 

        // Real-time subscription for guides
        const unsubscribeGuides = DataService.subscribeToGuides((guides) => {
            if (isMounted.current) {
                setData(guides);
                setLoading(false); // Data received, stop loading
                clearTimeout(safetyTimer);
            }
        });

        // Trigger Auto-Gen Check (One-off)
        if (isFirebaseEnabled && !DataService.isQuotaLimited()) {
            DataService.checkAndTriggerAutoGenerate().catch(err => console.warn("Auto-gen check failed silently:", err));
        }

        return () => {
            unsubscribeGuides();
            clearTimeout(safetyTimer);
        };
    };

    const cleanup = initApp();

    return () => {
        isMounted.current = false;
        cleanup.then(unsub => unsub && unsub());
    };
  }, []);

  // FORCE SCROLL TO TOP ON ROUTE CHANGE
  useEffect(() => {
      window.scrollTo(0, 0);
  }, [location.pathname]);

  // Auth Protection for Admin Route
  useEffect(() => {
    if (location.pathname === '/admin' && !isAuthenticated) {
        setShowLoginModal(false);
        navigate('/');
    }
  }, [location.pathname, isAuthenticated, navigate]);
  
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
              setIsThemeMenuOpen(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveGuide = async (guideData: Guide) => {
    const newGuide = { ...guideData, createdAt: guideData.createdAt || Date.now() };
    await DataService.saveGuide(newGuide);
  };

  const handleDeleteGuide = async (id: string) => {
      try {
          await DataService.deleteGuide(id);
      } catch (err: any) {
          alert("Silme işlemi başarısız oldu: " + err.message);
      }
  };

  const incrementViewCount = async (id: string) => {
      await DataService.incrementView(id);
  };

  const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      // SECURITY FIX: Remove hardcoded fallback. Strict ENV check.
      const adminPass = import.meta.env?.VITE_ADMIN_PASSWORD;
      
      if (adminPass && loginForm.username === 'admin' && loginForm.password === adminPass) {
          setIsAuthenticated(true);
          setUserId('admin');
          localStorage.setItem('evergreen_is_admin', 'true');
          setShowLoginModal(false);
          setLoginError('');
          setLoginForm({ username: '', password: '' });
          navigate('/admin');
      } else {
          setLoginError('Kullanıcı adı veya şifre hatalı.');
      }
  };

  const logout = () => {
      navigate('/');
      localStorage.removeItem('evergreen_is_admin');
      const guestId = localStorage.getItem('evergreen_user_id') || 'guest';
      setUserId(guestId);
      setIsAuthenticated(false);
      setShowLoginModal(false);
  };

  if (loading) return <div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div></div>;
  if (error) return <div className="text-center py-20 text-red-600">{error}</div>;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans selection:bg-brand-100 selection:text-brand-900 relative transition-colors duration-300">
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 lg:gap-8 flex-grow max-w-3xl">
            <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }} className="flex items-center gap-2 group flex-shrink-0">
              <div className="bg-brand-900 text-white p-1.5 rounded-lg group-hover:bg-brand-800 transition-colors shadow-sm">
                <BookOpen size={20} />
              </div>
              <span className="font-bold text-lg tracking-tight text-brand-900 dark:text-white hidden md:block">
                {settings.siteName || 'Evergreen Rehber'}
              </span>
              <span className="font-bold text-lg tracking-tight text-brand-900 dark:text-white md:hidden">
                {settings.siteName || 'Evergreen Rehber'}
              </span>
            </a>
            
            <button onClick={() => setShowAiRoadmapModal(true)} className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 hover:shadow-md hover:scale-105 transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-indigo-400">
                <Sparkles size={14} className="text-indigo-500" />
                <span>AI Yol Haritası</span>
            </button>

            <div className="h-5 w-px bg-slate-300 dark:bg-slate-700 mx-1 hidden md:block"></div>

            <div className="relative flex-grow hidden md:block group max-w-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="text-slate-400 group-focus-within:text-brand-500 transition-colors" size={16} />
                </div>
                <input type="text" placeholder="Rehberlerde ara..." className="w-full bg-slate-100 dark:bg-slate-800 dark:text-white border-none rounded-full py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white dark:focus:bg-slate-800 transition-all outline-none placeholder-slate-400" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-3">
             <button onClick={() => setShowAiRoadmapModal(true)} className="md:hidden p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-full transition-colors"><Sparkles size={20} /></button>

            <button onClick={toggleDarkMode} className="p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-full transition-colors" title={isDarkMode ? 'Aydınlık Mod' : 'Karanlık Mod'}>
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            
            <div className="relative" ref={themeMenuRef}>
                <button 
                    onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)} 
                    className="p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-full transition-colors flex items-center gap-1" 
                    title="Tema Rengi"
                >
                    <Palette size={18} />
                    <ChevronDown size={12} />
                </button>
                
                {isThemeMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden py-1 z-50 animate-fade-in">
                        {themes.map((theme) => (
                            <button
                                key={theme.id}
                                onClick={() => {
                                    setThemeColor(theme.id);
                                    setIsThemeMenuOpen(false);
                                }}
                                className="w-full px-4 py-2.5 text-sm font-medium text-left flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                            >
                                <div className={`w-4 h-4 rounded-full ${theme.colorClass} border border-slate-200 dark:border-slate-600`}></div>
                                <span className="flex-grow">{theme.name}</span>
                                {themeColor === theme.id && <Check size={14} className="text-brand-600 dark:text-brand-400" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="hidden md:flex items-center gap-2">
                {isAuthenticated && (
                    <>
                        {location.pathname !== '/admin' && (
                            <button onClick={() => navigate('/admin')} className="text-xs font-bold text-slate-700 hover:text-brand-900 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors border border-slate-200 dark:border-slate-700">
                                <LayoutDashboard size={14} /> <span className="hidden sm:inline">Panel</span>
                            </button>
                        )}
                        <button onClick={logout} className="text-xs font-bold text-red-500 hover:text-red-700 border border-red-200 dark:border-red-900/30 px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors">
                            <LogOut size={14} /> <span className="hidden sm:inline">Çıkış</span>
                        </button>
                    </>
                )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 py-6 w-full">
        <Routes>
            <Route path="/" element={<GuideList guides={data} userId={userId} searchTerm={searchTerm} onSearchChange={setSearchTerm} />} />
            <Route path="/guide/:slug" element={<GuideDetailWrapper data={data} userId={userId} onView={incrementViewCount} />} />
            <Route path="/admin" element={
                isAuthenticated ? (
                    <AdminPanel 
                        guides={data}
                        onSave={handleSaveGuide} 
                        onDelete={handleDeleteGuide}
                        onCancel={() => navigate('/')} 
                    />
                ) : <Navigate to="/" replace />
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-8 mt-auto">
        <div className="max-w-6xl mx-auto px-4 flex flex-col items-center gap-6">
            
            <div className="flex items-center gap-6">
                {settings.socials.twitter && (<a href={settings.socials.twitter} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-sky-500 transition-colors"><Twitter size={24} /></a>)}
                {settings.socials.instagram && (<a href={settings.socials.instagram} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-pink-600 transition-colors"><Instagram size={24} /></a>)}
                {settings.socials.youtube && (<a href={settings.socials.youtube} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-red-600 transition-colors"><Youtube size={24} /></a>)}
                {settings.socials.linkedin && (<a href={settings.socials.linkedin} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-700 transition-colors"><Linkedin size={24} /></a>)}
            </div>

            {/* Expanded Footer Links */}
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                <button onClick={() => setShowLegalModal('about')} className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Hakkımızda</button>
                <button onClick={() => setShowLegalModal('contact')} className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">İletişim</button>
                <button onClick={() => setShowLegalModal('privacy')} className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Gizlilik Politikası</button>
                <button onClick={() => setShowLegalModal('terms')} className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Kullanım Şartları</button>
            </div>
            
            {isAuthenticated && (
                <div className="md:hidden flex items-center gap-4 w-full justify-center">
                    {location.pathname !== '/admin' && (
                        <button onClick={() => navigate('/admin')} className="text-sm font-bold text-slate-700 hover:text-brand-900 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 px-5 py-2.5 rounded-full flex items-center gap-2 transition-colors border border-slate-200 dark:border-slate-700">
                            <LayoutDashboard size={16} /> Panel
                        </button>
                    )}
                    <button onClick={logout} className="text-sm font-bold text-red-500 hover:text-red-700 border border-red-200 dark:border-red-900/30 px-5 py-2.5 rounded-full flex items-center gap-2 transition-colors">
                        <LogOut size={16} /> Çıkış
                    </button>
                </div>
            )}

            <p className="text-slate-500 dark:text-slate-400 text-sm text-center">
                &copy; {new Date().getFullYear()} {settings.siteName || 'Evergreen Rehber'}.{' '}
                <span 
                    onClick={() => !isAuthenticated && setShowLoginModal(true)}
                    className={`transition-colors cursor-default ${!isAuthenticated ? 'hover:text-slate-400 dark:hover:text-slate-300' : ''}`}
                    title={!isAuthenticated ? "Yönetici Girişi" : ""}
                >
                    Tüm hakları saklıdır.
                </span>
            </p>
        </div>
      </footer>

      {showLoginModal && !isAuthenticated && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-700">
                  <div className="p-6">
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Lock className="text-brand-600" size={20} /> Yönetici Girişi</h3>
                          <button onClick={() => {setShowLoginModal(false); navigate('/');}} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button>
                      </div>
                      <form onSubmit={handleLogin} className="space-y-4">
                          <input type="text" placeholder="Kullanıcı Adı" className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" value={loginForm.username} onChange={(e) => setLoginForm({...loginForm, username: e.target.value})} />
                          <input type="password" placeholder="Şifre" className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" value={loginForm.password} onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} />
                          {loginError && <div className="text-xs text-red-500 font-medium bg-red-50 dark:bg-red-900/20 p-2 rounded">{loginError}</div>}
                          <button type="submit" className="w-full bg-brand-900 dark:bg-brand-700 text-white py-2.5 rounded-lg font-bold hover:bg-brand-800 transition-colors flex justify-center items-center gap-2"><LogIn size={18} /> Giriş</button>
                      </form>
                  </div>
              </div>
          </div>
      )}

      {showAiRoadmapModal && (
          <AiRoadmapModal onClose={() => setShowAiRoadmapModal(false)} />
      )}
      
      {/* Legal Modal (Privacy/Terms/About/Contact) */}
      {showLegalModal && (
          <LegalModal type={showLegalModal} onClose={() => setShowLegalModal(null)} />
      )}

      {/* Cookie Banner */}
      <CookieBanner 
          onConsentUpdate={setIsConsentGiven} 
          onOpenPrivacy={() => setShowLegalModal('privacy')} 
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
        <BrowserRouter>
            <AppContent />
        </BrowserRouter>
    </AppProvider>
  );
};

export default App;
