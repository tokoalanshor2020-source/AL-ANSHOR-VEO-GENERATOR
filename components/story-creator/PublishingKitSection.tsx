import React from 'react';
import type { StoryboardScene } from '../../types';
import { useLocalization } from '../../i18n';
import { RocketIcon } from '../icons/RocketIcon';

interface PublishingKitSectionProps {
    storyboard: StoryboardScene[];
    onGenerate: () => void;
    isGenerating: boolean;
    activeApiKey: string | null;
}

export const PublishingKitSection: React.FC<PublishingKitSectionProps> = ({ storyboard, onGenerate, isGenerating, activeApiKey }) => {
    const { t } = useLocalization();

    if (storyboard.length === 0) {
        return null;
    }

    return (
        <div className="bg-base-200 rounded-xl border-2 border-dashed border-cyan-500">
            <div className="p-4 flex items-center gap-2">
                <RocketIcon className="h-6 w-6 text-cyan-300" />
                <h2 className="text-xl font-bold text-cyan-300">{t('storyCreator.publishingKitSection.title')}</h2>
            </div>
            <div className="p-4 border-t border-base-300 space-y-4">
                <p className="text-sm text-gray-400">{t('storyCreator.publishingKitSection.description')}</p>
                <button
                    onClick={onGenerate}
                    disabled={isGenerating || !activeApiKey}
                    className="w-full font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 transition-all"
                >
                    ✨ {isGenerating ? t('storyCreator.publishingKitSection.generatingButton') : t('storyCreator.publishingKitSection.generateButton')}
                </button>
            </div>
        </div>
    );
};
