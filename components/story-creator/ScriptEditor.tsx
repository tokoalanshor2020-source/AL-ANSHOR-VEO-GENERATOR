import React, { useState } from 'react';
import { useLocalization } from '../../i18n';
import { MagicWandIcon } from '../icons/MagicWandIcon';
import { DirectorBridgeModal } from './DirectorBridgeModal';
import { DirectingDesk } from './DirectingDesk';
import type { Character, StoryIdea, DirectingSettings } from '../../types';


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
    onGenerateStoryboard: () => void;
    characters: Character[];
    activeApiKey: string | null;
    directingSettings: DirectingSettings;
    setDirectingSettings: React.Dispatch<React.SetStateAction<DirectingSettings>>;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = (props) => {
    const { t } = useLocalization();
    const canGenerate = props.logline.trim() !== '' && props.scenario.trim() !== '';
    const [isDirectorBridgeOpen, setIsDirectorBridgeOpen] = useState(false);

    const handleApplyIdea = (idea: StoryIdea) => {
        props.setLogline(idea.title_suggestion);
        props.setScenario(idea.script_outline);
        setIsDirectorBridgeOpen(false);
    };

    return (
        <div className="p-6 space-y-6">
            <div className="text-center p-4 bg-base-300/50 rounded-lg border-2 border-dashed border-base-300">
                <h3 className="text-lg font-bold text-amber-400">{t('storyCreator.needIdea')}</h3>
                <p className="text-gray-400 text-sm mb-4">{t('storyCreator.ideaDescription')}</p>
                <button 
                    onClick={() => setIsDirectorBridgeOpen(true)}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
                    disabled={!props.activeApiKey}
                >
                    <MagicWandIcon />
                    {t('storyCreator.openSmartDirector')}
                </button>
            </div>
            
            <div>
                <label htmlFor="logline" className="block mb-2 font-semibold text-gray-300">{t('storyCreator.storyTitle')}</label>
                <input
                    type="text"
                    id="logline"
                    value={props.logline}
                    onChange={e => props.setLogline(e.target.value)}
                    placeholder={t('storyCreator.storyTitlePlaceholder') as string}
                    className="w-full bg-base-300 border border-gray-600 rounded-lg p-3 text-gray-200"
                />
            </div>

            <div>
                <label htmlFor="scenario" className="block mb-2 font-semibold text-gray-300">{t('storyCreator.storyScript')}</label>
                <textarea
                    id="scenario"
                    rows={8}
                    value={props.scenario}
                    onChange={e => props.setScenario(e.target.value)}
                    placeholder={t('storyCreator.storyScriptPlaceholder') as string}
                    className="w-full bg-base-300 border border-gray-600 rounded-lg p-3 text-gray-200"
                ></textarea>
            </div>
            
            <DirectingDesk settings={props.directingSettings} setSettings={props.setDirectingSettings} />
            
             <div>
                <label htmlFor="sceneCount" className="block mb-2 text-sm font-semibold text-gray-300">{t('storyCreator.sceneCount')}</label>
                <input
                    type="number"
                    id="sceneCount"
                    min="1"
                    max="10"
                    value={props.sceneCount}
                    onChange={e => props.setSceneCount(Number(e.target.value))}
                    className="w-full bg-base-300 border border-gray-600 rounded-lg p-2 text-sm text-gray-200"
                />
            </div>

            <div className="border-t border-base-300 pt-6 text-center">
                <button
                    onClick={props.onGenerateStoryboard}
                    disabled={!canGenerate || props.isGenerating}
                    className="w-full font-bold py-4 px-10 text-xl rounded-xl shadow-lg bg-brand-primary hover:bg-brand-dark disabled:bg-base-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                >
                    {props.isGenerating ? t('generatingButton') : t('storyCreator.createStoryboard')}
                </button>
            </div>

            {isDirectorBridgeOpen && (
                <DirectorBridgeModal
                    isOpen={isDirectorBridgeOpen}
                    onClose={() => setIsDirectorBridgeOpen(false)}
                    onApplyIdea={handleApplyIdea}
                    characters={props.characters}
                    allApiKeys={props.allStoryApiKeys}
                    activeApiKey={props.activeApiKey}
                    onKeyUpdate={props.onStoryKeyUpdate}
                />
            )}
        </div>
    );
};