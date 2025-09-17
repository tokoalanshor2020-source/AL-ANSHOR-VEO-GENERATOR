import React, { useState, useCallback } from 'react';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { ConfirmationModal } from '../ConfirmationModal';
import { useLocalization } from '../../i18n';
import type { Character, StoryboardScene, DirectingSettings, PublishingKitData, ActiveTab, ReferenceIdeaState } from '../../types';
import { generateStoryboard, generatePublishingKit } from '../../services/storyCreatorService';
import { FailoverParams } from '../../services/geminiService';

interface StoryCreatorProps {
    allStoryApiKeys: string[];
    activeStoryApiKey: string | null;
    onStoryKeyUpdate: (key: string) => void;
    
    allVideoApiKeys: string[];
    activeVideoApiKey: string | null;
    onVideoKeyUpdate: (key: string) => void;

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
    activeTab: ActiveTab;
    setActiveTab: (tab: ActiveTab) => void;
    referenceIdeaState: ReferenceIdeaState;
    setReferenceIdeaState: React.Dispatch<React.SetStateAction<ReferenceIdeaState>>;
    isReferenceIdeaModalOpen: boolean;
    setIsReferenceIdeaModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const StoryCreator: React.FC<StoryCreatorProps> = (props) => {
    const { t } = useLocalization();
    const { 
        allStoryApiKeys, activeStoryApiKey, onStoryKeyUpdate, onManageKeysClick, onProceedToVideo, 
        characters, setCharacters, storyboard, setStoryboard,
        logline, setLogline, scenario, setScenario, sceneCount, setSceneCount,
        directingSettings, setDirectingSettings, onNewStory, publishingKit, setPublishingKit,
        activeTab, setActiveTab, referenceIdeaState, setReferenceIdeaState,
        isReferenceIdeaModalOpen, setIsReferenceIdeaModalOpen
    } = props;

    const [isGenerating, setIsGenerating] = useState(false);
    const [isGeneratingKit, setIsGeneratingKit] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmProps, setConfirmProps] = useState({ title: '', message: '', onConfirm: () => {} });

    const getFailoverParams = (): FailoverParams => ({
        allKeys: allStoryApiKeys,
        activeKey: activeStoryApiKey,
        onKeyUpdate: onStoryKeyUpdate,
    });

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
            const scenes = await generateStoryboard(getFailoverParams(), {
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
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
            const displayError = errorMessage === 'errorRateLimit' ? t('errorRateLimit') : errorMessage;
            setError(displayError as string);
            setActiveTab('storyboard');
        } finally {
            setIsGenerating(false);
        }
    }, [activeStoryApiKey, logline, scenario, sceneCount, characters, directingSettings, onManageKeysClick, t, setStoryboard, setPublishingKit, setActiveTab, allStoryApiKeys, onStoryKeyUpdate]);

    const handleGeneratePublishingKit = useCallback(async () => {
        if (!activeStoryApiKey) {
            alert(t('alertSetStoryApiKey'));
            onManageKeysClick();
            return;
        }
        if (!props.activeVideoApiKey) {
            alert(t('alertSetVideoThumbnailApiKey') as string);
            // This won't be called if the button is disabled, but it's good practice.
            return;
        }
        setIsGeneratingKit(true);
        setError(null);
        try {
            const kit = await generatePublishingKit(getFailoverParams(), { storyboard, characters, logline });
            setPublishingKit(kit);
            setActiveTab('publishingKit');
        } catch (e) {
            console.error(e);
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
            const displayError = errorMessage === 'errorRateLimit' ? t('errorRateLimit') : errorMessage;
            setError(displayError as string);
            setActiveTab('publishingKit');
        } finally {
            setIsGeneratingKit(false);
        }

    }, [activeStoryApiKey, props.activeVideoApiKey, storyboard, characters, logline, onManageKeysClick, t, setPublishingKit, setActiveTab, allStoryApiKeys, onStoryKeyUpdate]);

    return (
        <div className="flex flex-col md:flex-row gap-6 md:items-start">
            <Sidebar
                characters={characters}
                setCharacters={setCharacters}
                onNewStory={handleNewStoryClick}
                activeApiKey={activeStoryApiKey}
                storyboard={storyboard}
                onGeneratePublishingKit={handleGeneratePublishingKit}
                isGeneratingKit={isGeneratingKit}
                allStoryApiKeys={allStoryApiKeys}
                onStoryKeyUpdate={onStoryKeyUpdate}
                activeVideoApiKey={props.activeVideoApiKey}
            />
            <MainContent
                {...props}
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
                setDirectingSettings={setDirectingSettings}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onUpdateScene={props.onUpdateScene}
                publishingKit={publishingKit}
                referenceIdeaState={referenceIdeaState}
                setReferenceIdeaState={setReferenceIdeaState}
                isReferenceIdeaModalOpen={isReferenceIdeaModalOpen}
                setIsReferenceIdeaModalOpen={setIsReferenceIdeaModalOpen}
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