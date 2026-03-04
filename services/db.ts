
import { Guide, SiteSettings } from '../types';
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
    siteName: "Guidelonia Rehber",
    socials: { twitter: '', instagram: '', youtube: '', linkedin: '' },
    themeColor: 'default',
    hero: {
        title: "Öğrenme Yolculuğuna",
        titleHighlight: "Yön Ver",
        description: "Merak ettiğin konularda uzmanlaşmak için adım adım rehberleri keşfet."
    },
    autoGen: {
        enabled: false,
        intervalMinutes: 1440, // 24 hours
        nextRunTime: Date.now() + 86400000,
        isGenerating: false
    },
    apiKeys: {
        gemini: '',
        googleAdsId: ''
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

// Helper function to translate guide using Gemini - REMOVED

export const DataService = {
    // 0. Check Status
    isQuotaLimited: () => isQuotaExceeded,

    // 1. Get Guides (Cached + Circuit Breaker)
    getGuides: async (): Promise<Guide[]> => {
        // Fallback Logic: Return empty if no firebase (Local Mode removed)
        if (!isFirebaseEnabled || !db || isQuotaExceeded) {
            return [];
        }

        // Check Cache First
        const cachedGuides = getFromCache<Guide[]>(`guides`, GUIDES_CACHE_DURATION);
        if (cachedGuides) {
            return cachedGuides;
        }

        try {
            const q = query(collection(db, "guides"));
            const querySnapshot = await getDocs(q);
            const dbGuides = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Guide));
            
            const sortedGuides = dbGuides.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            
            saveToCache(`guides`, sortedGuides);
            
            return sortedGuides;
        } catch (e: any) {
            if (e.code === 'resource-exhausted') {
                setQuotaExceeded();
                return [];
            }
            console.error("Error fetching guides from Firebase:", e);
            throw e;
        }
    },

    // 1.5 Get ALL Guides (for Sitemap) - No language filtering
    getAllGuides: async (): Promise<Guide[]> => {
        if (!isFirebaseEnabled || !db || isQuotaExceeded) {
            return [];
        }
        try {
            const querySnapshot = await getDocs(collection(db, "guides"));
            const dbGuides = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Guide));
            return dbGuides;
        } catch (e: any) {
            console.error("Error fetching all guides for sitemap:", e);
            return [];
        }
    },

    // 2. Save Guide
    saveGuide: async (guide: Guide): Promise<void> => {
        if (!isFirebaseEnabled || !db || isQuotaExceeded) {
             console.warn("Operation skipped: Firebase disabled or quota exceeded.");
             if (isQuotaExceeded) alert("Günlük kota dolu. İşlem kaydedilemedi.");
             return;
        }

        try {
            const cleanGuide = sanitizeForFirestore(guide);
            await setDoc(doc(db, "guides", guide.id), cleanGuide);
            
            invalidateCache(`guides`);
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
            
            // Clear cache
            invalidateCache('guides');

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
                // Ensure hero structure is correct (migration from old format if needed)
                let hero = data.hero || DEFAULT_SETTINGS.hero;
                if (hero.tr) {
                    // Migrate old format to new format
                    hero = hero.tr;
                }

                const settings = {
                    ...DEFAULT_SETTINGS,
                    ...data,
                    hero: hero,
                    autoGen: { ...DEFAULT_SETTINGS.autoGen, ...(data.autoGen || {}) },
                    apiKeys: { ...DEFAULT_SETTINGS.apiKeys, ...(data.apiKeys || {}) }
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
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const systemInstruction = `Sen uzman bir içerik üreticisi ve SEO uzmanısın. Türkçe içerik üretiyorsun.`;
            
            let userPrompt = "";
            
            // Extract existing titles to check for similarity
            const existingTitles = existingGuides.map(g => g.title).join(", ");

            if (mode === 'topic') {
                userPrompt = `Konu: "${topic}". Bu konu hakkında detaylı, eğitici bir Türkçe rehber hazırla.`;
            } else {
                if (category) {
                     userPrompt = `"${category}" kategorisinde, Türkiye'de ilgi çekecek, "Evergreen" nitelikte popüler ve ÖZGÜN bir konu belirle. Bu konu hakkında rehber hazırla.`;
                } else {
                     userPrompt = `Türkiye'de ilgi çekecek, "Evergreen" nitelikte popüler ve ÖZGÜN bir konu belirle. Bu konu hakkında rehber hazırla.`;
                }
            }

            // Anti-Duplication Rule
            if (existingTitles) {
                userPrompt += `\n\nÇOK ÖNEMLİ KURAL: Veritabanımda şu başlıklar zaten var:\n[${existingTitles}]\n\nLütfen bu listedeki konuları veya bunlara ÇOK BENZEYEN konuları (örn: "Python" varsa "Python Giriş" üretme) ASLA TEKRAR ETME. Bunlardan tamamen farklı, özgün bir konu seç.`;
            }

            // Category Selection Rule
            if (!category) {
                userPrompt += `\n\nKategori olarak LÜTFEN şu listeden rastgele ama konuya en uygun olanını seç: ${VALID_CATEGORIES.join(', ')}.`;
            } else {
                userPrompt += `\n\nKategori olarak ZORUNLU: "${category}".`;
            }

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
                            imageKeyword: { type: Type.STRING, description: "Konuyu en iyi anlatan İngilizce tek kelime (Örn: finance, coding, travel)." }, 
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

            const guides = await DataService.getGuides(); 
            
            // --- BALANCED CATEGORY SELECTION LOGIC ---
            // 1. Count guides per category
            const categoryCounts: Record<string, number> = {};
            VALID_CATEGORIES.forEach(c => categoryCounts[c] = 0);
            guides.forEach(g => {
                if(categoryCounts[g.category] !== undefined) categoryCounts[g.category]++;
            });

            // 2. Find the category with the MOST content (to exclude it)
            // If there's a tie, find one of them.
            let maxCount = -1;
            let excludedCategory = '';
            
            Object.entries(categoryCounts).forEach(([cat, count]) => {
                if (count > maxCount) {
                    maxCount = count;
                    excludedCategory = cat;
                }
            });

            // 3. Create a pool of candidate categories (excluding the populated one)
            // If all categories are empty (maxCount 0), or only 1 category exists, pool is all valid.
            let candidateCategories = VALID_CATEGORIES.filter(c => c !== excludedCategory);
            
            // Fallback: If for some reason candidates are empty (unlikely), reset to all
            if (candidateCategories.length === 0) candidateCategories = VALID_CATEGORIES;

            // 4. Pick a random category from the balanced pool
            const targetCategory = candidateCategories[Math.floor(Math.random() * candidateCategories.length)];
            
            console.log(`Auto-Gen Strategy: Excluding '${excludedCategory}' (${maxCount}), Target: '${targetCategory}'`);

            const generatedData = await DataService.generateContentWithAI('auto', '', targetCategory, guides);

            if (generatedData && generatedData.title) {
                let slug = slugify(generatedData.title);
                if (!slug) slug = `guide-${Date.now()}`;
                
                // --- NEW IMAGE PROVIDER: POLLINATIONS.AI ---
                // Using Pollinations for diversity based on keyword
                const imageKeyword = generatedData.imageKeyword || 'technology';
                const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imageKeyword)}?width=800&height=600&nologo=true&seed=${Math.floor(Math.random() * 10000)}`;

                const newGuide: Guide = {
                    id: Date.now().toString(),
                    title: generatedData.title,
                    slug: slug,
                    // language: 'tr', // Removed
                    category: generatedData.category || targetCategory,
                    difficulty: (generatedData.difficulty as any) || 'Kolay',
                    duration: generatedData.duration || '1 Gün',
                    description: generatedData.description || '',
                    imageUrl: imageUrl,
                    steps: generatedData.steps || [],
                    related: [],
                    views: 0,
                    createdAt: Date.now()
                };

                await DataService.saveGuide(newGuide); 
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
