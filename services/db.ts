
import { Guide, SiteSettings } from '../types';
import { guides as staticGuides } from '../guideData'; // Source for seeding
import { db, isFirebaseEnabled } from './firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, getDoc, query, where, updateDoc, disableNetwork } from "firebase/firestore";
import { GoogleGenAI, Type } from "@google/genai";

// Kategorileri sabit bir liste olarak burada tanımlıyoruz
export const VALID_CATEGORIES = [
    "Yazılım", "Finans", "Sağlık", "Hobi", "Yaşam", 
    "Kişisel Gelişim", "Dijital Pazarlama", "Seyahat", 
    "Teknoloji", "Sanat", "Yemek", "Eğitim", "Bilim", 
    "Spor", "Kültür", "Tarih", "Müzik"
];

// Türkçe karakterleri destekleyen sağlam slug oluşturucu
export const slugify = (text: string) => {
    const trMap: Record<string, string> = {
        'ş': 's', 'Ş': 's', 'ı': 'i', 'İ': 'i', 'ğ': 'g', 'Ğ': 'g', 
        'ü': 'u', 'Ü': 'u', 'ö': 'o', 'Ö': 'o', 'ç': 'c', 'Ç': 'c'
    };
    const cleanText = text
        .split('')
        .map(char => trMap[char] || char)
        .join('');
    
    return cleanText
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/^-+|-+$/g, '');
};

// Helper to remove undefined fields because Firestore rejects them
const sanitizeForFirestore = (data: any) => {
    return JSON.parse(JSON.stringify(data));
};

// Default Settings
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
        intervalMinutes: 1440, // 24 hours
        nextRunTime: Date.now() + 86400000,
        isGenerating: false
    }
};

// --- CACHING & CIRCUIT BREAKER LOGIC ---
const CACHE_PREFIX = 'evergreen_cache_';
const GUIDES_CACHE_DURATION = 1000 * 60 * 30; // 30 Minutes
const SETTINGS_CACHE_DURATION = 1000 * 60 * 10; // 10 Minutes
const QUOTA_LOCK_KEY = 'evergreen_quota_exceeded_ts';
const QUOTA_LOCK_DURATION = 1000 * 60 * 60 * 24; // 24 Hours

// Check persistent lock on init
const checkQuotaLock = (): boolean => {
    try {
        const ts = localStorage.getItem(QUOTA_LOCK_KEY);
        if (ts) {
             const diff = Date.now() - parseInt(ts);
             if (diff < QUOTA_LOCK_DURATION) {
                 return true;
             } else {
                 // Lock expired, try again
                 localStorage.removeItem(QUOTA_LOCK_KEY);
                 return false;
             }
        }
        return false;
    } catch { return false; }
};

let isQuotaExceeded = checkQuotaLock();

// Note: firebase.ts checks this key too. If it's present, db is null, so this block won't run.
// This is a safety fallback for runtime state changes.
if (isQuotaExceeded && isFirebaseEnabled && db) {
    try {
        disableNetwork(db).catch(e => console.warn("Network disable warning:", e));
    } catch (e) {
        console.warn("Sync disable network failed:", e);
    }
}

const setQuotaExceeded = () => {
    if (!isQuotaExceeded) {
        console.warn("Quota exceeded detected! Locking Firestore requests for 24 hours.");
        isQuotaExceeded = true;
        localStorage.setItem(QUOTA_LOCK_KEY, Date.now().toString());
        
        // Kill the network connection to stop SDK retries
        if (isFirebaseEnabled && db) {
            disableNetwork(db).catch(e => console.warn("Failed to disable network:", e));
        }
    }
};

const getFromCache = <T>(key: string, duration: number): T | null => {
    try {
        const item = localStorage.getItem(CACHE_PREFIX + key);
        if (!item) return null;
        const parsed = JSON.parse(item);
        if (Date.now() - parsed.timestamp < duration) {
            return parsed.data;
        }
        return null;
    } catch (e) {
        return null;
    }
};

const saveToCache = (key: string, data: any) => {
    try {
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
    } catch (e) {
        console.warn("Cache write failed (storage full?)", e);
    }
};

const invalidateCache = (keyPattern: string) => {
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith(CACHE_PREFIX + keyPattern)) {
            localStorage.removeItem(key);
        }
    });
};

// --- LOCAL PROGRESS FALLBACKS ---
const getLocalProgress = (userId: string, guideId: string): number[] => {
    try {
        const item = localStorage.getItem(`progress_${userId}_${guideId}`);
        return item ? JSON.parse(item) : [];
    } catch { return []; }
}

const saveLocalProgress = (userId: string, guideId: string, steps: number[]) => {
    try {
        localStorage.setItem(`progress_${userId}_${guideId}`, JSON.stringify(steps));
    } catch {}
}

const getAllLocalProgress = (userId: string): Record<string, number> => {
    const map: Record<string, number> = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`progress_${userId}_`)) {
            const guideId = key.replace(`progress_${userId}_`, '');
            try {
                const steps = JSON.parse(localStorage.getItem(key) || '[]');
                if (Array.isArray(steps)) map[guideId] = steps.length;
            } catch {}
        }
    }
    return map;
}

// Helper function to translate guide using Gemini
const translateGuideToEnglish = async (guide: Guide): Promise<Guide | null> => {
    try {
        if (!process.env.API_KEY) {
            console.error("API Key missing for translation");
            return null;
        }
        
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const prompt = `
        You are a professional translator. Translate the following Turkish JSON guide object to English.
        
        Rules:
        1. Keep 'id' same but append "_en" to it.
        2. Translate 'title', 'category', 'description', 'duration'.
        3. Translate 'slug' to be english URL friendly.
        4. Translate 'difficulty' (Kolay->Easy, Orta->Medium, İleri->Hard).
        5. Translate all 'steps' content.
        6. Set 'language' to 'en'.
        7. Keep 'imageUrl', 'createdAt', 'views' same.
        8. Return ONLY the JSON object.

        Input JSON:
        ${JSON.stringify(guide)}
        `;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        const translatedText = response.text;
        if (!translatedText) return null;

        const translatedGuide = JSON.parse(translatedText) as Guide;
        translatedGuide.language = 'en';
        if (translatedGuide.id === guide.id) translatedGuide.id = guide.id + '_en';
        
        return translatedGuide;

    } catch (error) {
        console.error("Translation failed for guide:", guide.title, error);
        return null;
    }
};

export const DataService = {
    // 0. Check Status
    isQuotaLimited: () => isQuotaExceeded,

    // 1. Get Guides by Language (Cached + Circuit Breaker)
    getGuides: async (language: 'tr' | 'en' = 'tr'): Promise<Guide[]> => {
        // Fallback Logic
        if (!isFirebaseEnabled || !db || isQuotaExceeded) {
            if (language === 'en') return []; 
            return staticGuides.map(g => ({...g, language: 'tr'} as Guide));
        }

        // Check Cache First
        const cachedGuides = getFromCache<Guide[]>(`guides_${language}`, GUIDES_CACHE_DURATION);
        if (cachedGuides) {
            return cachedGuides;
        }

        try {
            const q = query(collection(db, "guides"), where("language", "==", language));
            const querySnapshot = await getDocs(q);
            const dbGuides = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Guide));
            
            const sortedGuides = dbGuides.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            
            saveToCache(`guides_${language}`, sortedGuides);
            
            return sortedGuides;
        } catch (e: any) {
            if (e.code === 'resource-exhausted') {
                setQuotaExceeded();
                if (language === 'tr') return staticGuides.map(g => ({...g, language: 'tr'} as Guide));
                return [];
            }
            console.error("Error fetching guides from Firebase:", e);
            throw e;
        }
    },

    // 2. Save Guide
    saveGuide: async (guide: Guide, shouldTranslate: boolean = false): Promise<void> => {
        if (!isFirebaseEnabled || !db || isQuotaExceeded) {
             console.warn("Operation skipped: Firebase disabled or quota exceeded.");
             if (isQuotaExceeded) alert("Günlük kota dolu. İşlem kaydedilemedi.");
             return;
        }

        try {
            const cleanGuide = sanitizeForFirestore(guide);
            await setDoc(doc(db, "guides", guide.id), cleanGuide);
            
            invalidateCache(`guides_${guide.language}`);

            if (shouldTranslate && guide.language === 'tr') {
                const translatedGuide = await translateGuideToEnglish(guide);
                if (translatedGuide) {
                    const cleanTranslated = sanitizeForFirestore(translatedGuide);
                    await setDoc(doc(db, "guides", translatedGuide.id), cleanTranslated);
                    invalidateCache(`guides_en`);
                }
            }
        } catch (e: any) {
            if (e.code === 'resource-exhausted') setQuotaExceeded();
            else console.error("Error saving guide:", e);
            throw e;
        }
    },

    // 3. Delete Guide
    deleteGuide: async (id: string): Promise<void> => {
        if (!isFirebaseEnabled || !db || isQuotaExceeded) {
             console.warn("Operation skipped: Firebase disabled or quota exceeded.");
             return; 
        }

        try {
            await deleteDoc(doc(db, "guides", id));
            invalidateCache('guides_');
            try {
                await deleteDoc(doc(db, "guides", id + "_en"));
            } catch (ignore) {}
        } catch (e: any) {
            if (e.code === 'resource-exhausted') setQuotaExceeded();
            else console.error("Error deleting guide:", e);
            throw e;
        }
    },

    // 4. Get User Progress (Detail View)
    getProgress: async (userId: string, guideId: string): Promise<number[]> => {
        // Always try local storage first/fallback if quota issues
        if (!isFirebaseEnabled || !db || isQuotaExceeded) {
            return getLocalProgress(userId, guideId);
        }

        try {
            const docRef = doc(db, "progress", `${userId}_${guideId}`);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const steps = docSnap.data().steps || [];
                // Sync to local
                saveLocalProgress(userId, guideId, steps);
                return steps;
            }
            return [];
        } catch (e: any) {
            if (e.code === 'resource-exhausted') {
                setQuotaExceeded();
                return getLocalProgress(userId, guideId);
            }
            return [];
        }
    },

    // 4.1. Get ALL User Progress (List View)
    getAllUserProgress: async (userId: string): Promise<Record<string, number>> => {
        if (!isFirebaseEnabled || !db || isQuotaExceeded) {
            return getAllLocalProgress(userId);
        }

        try {
            const q = query(collection(db, "progress"), where("userId", "==", userId));
            const querySnapshot = await getDocs(q);
            
            const progressMap: Record<string, number> = {};
            querySnapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.guideId && Array.isArray(data.steps)) {
                    progressMap[data.guideId] = data.steps.length;
                    // Sync local
                    saveLocalProgress(userId, data.guideId, data.steps);
                }
            });
            return progressMap;
        } catch (e: any) {
            if (e.code === 'resource-exhausted') {
                setQuotaExceeded();
                return getAllLocalProgress(userId);
            }
            console.error("Error fetching user progress:", e);
            return {};
        }
    },

    // 5. Save User Progress
    saveProgress: async (userId: string, guideId: string, steps: number[]): Promise<void> => {
        // Always save to local storage
        saveLocalProgress(userId, guideId, steps);

        if (!isFirebaseEnabled || !db || isQuotaExceeded) return;

        try {
            await setDoc(doc(db, "progress", `${userId}_${guideId}`), {
                userId,
                guideId,
                steps,
                updatedAt: Date.now()
            });
        } catch (e: any) {
            if (e.code === 'resource-exhausted') setQuotaExceeded();
            else console.error("Error saving progress:", e);
        }
    },

    // 6. Increment View Count
    incrementView: async (guideId: string): Promise<void> => {
        if (!isFirebaseEnabled || !db || isQuotaExceeded) return;

        try {
             const docRef = doc(db, "guides", guideId);
             const docSnap = await getDoc(docRef);
             if(docSnap.exists()) {
                 const currentViews = docSnap.data().views || 0;
                 await setDoc(docRef, { views: currentViews + 1 }, { merge: true });
             }
        } catch (e: any) {
            if (e.code === 'resource-exhausted') setQuotaExceeded();
        }
    },

    // 7. Get Global Settings
    getSettings: async (): Promise<SiteSettings> => {
        const cachedSettings = getFromCache<SiteSettings>('settings', SETTINGS_CACHE_DURATION);
        
        // If Quota exceeded, MUST use cached or default
        if (isQuotaExceeded || !isFirebaseEnabled || !db) {
             return cachedSettings || DEFAULT_SETTINGS;
        }
        
        if (cachedSettings) return cachedSettings;

        try {
            const docRef = doc(db, "settings", "general");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                const settings = {
                    ...DEFAULT_SETTINGS,
                    ...data,
                    autoGen: { ...DEFAULT_SETTINGS.autoGen, ...(data.autoGen || {}) }
                } as SiteSettings;
                
                saveToCache('settings', settings);
                return settings;
            }
            return DEFAULT_SETTINGS;
        } catch (e: any) {
            if (e.code === 'resource-exhausted') {
                 setQuotaExceeded();
                 const staleSettings = localStorage.getItem(CACHE_PREFIX + 'settings');
                 if (staleSettings) return JSON.parse(staleSettings).data;
                 return DEFAULT_SETTINGS;
            }
            console.error("Error getting settings:", e);
            return DEFAULT_SETTINGS;
        }
    },

    // 8. Save Global Settings
    saveSettings: async (settings: SiteSettings): Promise<void> => {
        saveToCache('settings', settings); // Always update cache

        if (!isFirebaseEnabled || !db || isQuotaExceeded) {
            console.warn("Settings saved locally only.");
            return;
        }
        try {
            await setDoc(doc(db, "settings", "general"), sanitizeForFirestore(settings));
        } catch (e: any) {
            if (e.code === 'resource-exhausted') setQuotaExceeded();
            else console.error("Error saving settings:", e);
            throw e;
        }
    },

    // 9. Generate AI Content Logic (Shared)
    generateContentWithAI: async (mode: 'topic' | 'auto', topic: string = '', category: string = '', existingGuides: Guide[] = []): Promise<Partial<Guide> & { imageKeyword?: string } | null> => {
        try {
            if (!process.env.API_KEY) {
                console.error("API Key missing");
                return null;
            }
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const systemInstruction = `Sen uzman bir içerik üreticisi ve SEO uzmanısın. Türkçe içerik üretiyorsun.`;
            
            let userPrompt = "";
            if (mode === 'topic') {
                userPrompt = `Konu: "${topic}". Bu konu hakkında detaylı, eğitici bir Türkçe rehber hazırla.`;
            } else {
                if (category) {
                     userPrompt = `"${category}" kategorisinde, Türkiye'de ilgi çekecek, "Evergreen" nitelikte popüler bir konu belirle. Seçtiğin bu konu için tam bir rehber hazırla.`;
                } else {
                     userPrompt = `Türkiye'de ilgi çekecek, "Evergreen" nitelikte popüler bir konu belirle. Seçtiğin bu konu için tam bir rehber hazırla.`;
                }
            }

            // Avoid duplication
            const existingTitles = existingGuides
                .filter(g => !category || g.category === category)
                .map(g => g.title)
                .slice(0, 50)
                .join(", ");
                
            if (existingTitles) {
                userPrompt += `\n\nÖNEMLİ KURAL: Veritabanımda şu başlıklar zaten var: [${existingTitles}]. \nLütfen bu konuları veya bunların benzerlerini TEKRAR ETME. Bunlardan tamamen farklı, özgün bir konu seç.`;
            }

            userPrompt += `\n\nKategori olarak LÜTFEN şu listeden konuya en uygun olanını seç: ${VALID_CATEGORIES.join(', ')}.`;

            const response = await ai.models.generateContent({ 
                model: "gemini-3-flash-preview", 
                contents: userPrompt, 
                config: { 
                    systemInstruction: systemInstruction,
                    responseMimeType: "application/json", 
                    responseSchema: { 
                        type: Type.OBJECT, 
                        properties: { 
                            title: { type: Type.STRING }, 
                            category: { type: Type.STRING, enum: VALID_CATEGORIES }, 
                            difficulty: { type: Type.STRING, enum: ["Kolay", "Orta", "İleri"] }, 
                            duration: { type: Type.STRING }, 
                            description: { type: Type.STRING }, 
                            imageKeyword: { type: Type.STRING }, 
                            steps: { 
                                type: Type.ARRAY, 
                                items: { 
                                    type: Type.OBJECT, 
                                    properties: { 
                                        step_title: { type: Type.STRING }, 
                                        step_content: { type: Type.STRING } 
                                    }, 
                                    required: ["step_title", "step_content"] 
                                } 
                            } 
                        }, 
                        required: ["title", "category", "difficulty", "duration", "description", "imageKeyword", "steps"] 
                    } 
                } 
            });
            
            return JSON.parse(response.text || "{}");
        } catch (error) {
            console.error("AI Generation failed:", error);
            return null;
        }
    },

    // 10. Check and Trigger Auto Generation (Optimized & Circuit Breaked)
    checkAndTriggerAutoGenerate: async (): Promise<boolean> => {
        if (!isFirebaseEnabled || !db || isQuotaExceeded) return false;

        // Use cached settings to avoid initial read
        const settings = await DataService.getSettings();
        const autoGen = settings.autoGen;

        if (!autoGen || !autoGen.enabled) return false;

        const now = Date.now();
        if (now < autoGen.nextRunTime) return false; 

        const settingsRef = doc(db, "settings", "general");
        
        try {
            const docSnap = await getDoc(settingsRef); // 1 Read
            if (!docSnap.exists()) return false;

            const currentSettings = docSnap.data() as SiteSettings;
            const currentAutoGen = currentSettings.autoGen;

            if (!currentAutoGen.enabled) return false;
            
            if (now < currentAutoGen.nextRunTime) {
                saveToCache('settings', currentSettings);
                return false;
            }

            if (currentAutoGen.isGenerating) {
                if (now - currentAutoGen.nextRunTime < 5 * 60 * 1000) return false; 
                console.warn("Generation lock timed out, taking over...");
            }

            await updateDoc(settingsRef, { "autoGen.isGenerating": true });

            console.log("Auto-generation triggered by client...");

            const guides = await DataService.getGuides('tr'); 
            const generatedData = await DataService.generateContentWithAI('auto', '', '', guides);

            if (generatedData && generatedData.title) {
                let slug = slugify(generatedData.title);
                if (!slug) slug = `guide-${Date.now()}`;
                
                const newGuide: Guide = {
                    id: Date.now().toString(),
                    title: generatedData.title,
                    slug: slug,
                    language: 'tr',
                    category: generatedData.category || 'Genel',
                    difficulty: (generatedData.difficulty as any) || 'Kolay',
                    duration: generatedData.duration || '1 Gün',
                    description: generatedData.description || '',
                    imageUrl: `https://source.unsplash.com/1600x900/?${encodeURIComponent(generatedData.imageKeyword || 'technology')}`,
                    steps: generatedData.steps || [],
                    related: [],
                    views: 0,
                    createdAt: Date.now()
                };

                await DataService.saveGuide(newGuide, true); 
                console.log("Auto-generated guide saved:", newGuide.title);
            }

            const nextRun = Date.now() + (autoGen.intervalMinutes * 60 * 1000);
            const updatedSettings = {
                ...currentSettings,
                autoGen: {
                    ...currentSettings.autoGen,
                    isGenerating: false,
                    nextRunTime: nextRun
                }
            };

            await updateDoc(settingsRef, {
                "autoGen.isGenerating": false,
                "autoGen.nextRunTime": nextRun
            });
            
            saveToCache('settings', updatedSettings);

            return true;

        } catch (e: any) {
            if (e.code === 'resource-exhausted') {
                setQuotaExceeded();
            } else {
                console.error("Auto generation routine failed:", e);
                try {
                    // Try to unlock if quota allows
                    if (!isQuotaExceeded) await updateDoc(settingsRef, { "autoGen.isGenerating": false });
                } catch (ignore) {}
            }
            return false;
        }
    }
};
