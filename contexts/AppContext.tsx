
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
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_SETTINGS: SiteSettings = {
    siteName: "Evergreen Rehber",
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
  
  // Theme & Appearance State
  const [themeColor, setThemeColorState] = useState<ThemeColor>('default');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Initialization
  useEffect(() => {
    // 1. Load Local Preferences (Lang, Theme, Dark Mode)
    const storedLang = localStorage.getItem('evergreen_lang') as Language;
    if (storedLang) setLanguageState(storedLang);

    const storedTheme = localStorage.getItem('evergreen_user_theme') as ThemeColor;
    if (storedTheme) {
        setThemeColorState(storedTheme);
        applyTheme(storedTheme);
    }

    const storedDarkMode = localStorage.getItem('evergreen_dark_mode') === 'true';
    setIsDarkMode(storedDarkMode);
    if (storedDarkMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }

    // 2. Fetch Global Settings from DB
    const fetchSettings = async () => {
        try {
            const dbSettings = await DataService.getSettings();
            setSettings(dbSettings);
            
            // If user has NOT set a local theme preference, use the DB setting
            if (!storedTheme) {
                setThemeColorState(dbSettings.themeColor);
                applyTheme(dbSettings.themeColor);
            }
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
    // User preference overrides DB default locally
    localStorage.setItem('evergreen_user_theme', color);
    applyTheme(color);
  };

  const toggleDarkMode = () => {
      const newVal = !isDarkMode;
      setIsDarkMode(newVal);
      localStorage.setItem('evergreen_dark_mode', String(newVal));
      if (newVal) {
          document.documentElement.classList.add('dark');
      } else {
          document.documentElement.classList.remove('dark');
      }
  };

  const updateSettings = async (newSettings: SiteSettings) => {
      // Optimistic update
      setSettings(newSettings);
      // Only update theme if we are in admin logic (handled by component), 
      // but strictly speaking, settings.themeColor is now the "Default" site theme.
      await DataService.saveSettings(newSettings);
  };

  const t = (key: keyof typeof translations['tr']) => {
    return translations[language][key] || key;
  };

  const currentHero = settings.hero[language] || settings.hero['tr'];

  return (
    <AppContext.Provider value={{ language, setLanguage, t, themeColor, setThemeColor, settings, updateSettings, currentHero, isDarkMode, toggleDarkMode }}>
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
