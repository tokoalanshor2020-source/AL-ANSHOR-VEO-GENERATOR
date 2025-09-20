import React from 'react';
import { useLocalization } from '../../i18n';
import { MagicWandIcon } from '../icons/MagicWandIcon';
import { RocketIcon } from '../icons/RocketIcon';
import { DirectorBridgeModal } from './DirectorBridgeModal';
import type { Character, DirectingSettings, ReferenceIdeaState, AffiliateCreatorState } from '../../types';
import { FilmIcon } from '../icons/FilmIcon';
import { ReferenceIdeaModal } from './ReferenceIdeaModal';
import { ShoppingCartIcon } from '../icons/ShoppingCartIcon';


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
    onProceedToVideo: (prompt: string, image?: { base64: string, mimeType: string }) => void;
    activeVideoApiKey: string | null;
    referenceIdeaState: ReferenceIdeaState;
    setReferenceIdeaState: React.Dispatch<React.SetStateAction<ReferenceIdeaState>>;
    isReferenceIdeaModalOpen: boolean;
    setIsReferenceIdeaModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    isAffiliateCreatorModalOpen: boolean;
    setIsAffiliateCreatorModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = (props) => {
    const { t } = useLocalization();
    const [isDirectorBridgeOpen, setIsDirectorBridgeOpen] = React.useState(false);
    
    const { isReferenceIdeaModalOpen, setIsReferenceIdeaModalOpen, setIsAffiliateCreatorModalOpen } = props;

    return (
        <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="text-center p-4 bg-base-300/50 rounded-lg border-2 border-dashed border-amber-500">
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

                <div className="text-center p-4 bg-base-300/50 rounded-lg border-2 border-dashed border-purple-500">
                    <h3 className="text-lg font-bold text-purple-400">{t('storyCreator.ideaWithReference') as string}</h3>
                    <p className="text-gray-400 text-sm mb-4">{t('storyCreator.ideaWithReferenceDescription') as string}</p>
                    <button 
                        onClick={() => setIsReferenceIdeaModalOpen(true)}
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                        disabled={!props.activeApiKey}
                    >
                        <FilmIcon />
                        {t('storyCreator.openReferenceIdea') as string}
                    </button>
                </div>

                <div className="text-center p-4 bg-base-300/50 rounded-lg border-2 border-dashed border-green-500">
                    <h3 className="text-lg font-bold text-green-400">{t('storyCreator.createAffiliateVideo') as string}</h3>
                    <p className="text-gray-400 text-sm mb-4">{t('affiliateCreator.description') as string}</p>
                    <button
                        onClick={() => setIsAffiliateCreatorModalOpen(true)}
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                        disabled={!props.activeApiKey || !props.activeVideoApiKey}
                    >
                        <ShoppingCartIcon />
                        {t('storyCreator.createAffiliateVideo') as string}
                    </button>
                </div>

                <div className="text-center p-4 bg-base-300/50 rounded-lg border-2 border-dashed border-cyan-500">
                    <h3 className="text-lg font-bold text-cyan-400">{t('storyCreator.haveIdea') as string}</h3>
                    <p className="text-gray-400 text-sm mb-4">{t('storyCreator.ideaDescriptionDirect') as string}</p>
                    <button 
                        onClick={() => props.onProceedToVideo('')}
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!props.activeVideoApiKey}
                    >
                        <RocketIcon />
                        {t('storyCreator.openDirectVideo') as string}
                    </button>
                </div>
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
            
            {isReferenceIdeaModalOpen && (
                 <ReferenceIdeaModal
                    isOpen={isReferenceIdeaModalOpen}
                    onClose={() => setIsReferenceIdeaModalOpen(false)}
                    onProceedToVideo={props.onProceedToVideo}
                    allApiKeys={props.allStoryApiKeys}
                    activeApiKey={props.activeApiKey}
                    // FIX: The prop is named `onKeyUpdate`, which matches the modal's prop definition.
                    onKeyUpdate={props.onStoryKeyUpdate}
                    referenceIdeaState={props.referenceIdeaState}
                    setReferenceIdeaState={props.setReferenceIdeaState}
                />
            )}
        </div>
    );
};
