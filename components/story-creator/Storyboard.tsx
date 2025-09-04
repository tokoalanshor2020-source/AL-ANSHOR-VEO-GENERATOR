import React, { useState } from 'react';
import type { Character, DirectingSettings, StoryboardScene } from '../../types';
import { useLocalization } from '../../i18n';
import { CameraReelsIcon } from '../icons/CameraReelsIcon';
import { generateBlueprintPrompt, generateCinematicPrompt } from '../../services/storyCreatorService';

interface StoryboardProps {
    isGenerating: boolean;
    storyboard: StoryboardScene[];
    error: string | null;
    onProceedToVideo: (prompt: string) => void;
    activeApiKey: string | null;
    characters: Character[];
    directingSettings: DirectingSettings;
    onUpdateScene: (sceneIndex: number, updatedPrompts: Partial<Pick<StoryboardScene, 'blueprintPrompt' | 'cinematicPrompt'>>) => void;
}

interface SceneCardProps {
    scene: StoryboardScene;
    index: number;
    onProceedToVideo: (prompt: string) => void;
    activeApiKey: string | null;
    characters: Character[];
    directingSettings: DirectingSettings;
    onUpdateScene: (sceneIndex: number, updatedPrompts: Partial<Pick<StoryboardScene, 'blueprintPrompt' | 'cinematicPrompt'>>) => void;
}

const PromptDisplay: React.FC<{
    title: string;
    content: string;
    onProceedToVideo: (prompt: string) => void;
}> = ({ title, content, onProceedToVideo }) => {
    const { t } = useLocalization();
    const isError = content.toLowerCase().startsWith('error');

    return (
        <div className="bg-base-300/50 p-3 rounded-lg flex flex-col h-full">
            <h5 className="text-md font-bold text-gray-300 mb-2 flex-shrink-0">{title}</h5>
            <div className="relative flex-grow min-h-[120px]">
                <pre className="absolute inset-0 p-2 rounded bg-base-300 text-gray-300 whitespace-pre-wrap break-words font-mono text-xs overflow-auto">
                    {content}
                </pre>
            </div>
            {!isError && (
                <div className="mt-3 flex-shrink-0">
                    <button
                        onClick={() => onProceedToVideo(content)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors"
                    >
                        {t('storyCreator.useThisPrompt')}
                    </button>
                </div>
            )}
        </div>
    );
};

const SceneCard: React.FC<SceneCardProps> = ({ scene, index, onProceedToVideo, activeApiKey, characters, directingSettings, onUpdateScene }) => {
    const { t } = useLocalization();
    const [isGeneratingBlueprint, setIsGeneratingBlueprint] = useState(false);
    const [isGeneratingCinematic, setIsGeneratingCinematic] = useState(false);
    
    // Read prompts from the central state via props
    const blueprint = scene.blueprintPrompt || '';
    const cinematicPrompt = scene.cinematicPrompt || '';

    const handleGenerateBlueprint = async () => {
        if (!activeApiKey) return;
        setIsGeneratingBlueprint(true);
        try {
            const result = await generateBlueprintPrompt(activeApiKey, scene, characters, directingSettings);
            onUpdateScene(index, { blueprintPrompt: result });
        } catch (e) {
            const errorMessage = `Error: ${e instanceof Error ? e.message : 'Unknown error'}`;
            onUpdateScene(index, { blueprintPrompt: errorMessage });
        } finally {
            setIsGeneratingBlueprint(false);
        }
    };

    const handleGenerateCinematic = async () => {
         if (!activeApiKey) return;
        setIsGeneratingCinematic(true);
        try {
            const result = await generateCinematicPrompt(activeApiKey, scene, characters, directingSettings);
            onUpdateScene(index, { cinematicPrompt: result });
        } catch (e) {
            const errorMessage = `Error: ${e instanceof Error ? e.message : 'Unknown error'}`;
            onUpdateScene(index, { cinematicPrompt: errorMessage });
        } finally {
            setIsGeneratingCinematic(false);
        }
    };
    
    return (
        <div className="bg-base-200/50 border border-base-300 p-4 rounded-xl shadow-md">
            <div className="flex items-start gap-4">
                <div className="bg-base-300 text-amber-400 font-bold rounded-lg w-16 h-16 flex flex-col items-center justify-center text-center flex-shrink-0">
                    <span className="text-xs uppercase tracking-wider">{t('storyCreator.scene')}</span>
                    <span className="text-3xl">{scene.scene_number || (index + 1)}</span>
                </div>
                <div className="w-full">
                    <h4 className="text-lg font-bold text-orange-400 mb-2">{scene.scene_title}</h4>
                    <p className="text-gray-300">{scene.scene_summary}</p>
                    
                    <div className="mt-3 pt-3 border-t border-gray-700/50">
                        <h5 className="font-semibold text-amber-400 text-sm">{t('storyCreator.cinematography')}</h5>
                        <p className="text-sm text-gray-400 italic mt-1">{scene.cinematography?.shot_type}, {scene.cinematography?.camera_angle}</p>
                    </div>

                    <div className="mt-3">
                        <h5 className="font-semibold text-amber-400 text-sm">{t('storyCreator.soundEffects')}</h5>
                         {scene.sound_design?.sfx?.length > 0 ? (
                            <ul className="text-sm mt-1 list-disc list-inside text-gray-400">
                                {scene.sound_design.sfx.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                         ) : (
                            <p className="text-sm text-gray-500 mt-1 italic">{t('storyCreator.noSfx')}</p>
                         )}
                    </div>
                     {scene.sound_design?.audio_mixing_guide && (
                        <div className="mt-3">
                            <h5 className="font-semibold text-purple-400 text-sm">{t('storyCreator.mixingGuide')}</h5>
                            <p className="text-sm text-gray-400 italic mt-1">{scene.sound_design.audio_mixing_guide}</p>
                        </div>
                     )}
                </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-700/50">
                 <div className="flex justify-end items-center gap-2">
                    <button onClick={handleGenerateBlueprint} disabled={isGeneratingBlueprint} className="btn-sm bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold py-1 px-3 rounded-lg text-xs">
                        {isGeneratingBlueprint ? '...' : t('storyCreator.generateBlueprint')}
                    </button>
                    <button onClick={handleGenerateCinematic} disabled={isGeneratingCinematic} className="btn-sm bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white font-semibold py-1 px-3 rounded-lg text-xs">
                         {isGeneratingCinematic ? '...' : t('storyCreator.generateCinematicPrompt')}
                    </button>
                 </div>
                {(blueprint || cinematicPrompt) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 items-stretch">
                        {blueprint && (
                            <PromptDisplay
                                title={t('storyCreator.resultBlueprint') as string}
                                content={blueprint}
                                onProceedToVideo={onProceedToVideo}
                            />
                        )}
                        {cinematicPrompt && (
                            <PromptDisplay
                                title={t('storyCreator.resultCinematic') as string}
                                content={cinematicPrompt}
                                onProceedToVideo={onProceedToVideo}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};


export const Storyboard: React.FC<StoryboardProps> = ({ isGenerating, storyboard, error, ...rest }) => {
    const { t } = useLocalization();

    if (isGenerating) {
        return <div className="p-6 text-center text-gray-400">Loading...</div>;
    }
    
    if (error) {
        return <div className="p-6 text-center text-red-400">{error}</div>;
    }

    if (storyboard.length === 0) {
        return (
            <div className="p-6 flex flex-col items-center justify-center h-full text-center text-gray-500 py-20">
                <CameraReelsIcon className="mb-4" />
                <p className="text-xl font-semibold">{t('storyCreator.storyboardPlaceholderTitle')}</p>
                <p>{t('storyCreator.storyboardPlaceholderDescription')}</p>
            </div>
        );
    }
    
    return (
        <div className="p-6 space-y-6">
            {storyboard.map((scene, index) => (
                <SceneCard key={index} scene={scene} index={index} {...rest} />
            ))}
        </div>
    );
};