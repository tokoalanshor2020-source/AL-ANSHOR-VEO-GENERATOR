import React, { useState } from 'react';
import { useLocalization } from '../../i18n';
import { MagicWandIcon } from '../icons/MagicWandIcon';
import { RocketIcon } from '../icons/RocketIcon';
import { DirectorBridgeModal } from './DirectorBridgeModal';
import type { Character, DirectingSettings } from '../../types';
import { FilmIcon } from '../icons/FilmIcon';
import { ReferenceIdeaModal } from './ReferenceIdeaModal';


interface ScriptEditorProps {
    allStoryApiKeys: string[];
    onStoryKeyUpdate: (key: string) => void;
    logline: string;
    setLogline: (value: string) => void;
    scenario: string;
    setScenario: (value: string) => void;
    sceneCount: number;
    setSceneCount: (value: number) => void;
    isGenerating: boolean;
    // FIX: Changed prop type to accept an async function.
    onGenerateStoryboard: () => Promise<void>;
    characters: Character[];
    activeApiKey: string | null;
    directingSettings: DirectingSettings;
    setDirectingSettings: React.Dispatch<React.SetStateAction<DirectingSettings>>;
    onProceedToVideo: (prompt: string) => void;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = (props) => {
    const { t } = useLocalization();
    const [isDirectorBridgeOpen, setIsDirectorBridgeOpen] = useState(false);
    const [isReferenceModalOpen, setIsReferenceModalOpen] = useState(false);

    return (
        <div className="p-6 space-y-6">
            <div className="text-center p-4 bg-base-300/50 rounded-lg border-2 border-dashed border-purple-500">
                <h3 className="text-lg font-bold text-purple-400">{t('storyCreator.ideaWithReference') as string}</h3>
                <p className="text-gray-400 text-sm mb-4">{t('storyCreator.ideaWithReferenceDescription') as string}</p>
                 <button 
                    onClick={() => setIsReferenceModalOpen(true)}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                    disabled={!props.activeApiKey}
                >
                    <FilmIcon />
                    {t('storyCreator.openReferenceIdea') as string}
                </button>
            </div>

             <div className="text-center p-4 bg-base-300/50 rounded-lg border-2 border-dashed border-base-300">
                <h3 className="text-lg font-bold text-cyan-400">{t('storyCreator.haveIdea') as string}</h3>
                <p className="text-gray-400 text-sm mb-4">{t('storyCreator.ideaDescriptionDirect') as string}</p>
                <button 
                    onClick={() => props.onProceedToVideo('')}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700"
                >
                    <RocketIcon />
                    {t('storyCreator.openDirectVideo') as string}
                </button>
            </div>

            <div className="text-center p-4 bg-base-300/50 rounded-lg border-2 border-dashed border-base-300">
                <h3 className="text-lg font-bold text-amber-400">{t('storyCreator.needIdea') as string}</h3>
                <p className="text-gray-400 text-sm mb-4">{t('storyCreator.ideaDescription') as string}</p>
                <button 
                    onClick={() => setIsDirectorBridgeOpen(true)}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
                    disabled={!props.activeApiKey}
                >
                    <MagicWandIcon />
                    {t('storyCreator.openSmartDirector') as string}
                </button>
            </div>
            
            {isDirectorBridgeOpen && (
                <DirectorBridgeModal
                    isOpen={isDirectorBridgeOpen}
                    onClose={() => setIsDirectorBridgeOpen(false)}
                    characters={props.characters}
                    allKeys={props.allStoryApiKeys}
                    activeKey={props.activeApiKey}
                    onKeyUpdate={props.onStoryKeyUpdate}
                    // Pass all the editor state and functions to the modal
                    logline={props.logline}
                    setLogline={props.setLogline}
                    scenario={props.scenario}
                    setScenario={props.setScenario}
                    sceneCount={props.sceneCount}
                    setSceneCount={props.setSceneCount}
                    directingSettings={props.directingSettings}
                    setDirectingSettings={props.setDirectingSettings}
                    isGenerating={props.isGenerating}
                    onGenerateStoryboard={props.onGenerateStoryboard}
                />
            )}
            
            {isReferenceModalOpen && (
                 <ReferenceIdeaModal
                    isOpen={isReferenceModalOpen}
                    onClose={() => setIsReferenceModalOpen(false)}
                    onProceedToVideo={props.onProceedToVideo}
                    allApiKeys={props.allStoryApiKeys}
                    activeApiKey={props.activeApiKey}
                    onKeyUpdate={props.onStoryKeyUpdate}
                />
            )}
        </div>
    );
};