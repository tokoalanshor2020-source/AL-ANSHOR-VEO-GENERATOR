import React, { useState, useCallback } from 'react';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { ConfirmationModal } from '../ConfirmationModal';
import { useLocalization } from '../../i18n';
import type { Character, StoryboardScene, DirectingSettings, PublishingKitData } from '../../types';
import { generateStoryboard, generatePublishingKit } from '../../services/storyCreatorService';

interface StoryCreatorProps {
    activeStoryApiKey: string | null;
    onManageKeysClick: () => void;
    onProceedToVideo: (prompt: string) => void;
    
    // State lifted to App.tsx
    characters: Character[];
    setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
    storyboard: StoryboardScene[];
    setStoryboard: React.Dispatch<React.SetStateAction<StoryboardScene[]>>;
    logline: string;
    setLogline: React.Dispatch<React.SetStateAction<string>>;
    scenario: string;
    setScenario: React.Dispatch<React.SetStateAction<string>>;
    sceneCount: number;
    setSceneCount: React.Dispatch<React.SetStateAction<number>>;
    directingSettings: DirectingSettings;
    setDirectingSettings: React.Dispatch<React.SetStateAction<DirectingSettings>>;
    onNewStory: () => void;
    onUpdateScene: (sceneIndex: number, updatedPrompts: Partial<Pick<StoryboardScene, 'blueprintPrompt' | 'cinematicPrompt'>>) => void;
    publishingKit: PublishingKitData | null;
    setPublishingKit: React.Dispatch<React.SetStateAction<PublishingKitData | null>>;
}


type ActiveTab = 'editor' | 'storyboard' | 'publishingKit';

export const StoryCreator: React.FC<StoryCreatorProps> = (props) => {
    const { t } = useLocalization();
    const { 
        activeStoryApiKey, onManageKeysClick, onProceedToVideo, 
        characters, setCharacters, storyboard, setStoryboard,
        logline, setLogline, scenario, setScenario, sceneCount, setSceneCount,
        directingSettings, onNewStory, publishingKit, setPublishingKit
    } = props;

    const [isGenerating, setIsGenerating] = useState(false);
    const [isGeneratingKit, setIsGeneratingKit] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<ActiveTab>('editor');

    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmProps, setConfirmProps] = useState({ title: '', message: '', onConfirm: () => {} });

    const showConfirmation = (title: string, message: string, onConfirm: () => void) => {
        setConfirmProps({ title, message, onConfirm });
        setIsConfirmOpen(true);
    };

    const handleConfirm = () => {
        confirmProps.onConfirm();
        setIsConfirmOpen(false);
    };

    const handleCancel = () => {
        setIsConfirmOpen(false);
    };

    const handleNewStoryClick = () => {
        showConfirmation(
            t('storyCreator.confirmNewStoryTitle') as string,
            t('storyCreator.confirmNewStoryMessage') as string,
            () => {
                onNewStory();
                setActiveTab('editor');
            }
        );
    };

    const handleGenerateStoryboard = useCallback(async () => {
        if (!activeStoryApiKey) {
            alert(t('alertSetStoryApiKey'));
            onManageKeysClick();
            return;
        }
        if (!logline.trim() || !scenario.trim()) {
            alert(t('alertEnterPrompt'));
            return;
        }

        setIsGenerating(true);
        setError(null);
        setStoryboard([]);
        setPublishingKit(null);

        try {
            const scenes = await generateStoryboard(activeStoryApiKey, {
                logline,
                scenario,
                sceneCount,
                characters,
                directingSettings,
            });
            setStoryboard(scenes);
            setActiveTab('storyboard'); 
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : 'An unknown error occurred');
            setActiveTab('storyboard');
        } finally {
            setIsGenerating(false);
        }
    }, [activeStoryApiKey, logline, scenario, sceneCount, characters, directingSettings, onManageKeysClick, t, setStoryboard, setPublishingKit]);

    const handleGeneratePublishingKit = useCallback(async () => {
        if (!activeStoryApiKey) {
            alert(t('alertSetStoryApiKey'));
            onManageKeysClick();
            return;
        }
        setIsGeneratingKit(true);
        setError(null);
        try {
            const kit = await generatePublishingKit(activeStoryApiKey, { storyboard, characters, logline });
            setPublishingKit(kit);
            setActiveTab('publishingKit');
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : 'An unknown error occurred');
            setActiveTab('publishingKit');
        } finally {
            setIsGeneratingKit(false);
        }

    }, [activeStoryApiKey, storyboard, characters, logline, onManageKeysClick, t, setPublishingKit]);

    return (
        <div className="flex flex-col md:flex-row gap-6">
            <Sidebar
                characters={characters}
                setCharacters={setCharacters}
                directingSettings={props.directingSettings}
                setDirectingSettings={props.setDirectingSettings}
                onNewStory={handleNewStoryClick}
                activeApiKey={activeStoryApiKey}
                storyboard={storyboard}
                onGeneratePublishingKit={handleGeneratePublishingKit}
                isGeneratingKit={isGeneratingKit}
            />
            <MainContent
                logline={logline}
                setLogline={setLogline}
                scenario={scenario}
                setScenario={setScenario}
                sceneCount={sceneCount}
                setSceneCount={setSceneCount}
                isGenerating={isGenerating}
                onGenerateStoryboard={handleGenerateStoryboard}
                storyboard={storyboard}
                error={error}
                onProceedToVideo={onProceedToVideo}
                activeApiKey={activeStoryApiKey}
                characters={characters}
                directingSettings={directingSettings}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onUpdateScene={props.onUpdateScene}
                publishingKit={publishingKit}
            />
            {isConfirmOpen && (
                <ConfirmationModal
                    title={confirmProps.title}
                    message={confirmProps.message}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                />
            )}
        </div>
    );
};
