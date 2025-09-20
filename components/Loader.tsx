import React, { useState, useEffect } from 'react';
import { useLocalization } from '../i18n';

export const Loader: React.FC = () => {
    const { t } = useLocalization();
    const messages = t('loadingMessages') as string[];
    const [messageIndex, setMessageIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex(prevIndex => (prevIndex + 1) % messages.length);
        }, 3500);

        return () => clearInterval(interval);
    }, [messages.length]);

    return (
        <div className="mt-8 text-center bg-base-200 p-8 rounded-2xl shadow-xl border border-base-300">
            <div className="flex justify-center items-center">
                <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {/* FIX: Cast result of t() to string */}
                <h3 className="text-xl font-semibold text-gray-200">{t('loaderTitle') as string}</h3>
            </div>
            <p className="mt-4 text-gray-400 transition-opacity duration-500 ease-in-out">
                {messages[messageIndex]}
            </p>
        </div>
    );
}
