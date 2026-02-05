import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, Language } from '../translations';
import { DataService } from '../services/db';
import { SiteSettings, ThemeColor, HeroContent } from '../types';

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['tr']) => string;
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
  settings: SiteSettings;
  updateSettings: (newSettings: SiteSettings) => Promise<void>;
  currentHero: HeroContent;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_SETTINGS: SiteSettings = {
    socials: { twitter: '', instagram: '', youtube: '', linkedin: '' },
    themeColor: 'default',
    hero: {
        tr: {
            title: "Öğrenme Yolculuğuna",
            titleHighlight: "Yön Ver",
            description: "Merak ettiğin konularda uzmanlaşmak için adım adım rehberleri keşfet."
        },
        en: {
            title: "Guide Your",
            titleHighlight: "Learning Journey",
            description: "Discover step-by-step guides to master the topics you are curious about."
        }
    },
    autoGen: {
        enabled: false,
        intervalMinutes: 1440,
        nextRunTime: Date.now(),
        isGenerating: false
    }
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Language State
  const [language, setLanguageState] = useState<Language>('tr');
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  
  // Theme State
  const [themeColor, setThemeColorState] = useState<ThemeColor>('default');

  // Initialization
  useEffect(() => {
    // 1. Load Local Preferences (Lang)
    const storedLang = localStorage.getItem('evergreen_lang') as Language;
    if (storedLang) setLanguageState(storedLang);

    // 2. Fetch Global Settings from DB
    const fetchSettings = async () => {
        try {
            const dbSettings = await DataService.getSettings();
            setSettings(dbSettings);
            
            // Sync theme from DB if user hasn't overridden it locally? 
            // For now, let's say DB settings dictate the default theme, but local overrides persist?
            // To keep it simple: DB Settings > Local Storage for site consistency.
            setThemeColorState(dbSettings.themeColor);
            applyTheme(dbSettings.themeColor);
        } catch (e) {
            console.error("Failed to load settings", e);
        }
    };
    fetchSettings();
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('evergreen_lang', lang);
  };

  const applyTheme = (color: ThemeColor) => {
    // Remove all theme classes first
    document.body.classList.remove('theme-indigo', 'theme-green', 'theme-rose', 'theme-amber');
    // Add new theme class if not default
    if (color !== 'default') {
      document.body.classList.add(`theme-${color}`);
    }
  }

  const setThemeColor = (color: ThemeColor) => {
    setThemeColorState(color);
    // Note: We don't save to DB here automatically, only when "Save Settings" is clicked in Admin.
    // But we apply it visually immediately.
    applyTheme(color);
  };

  const updateSettings = async (newSettings: SiteSettings) => {
      // Optimistic update
      setSettings(newSettings);
      setThemeColor(newSettings.themeColor);
      await DataService.saveSettings(newSettings);
  };

  const t = (key: keyof typeof translations['tr']) => {
    return translations[language][key] || key;
  };

  const currentHero = settings.hero[language] || settings.hero['tr'];

  return (
    <AppContext.Provider value={{ language, setLanguage, t, themeColor, setThemeColor, settings, updateSettings, currentHero }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};