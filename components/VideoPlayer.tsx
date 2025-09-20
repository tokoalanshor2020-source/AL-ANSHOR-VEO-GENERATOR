import React from 'react';
import { useLocalization } from '../i18n';

interface VideoPlayerProps {
  videoUrl: string;
  prompt: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoUrl, prompt }) => {
    const { t } = useLocalization();
    const downloadFileName = prompt.substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.mp4';
    
    return (
        <div className="mt-8 bg-base-200 p-6 sm:p-8 rounded-2xl shadow-2xl border border-base-300">
            {/* FIX: Cast result of t() to string */}
            <h2 className="text-2xl font-bold mb-4 text-center text-gray-100">{t('playerTitle') as string}</h2>
            <div className="aspect-w-16 aspect-h-9 bg-black rounded-lg overflow-hidden">
                <video src={videoUrl} controls autoPlay loop className="w-full h-full" />
            </div>
            <div className="mt-6 text-center">
                <a
                    href={videoUrl}
                    download={downloadFileName}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base-200 focus:ring-brand-secondary transition-colors"
                >
                    {/* FIX: Cast result of t() to string */}
                    {t('downloadButton') as string}
                </a>
            </div>
        </div>
    );
};
