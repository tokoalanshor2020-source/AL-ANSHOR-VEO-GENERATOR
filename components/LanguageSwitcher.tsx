import React, { useState, useRef, useEffect } from 'react';
import { useLocalization, languageMap, Language } from '../i18n';
import { GlobeIcon } from './icons/GlobeIcon';

export const LanguageSwitcher: React.FC = () => {
    const { language, setLanguage } = useLocalization();
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const handleLanguageChange = (lang: Language) => {
        setLanguage(lang);
        setIsOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);
    
    const languageEntries = Object.entries(languageMap) as [Language, string][];

    return (
        <div className="relative inline-block text-left" ref={wrapperRef}>
            <div>
                <button
                    type="button"
                    className="inline-flex items-center justify-center w-full rounded-md border border-gray-700 shadow-sm px-4 py-2 bg-base-300 text-sm font-medium text-gray-300 hover:bg-base-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base-100 focus:ring-brand-secondary"
                    id="options-menu"
                    aria-haspopup="true"
                    aria-expanded={isOpen}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <GlobeIcon className="h-5 w-5" />
                    <span className="mx-2 hidden sm:inline">{languageMap[language]}</span>
                     <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>

            {isOpen && (
                <div
                    className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-base-200 ring-1 ring-black ring-opacity-5 z-50 focus:outline-none"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="options-menu"
                >
                    <div className="py-1 max-h-60 overflow-y-auto" role="none">
                        {languageEntries.map(([langCode, langName]) => (
                             <button
                                key={langCode}
                                onClick={() => handleLanguageChange(langCode)}
                                className={`${
                                    language === langCode ? 'font-bold text-white bg-brand-primary/30' : 'text-gray-300'
                                } group flex items-center w-full px-4 py-2 text-sm text-left hover:bg-base-300 hover:text-white`}
                                role="menuitem"
                            >
                               {langName}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};