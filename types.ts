
export interface Step {
  step_title: string;
  step_content: string;
}

export interface Guide {
  id: string;
  title: string;
  slug: string;
  language: 'tr' | 'en'; // Added language support
  category: string;
  description: string;
  imageUrl?: string;
  difficulty: 'Kolay' | 'Orta' | 'İleri' | 'Easy' | 'Medium' | 'Hard';
  duration: string;
  steps: Step[];
  related: string[]; // Array of slugs
  createdAt?: number; // Timestamp
  views?: number;
}

export interface SocialConfig {
  twitter?: string;
  instagram?: string;
  youtube?: string;
  linkedin?: string;
}

export interface HeroContent {
    title: string;
    titleHighlight: string;
    description: string;
}

export type ThemeColor = 'default' | 'indigo' | 'green' | 'rose' | 'amber';

export interface AutoGenerateConfig {
    enabled: boolean;
    intervalMinutes: number; // How often to generate (e.g. 1440 for 24 hours)
    nextRunTime: number; // Timestamp for next run
    isGenerating: boolean; // Lock flag to prevent multiple users triggering at once
}

export interface ApiKeySettings {
    gemini?: string;
    googleAdsId?: string;
}

export interface SiteSettings {
    siteName: string; // New: Site Title
    socials: SocialConfig;
    themeColor: ThemeColor;
    hero: {
        tr: HeroContent;
        en: HeroContent;
    };
    autoGen: AutoGenerateConfig;
    apiKeys?: ApiKeySettings; // New field for storing keys in DB
}

export type Data = Guide[];
