
import React, { createContext, useState, useContext, useEffect } from 'react';

// Removed direct JSON imports that use import assertions, as they are not supported by the browser.
// import en from './locales/en.json' assert { type: 'json' };
// import tr from './locales/tr.json' assert { type: 'json' };

interface I18nContextType {
    locale: string;
    setLocale: (locale: string) => void;
    t: (key: string) => string;
}

export const I18nContext = createContext<I18nContextType>({
    locale: 'en',
    setLocale: () => {},
    t: (key) => key,
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [locale, setLocaleState] = useState('en');
    // Translations will now be loaded asynchronously.
    const [translations, setTranslations] = useState<Record<string, any>>({});

    // Fetch translation files when the provider mounts.
    useEffect(() => {
        const loadTranslations = async () => {
            try {
                const [enResponse, trResponse] = await Promise.all([
                    fetch('i18n/locales/en.json'),
                    fetch('i18n/locales/tr.json')
                ]);
                const enData = await enResponse.json();
                const trData = await trResponse.json();
                setTranslations({ en: enData, tr: trData });
            } catch (error) {
                console.error('Failed to load translation files:', error);
            }
        };
        loadTranslations();
    }, []);

    // Auto-detect language on initial load
    useEffect(() => {
        if (!Object.keys(translations).length) return; // Wait for translations to load

        const savedLocale = localStorage.getItem('locale');
        const browserLang = navigator.language.split('-')[0];

        if (savedLocale && translations[savedLocale]) {
            setLocaleState(savedLocale);
        } else if (translations[browserLang]) {
            setLocaleState(browserLang);
        } else {
            setLocaleState('en'); // Default to English
        }
    }, [translations]);

    const setLocale = (newLocale: string) => {
        if (translations[newLocale]) {
            localStorage.setItem('locale', newLocale);
            setLocaleState(newLocale);
        }
    };

    const t = (key: string): string => {
        const keys = key.split('.');
        let result = translations[locale] || translations['en'];
        for (const k of keys) {
            result = result?.[k];
        }
        if (result) return result;
        
        // Fallback to english
        result = translations['en'];
        for (const k of keys) {
            result = result?.[k];
        }
        return result || key;
    };
    
    // Using React.createElement to avoid JSX syntax errors in a .ts file.
    return React.createElement(
        I18nContext.Provider,
        { value: { locale, setLocale, t } },
        children
    );
};

export const useTranslation = () => {
    return useContext(I18nContext);
};
