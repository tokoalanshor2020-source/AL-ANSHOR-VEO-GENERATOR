import React from 'react';
import { CharacterGarage } from './CharacterGarage';
import { DirectingDesk } from './DirectingDesk';
import type { Character, DirectingSettings } from '../../types';
import { useLocalization } from '../../i18n';

interface SidebarProps {
    characters: Character[];
    setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
    directingSettings: DirectingSettings;
    setDirectingSettings: React.Dispatch<React.SetStateAction<DirectingSettings>>;
    onNewStory: () => void;
    activeApiKey: string | null;
}

export const Sidebar: React.FC<SidebarProps> = (props) => {
    const { t } = useLocalization();
    return (
        <aside className="w-full md:w-1/3 lg:w-1/4 space-y-6 flex-shrink-0">
             <button 
                onClick={props.onNewStory}
                className="w-full bg-brand-primary hover:bg-brand-dark text-white font-bold py-2 px-4 rounded-lg shadow-lg transition-colors"
             >
                {t('storyCreator.newStory')}
            </button>
            <CharacterGarage
                characters={props.characters}
                setCharacters={props.setCharacters}
                activeApiKey={props.activeApiKey}
            />
            <DirectingDesk
                settings={props.directingSettings}
                setSettings={props.setDirectingSettings}
            />
        </aside>
    );
};
