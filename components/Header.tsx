import React from 'react';
import { VideoIcon } from './icons/VideoIcon';
import { KeyIcon } from './icons/KeyIcon';
import { useLocalization } from '../i18n';
import { LanguageSwitcher } from './LanguageSwitcher';


interface HeaderProps {
    onManageKeysClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onManageKeysClick }) => {
  const { t } = useLocalization();

  return (
    <header className="flex items-center justify-between w-full py-4">
        <div className="flex items-center gap-3">
             <div className="p-3 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-full shadow-lg">
                <VideoIcon className="h-8 w-8 text-white" />
            </div>
            <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                    {t('appName')}
                </h1>
                <p className="hidden sm:block mt-1 text-sm text-gray-400">
                    {t('appTagline')}
                </p>
            </div>
        </div>
      
      <div className="flex items-center gap-2 sm:gap-4">
        <LanguageSwitcher />
        <button 
            onClick={onManageKeysClick}
            className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-base-300 hover:bg-brand-primary/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base-100 focus:ring-brand-secondary transition-colors"
            aria-label={t('manageApiKeys') as string}
        >
            <KeyIcon className="h-5 w-5" />
            <span className="hidden sm:inline">{t('manageApiKeys')}</span>
        </button>
      </div>
    </header>
  );
};