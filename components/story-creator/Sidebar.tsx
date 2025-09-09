import React from 'react';
import { CharacterGarage } from './CharacterGarage';
import { PublishingKitSection } from './PublishingKitSection';
import type { Character, StoryboardScene } from '../../types';
import { useLocalization } from '../../i18n';

interface SidebarProps {
    characters: Character[];
    setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
    onNewStory: () => void;
    activeApiKey: string | null;
    allStoryApiKeys: string[];
    onStoryKeyUpdate: (key: string) => void;
    storyboard: StoryboardScene[];
    onGeneratePublishingKit: () => void;
    isGeneratingKit: boolean;
    activeVideoApiKey: string | null;
}

export const Sidebar: React.FC<SidebarProps> = (props) => {
    const { t } = useLocalization();
    return (
        <aside className="w-full md:w-1/3 lg:w-1/4 space-y-6 flex-shrink-0 md:sticky md:top-28 md:self-start md:max-h-[calc(100vh-8rem)] md:overflow-y-auto pr-2 pb-6">
             <button 
                onClick={props.onNewStory}
                className="w-full bg-brand-primary hover:bg-brand-dark text-white font-bold py-2 px-4 rounded-lg shadow-lg transition-colors"
             >
                {/* FIX: Cast result of t() to string */}
                {t('storyCreator.newStory') as string}
            </button>
            <CharacterGarage
                characters={props.characters}
                setCharacters={props.setCharacters}
                activeApiKey={props.activeApiKey}
                allStoryApiKeys={props.allStoryApiKeys}
                onStoryKeyUpdate={props.onStoryKeyUpdate}
            />
            <PublishingKitSection 
                storyboard={props.storyboard}
                onGenerate={props.onGeneratePublishingKit}
                isGenerating={props.isGeneratingKit}
                activeApiKey={props.activeApiKey}
                activeVideoApiKey={props.activeVideoApiKey}
            />
        </aside>
    );
};