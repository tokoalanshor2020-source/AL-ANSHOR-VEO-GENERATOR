import React from 'react';
import { VideoIcon } from './icons/VideoIcon';
import { KeyIcon } from './icons/KeyIcon';
import { useLocalization } from '../i18n';
import { LanguageSwitcher } from './LanguageSwitcher';
import { QuestionMarkCircleIcon } from './icons/QuestionMarkCircleIcon';


interface HeaderProps {
    onManageStoryKeysClick: () => void;
    onManageVideoKeysClick: () => void;
    onOpenTutorialClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onManageStoryKeysClick, onManageVideoKeysClick, onOpenTutorialClick }) => {
  const { t } = useLocalization();

  return (
    <header className="flex items-center justify-between w-full py-4">
        <div className="flex items-center gap-3">
             <div className="p-3 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-full shadow-lg">
                <VideoIcon className="h-8 w-8 text-white" />
            </div>
            <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                    {/* FIX: Cast result of t() to string */}
                    {t('appName') as string}
                </h1>
                <p className="hidden sm:block mt-1 text-sm text-gray-400">
                    {/* FIX: Cast result of t() to string */}
                    {t('appTagline') as string}
                </p>
            </div>
        </div>
      
      <div className="flex items-center gap-2 sm:gap-4">
        <LanguageSwitcher />
        <button 
            onClick={onOpenTutorialClick}
            className="inline-flex items-center gap-2 px-3 py-2 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-base-300 hover:bg-brand-primary/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base-100 focus:ring-brand-secondary transition-colors"
            aria-label={t('tutorialButton') as string}
        >
            <QuestionMarkCircleIcon className="h-4 w-4" />
            {/* FIX: Cast result of t() to string */}
            <span className="hidden sm:inline">{t('tutorialButton') as string}</span>
        </button>
        <button 
            onClick={onManageStoryKeysClick}
            className="inline-flex items-center gap-2 px-3 py-2 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-base-300 hover:bg-brand-primary/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base-100 focus:ring-brand-secondary transition-colors"
            aria-label={t('manageStoryApiKeys') as string}
        >
            <KeyIcon className="h-4 w-4" />
            {/* FIX: Cast result of t() to string */}
            <span className="hidden sm:inline">{t('manageStoryApiKeys') as string}</span>
        </button>
         <button 
            onClick={onManageVideoKeysClick}
            className="inline-flex items-center gap-2 px-3 py-2 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-base-300 hover:bg-brand-primary/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base-100 focus:ring-brand-secondary transition-colors"
            aria-label={t('manageVideoApiKeys') as string}
        >
            <KeyIcon className="h-4 w-4" />
            {/* FIX: Cast result of t() to string */}
            <span className="hidden sm:inline">{t('manageVideoApiKeys') as string}</span>
        </button>
      </div>
    </header>
  );
};