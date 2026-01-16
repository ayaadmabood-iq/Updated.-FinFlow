import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations synchronously
import en from '@/locales/en.json';
import ar from '@/locales/ar.json';
import fr from '@/locales/fr.json';
import es from '@/locales/es.json';
import zh from '@/locales/zh.json';
import de from '@/locales/de.json';
import hi from '@/locales/hi.json';

export const supportedLanguages = [
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
  { code: 'fr', name: 'French', nativeName: 'Français', dir: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', dir: 'ltr' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', dir: 'ltr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', dir: 'ltr' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr' },
] as const;

export type SupportedLanguage = typeof supportedLanguages[number]['code'];

const resources = {
  en: { translation: en },
  ar: { translation: ar },
  fr: { translation: fr },
  es: { translation: es },
  zh: { translation: zh },
  de: { translation: de },
  hi: { translation: hi },
};

export const isRTL = (lang?: string): boolean => {
  const language = lang || i18n.language || 'en';
  const langConfig = supportedLanguages.find((l) => l.code === language);
  return langConfig?.dir === 'rtl';
};

export const updateDocumentDirection = (lang: string): void => {
  if (typeof document === 'undefined') return;
  const htmlElement = document.documentElement;
  const rtl = isRTL(lang);
  
  htmlElement.setAttribute('dir', rtl ? 'rtl' : 'ltr');
  htmlElement.setAttribute('lang', lang);
};

// Initialize i18n - use initReactI18next AFTER setting up base config
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: supportedLanguages.map((l) => l.code),
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'fineflow_language',
    },
    react: {
      useSuspense: false,
    },
  });

// Set initial direction after init
updateDocumentDirection(i18n.language);

// Listen for language changes
i18n.on('languageChanged', (lang) => {
  updateDocumentDirection(lang);
  localStorage.setItem('fineflow_language', lang);
});

export default i18n;
