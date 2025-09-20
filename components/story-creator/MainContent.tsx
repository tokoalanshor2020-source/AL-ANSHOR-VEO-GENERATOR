import React from 'react';
import { ScriptEditor } from './ScriptEditor';
import { Storyboard } from './Storyboard';
import { PublishingKitView } from './PublishingKitView';
import { useLocalization } from '../../i18n';
import type { Character, DirectingSettings, StoryboardScene, PublishingKitData, ReferenceIdeaState, AffiliateCreatorState } from '../../types';

type ActiveTab = 'editor' | 'storyboard' | 'publishingKit';

interface MainContentProps {
    allStoryApiKeys: string[];
    activeStoryApiKey: string | null;
    onStoryKeyUpdate: (key: string) => void;

    allVideoApiKeys: string[];
    activeVideoApiKey: string | null;
    onVideoKeyUpdate: (key: string) => void;

    logline: string;
    setLogline: (value: string) => void;
    scenario: string;
    setScenario: (value: string) => void;
    sceneCount: number;
    setSceneCount: (value: number) => void;
    isGenerating: boolean;
    // FIX: Update prop type to accept an async function.
    onGenerateStoryboard: () => Promise<void>;
    storyboard: StoryboardScene[];
    error: string | null;
    onProceedToVideo: (prompt: string, image?: { base64: string, mimeType: string }) => void;
    activeApiKey: string | null;
    characters: Character[];
    directingSettings: DirectingSettings;
    setDirectingSettings: React.Dispatch<React.SetStateAction<DirectingSettings>>;
    activeTab: ActiveTab;
    setActiveTab: (tab: ActiveTab) => void;
    onUpdateScene: (sceneIndex: number, updatedPrompts: Partial<Pick<StoryboardScene, 'blueprintPrompt' | 'cinematicPrompt'>>) => void;
    publishingKit: PublishingKitData | null;
    referenceIdeaState: ReferenceIdeaState;
    setReferenceIdeaState: React.Dispatch<React.SetStateAction<ReferenceIdeaState>>;
    isReferenceIdeaModalOpen: boolean;
    setIsReferenceIdeaModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    isAffiliateCreatorModalOpen: boolean;
    setIsAffiliateCreatorModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
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
            {activeTab === 'storyboard' && <Storyboard
                {...props}
                allKeys={props.allStoryApiKeys}
                activeKey={props.activeStoryApiKey}
                onKeyUpdate={props.onStoryKeyUpdate}
            />}
            {activeTab === 'publishingKit' && publishingKit && <PublishingKitView
                kitData={publishingKit}
                {...props}
                allKeys={props.allVideoApiKeys}
                activeKey={props.activeVideoApiKey}
                onKeyUpdate={props.onVideoKeyUpdate}
            />}
        </main>
    );
};
