import React from 'react';
import type { StoryboardScene } from '../../types';
import { useLocalization } from '../../i18n';
import { RocketIcon } from '../icons/RocketIcon';

interface PublishingKitSectionProps {
    storyboard: StoryboardScene[];
    onGenerate: () => void;
    isGenerating: boolean;
    activeApiKey: string | null;
    activeVideoApiKey: string | null;
}

export const PublishingKitSection: React.FC<PublishingKitSectionProps> = ({ storyboard, onGenerate, isGenerating, activeApiKey, activeVideoApiKey }) => {
    const { t } = useLocalization();

    if (storyboard.length === 0) {
        return null;
    }

    // Disable if no story or video key
    const isEffectivelyDisabled = !activeApiKey || !activeVideoApiKey;
    const isDisabled = isGenerating || isEffectivelyDisabled;

    return (
        <div className={`bg-base-200 rounded-xl border-2 border-dashed ${isEffectivelyDisabled ? 'border-gray-600 opacity-70' : 'border-cyan-500'} transition-all`}>
            <div className="p-4 flex items-center gap-2">
                <RocketIcon className={`h-6 w-6 ${isEffectivelyDisabled ? 'text-gray-500' : 'text-cyan-300'} transition-colors`} />
                <h2 className={`text-xl font-bold ${isEffectivelyDisabled ? 'text-gray-500' : 'text-cyan-300'} transition-colors`}>{t('storyCreator.publishingKitSection.title') as string}</h2>
            </div>
            <div className="p-4 border-t border-base-300 space-y-4">
                <p className="text-sm text-gray-400">{t('storyCreator.publishingKitSection.description') as string}</p>
                <button
                    onClick={onGenerate}
                    disabled={isDisabled}
                    className="w-full font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
                >
                    ✨ {(isGenerating ? t('storyCreator.publishingKitSection.generatingButton') : t('storyCreator.publishingKitSection.generateButton')) as string}
                </button>
                {isEffectivelyDisabled && (
                     <p className="text-xs text-yellow-400/80 text-center">
                        {t('storyCreator.publishingKitSection.apiKeyInstruction') as string}
                    </p>
                )}
            </div>
        </div>
    );
};