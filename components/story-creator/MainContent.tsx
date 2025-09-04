import React from 'react';
import { ScriptEditor } from './ScriptEditor';
import { Storyboard } from './Storyboard';
import { PublishingKitView } from './PublishingKitView';
import { useLocalization } from '../../i18n';
import type { Character, DirectingSettings, StoryboardScene, PublishingKitData } from '../../types';

type ActiveTab = 'editor' | 'storyboard' | 'publishingKit';

interface MainContentProps {
    logline: string;
    setLogline: (value: string) => void;
    scenario: string;
    setScenario: (value: string) => void;
    sceneCount: number;
    setSceneCount: (value: number) => void;
    isGenerating: boolean;
    onGenerateStoryboard: () => void;
    storyboard: StoryboardScene[];
    error: string | null;
    onProceedToVideo: (prompt: string) => void;
    activeApiKey: string | null;
    characters: Character[];
    directingSettings: DirectingSettings;
    activeTab: ActiveTab;
    setActiveTab: (tab: ActiveTab) => void;
    onUpdateScene: (sceneIndex: number, updatedPrompts: Partial<Pick<StoryboardScene, 'blueprintPrompt' | 'cinematicPrompt'>>) => void;
    publishingKit: PublishingKitData | null;
}

export const MainContent: React.FC<MainContentProps> = ({ activeTab, setActiveTab, publishingKit, ...props }) => {
    const { t } = useLocalization();

    const TabButton: React.FC<{ tabId: ActiveTab; label: string }> = ({ tabId, label }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`font-semibold py-3 px-5 border-b-2 transition-colors ${activeTab === tabId ? 'border-amber-400 text-amber-300' : 'border-transparent text-gray-400 hover:text-white'}`}
        >
            {label}
        </button>
    );

    return (
        <main className="w-full md:w-2/3 lg:w-3/4 bg-base-200/50 rounded-xl border border-base-300">
            <div className="border-b border-base-300 flex">
                <TabButton tabId="editor" label={t('storyCreator.storyEditor') as string} />
                <TabButton tabId="storyboard" label={t('storyCreator.storyboard') as string} />
                {publishingKit && <TabButton tabId="publishingKit" label={t('storyCreator.publishingKit') as string} />}
            </div>
            
            {activeTab === 'editor' && <ScriptEditor {...props} />}
            {activeTab === 'storyboard' && <Storyboard {...props} />}
            {activeTab === 'publishingKit' && publishingKit && <PublishingKitView kitData={publishingKit} activeApiKey={props.activeApiKey} />}
        </main>
    );
};
