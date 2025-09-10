import React, { useState, useRef, useEffect } from 'react';
import { VideoIcon } from './icons/VideoIcon';
import { KeyIcon } from './icons/KeyIcon';
import { useLocalization } from '../i18n';
import { LanguageSwitcher } from './LanguageSwitcher';
import { QuestionMarkCircleIcon } from './icons/QuestionMarkCircleIcon';
import { CogIcon } from './icons/CogIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { PlayIcon } from './icons/PlayIcon';


interface HeaderProps {
    onManageStoryKeysClick: () => void;
    onManageVideoKeysClick: () => void;
    onOpenTutorialClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onManageStoryKeysClick, onManageVideoKeysClick, onOpenTutorialClick }) => {
  const { t } = useLocalization();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const [isTutorialMenuOpen, setIsTutorialMenuOpen] = useState(false);
  const tutorialRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
            setIsSettingsOpen(false);
        }
        if (tutorialRef.current && !tutorialRef.current.contains(event.target as Node)) {
            setIsTutorialMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleManageStoryKeys = () => {
    onManageStoryKeysClick();
    setIsSettingsOpen(false);
  };

  const handleManageVideoKeys = () => {
    onManageVideoKeysClick();
    setIsSettingsOpen(false);
  };

  const handleOpenTextTutorial = () => {
    onOpenTutorialClick();
    setIsTutorialMenuOpen(false);
  };

  const handleOpenVideoTutorial = () => {
    window.open('https://www.youtube.com/playlist?list=PL34uOzbrHaJ-FEQBaQc0TWIllkakOtJPl', '_blank');
    setIsTutorialMenuOpen(false);
  };

  return (
    <header className="flex items-center justify-between w-full py-4">
        <div className="flex items-center gap-3">
             <div className="p-3 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-full shadow-lg">
                <VideoIcon className="h-8 w-8 text-white" />
            </div>
            <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                    {t('appName') as string}
                </h1>
                <p className="hidden sm:block mt-1 text-sm text-gray-400">
                    {t('appTagline') as string}
                </p>
            </div>
        </div>
      
      <div className="flex items-center gap-2 sm:gap-4">
        <LanguageSwitcher />

        <div className="relative" ref={tutorialRef}>
            <button
                onClick={() => setIsTutorialMenuOpen(prev => !prev)}
                className="inline-flex items-center gap-2 px-3 py-2 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-base-300 hover:bg-brand-primary/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base-100 focus:ring-brand-secondary transition-colors"
                aria-haspopup="true"
                aria-expanded={isTutorialMenuOpen}
            >
                <QuestionMarkCircleIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{t('tutorialButton') as string}</span>
            </button>
            {isTutorialMenuOpen && (
                 <div
                    className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-base-200 ring-1 ring-black ring-opacity-5 z-50 focus:outline-none"
                    role="menu"
                    aria-orientation="vertical"
                >
                    <div className="py-1" role="none">
                         <button 
                            onClick={handleOpenTextTutorial}
                            className="text-gray-300 group flex items-center gap-3 w-full px-4 py-2 text-sm text-left hover:bg-base-300 hover:text-white"
                            role="menuitem"
                        >
                            <DocumentTextIcon className="h-4 w-4" />
                            <span>{t('tutorial.textTutorial') as string}</span>
                        </button>
                         <button 
                            onClick={handleOpenVideoTutorial}
                            className="text-gray-300 group flex items-center gap-3 w-full px-4 py-2 text-sm text-left hover:bg-base-300 hover:text-white"
                            role="menuitem"
                        >
                            <PlayIcon className="h-4 w-4" />
                            <span>{t('tutorial.videoTutorial') as string}</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
        
        <div className="relative" ref={settingsRef}>
            <button
                onClick={() => setIsSettingsOpen(prev => !prev)}
                className="inline-flex items-center gap-2 px-3 py-2 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-base-300 hover:bg-brand-primary/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base-100 focus:ring-brand-secondary transition-colors"
                aria-haspopup="true"
                aria-expanded={isSettingsOpen}
            >
                <CogIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{t('settingsButton') as string}</span>
            </button>
            {isSettingsOpen && (
                 <div
                    className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-base-200 ring-1 ring-black ring-opacity-5 z-50 focus:outline-none"
                    role="menu"
                    aria-orientation="vertical"
                >
                    <div className="py-1" role="none">
                         <button 
                            onClick={handleManageStoryKeys}
                            className="text-gray-300 group flex items-center gap-3 w-full px-4 py-2 text-sm text-left hover:bg-base-300 hover:text-white"
                            role="menuitem"
                        >
                            <KeyIcon className="h-4 w-4" />
                            <span>{t('manageStoryApiKeys') as string}</span>
                        </button>
                         <button 
                            onClick={handleManageVideoKeys}
                            className="text-gray-300 group flex items-center gap-3 w-full px-4 py-2 text-sm text-left hover:bg-base-300 hover:text-white"
                            role="menuitem"
                        >
                            <KeyIcon className="h-4 w-4" />
                            <span>{t('manageVideoApiKeys') as string}</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </header>
  );
};
