import React, { useState, useEffect, useCallback } from 'react';
import { useLocalization, languageMap } from '../../i18n';
import type { Character, StoryIdea, ThemeSuggestion, DirectingSettings } from '../../types';
import { generateStoryIdeas, generateThemeIdeas } from '../../services/storyCreatorService';
import { FailoverParams } from '../../services/geminiService';
import { DirectingDesk } from './DirectingDesk';

interface DirectorBridgeModalProps extends FailoverParams {
    isOpen: boolean;
    onClose: () => void;
    characters: Character[];
    // Editor State and Functions
    logline: string;
    setLogline: (value: string) => void;
    scenario: string;
    setScenario: (value: string) => void;
    sceneCount: number;
    setSceneCount: (value: number) => void;
    directingSettings: DirectingSettings;
    setDirectingSettings: React.Dispatch<React.SetStateAction<DirectingSettings>>;
    isGenerating: boolean;
    onGenerateStoryboard: () => Promise<void>;
}

export const DirectorBridgeModal: React.FC<DirectorBridgeModalProps> = (props) => {
    const { t, language } = useLocalization();
    const [step, setStep] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Form state
    const [contentFormat, setContentFormat] = useState('cinematic_adventure');
    const [customContentFormat, setCustomContentFormat] = useState('');
    const [selectedCharacterNames, setSelectedCharacterNames] = useState<string[]>(['random']);
    const [theme, setTheme] = useState('');
    const [customTheme, setCustomTheme] = useState('');

    // AI-generated themes state
    const [aiThemes, setAiThemes] = useState<ThemeSuggestion[]>([]);
    const [isGeneratingThemes, setIsGeneratingThemes] = useState(false);
    
    // Results state
    const [ideas, setIdeas] = useState<StoryIdea[]>([]);
    const [selectedIdea, setSelectedIdea] = useState<StoryIdea | null>(null);
    
    const canGenerateStoryboard = props.logline.trim() !== '' && props.scenario.trim() !== '';

    const getFailoverParams = (): FailoverParams => ({
        // FIX: Use `props.allKeys` instead of `props.allApiKeys`.
        allKeys: props.allKeys,
        // FIX: Use `props.activeKey` instead of `props.activeApiKey`.
        activeKey: props.activeKey,
        onKeyUpdate: props.onKeyUpdate,
    });

    const fetchThemeIdeas = useCallback(async (format: string, chars: string[]) => {
        // FIX: Use `props.activeKey` instead of `props.activeApiKey`.
        if (!props.activeKey || format === '' || chars.length === 0) return;
        setIsGeneratingThemes(true);
        setAiThemes([]);
        setTheme('');
        try {
            const themes = await generateThemeIdeas(getFailoverParams(), {
                contentFormat: format,
                characterNames: chars,
                language: languageMap[language]
            });
            setAiThemes(themes);
        } catch(e) {
            console.error("Failed to fetch theme ideas:", e);
            alert(e instanceof Error ? e.message : 'Failed to get AI theme suggestions');
        } finally {
            setIsGeneratingThemes(false);
        }
    // FIX: Use `props.activeKey` and `props.allKeys` in the dependency array.
    }, [props.activeKey, props.onKeyUpdate, props.allKeys, language]);


    useEffect(() => {
        const finalFormat = contentFormat === 'custom_format' ? customContentFormat : contentFormat;
        const finalCharacters = selectedCharacterNames;
        
        if (finalFormat.trim() && finalCharacters.length > 0 && !finalCharacters.includes('random')) {
            const handler = setTimeout(() => {
                fetchThemeIdeas(finalFormat, finalCharacters);
            }, 500);
            return () => clearTimeout(handler);
        } else {
            setAiThemes([]);
            setTheme('');
        }
    }, [contentFormat, customContentFormat, selectedCharacterNames, fetchThemeIdeas]);


     const handleCharacterSelectionChange = (characterIdentifier: string, isChecked: boolean) => {
        if (characterIdentifier === 'random') {
            setSelectedCharacterNames(isChecked ? ['random'] : []);
        } else {
            setSelectedCharacterNames(prev => {
                const withoutRandom = prev.filter(name => name !== 'random');
                if (isChecked) {
                    return [...withoutRandom, characterIdentifier];
                } else {
                    const newSelection = withoutRandom.filter(name => name !== characterIdentifier);
                    return newSelection.length === 0 ? ['random'] : newSelection;
                }
            });
        }
    };

    const handleGenerateIdeas = async () => {
        // FIX: Use `props.activeKey` instead of `props.activeApiKey`.
        if (!props.activeKey) return;
        setIsGenerating(true);
        setIdeas([]);
        setSelectedIdea(null);
        try {
            const finalFormat = contentFormat === 'custom_format' ? customContentFormat : contentFormat;
            const finalTheme = theme === 'custom_theme' ? customTheme : theme;

            const generatedIdeas = await generateStoryIdeas(getFailoverParams(), {
                contentFormat: finalFormat,
                characterNames: selectedCharacterNames,
                theme: finalTheme || 'random',
                language: languageMap[language],
            });
            setIdeas(generatedIdeas);
            setStep(2);
        } catch (e) {
            alert(e instanceof Error ? e.message : 'Failed to generate ideas');
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleTryAgain = () => {
        setIdeas([]);
        setSelectedIdea(null);
        setStep(1);
    };

    const handleSelectIdea = () => {
        if (selectedIdea) {
            props.setLogline(selectedIdea.title_suggestion);
            props.setScenario(selectedIdea.script_outline);
            setStep(3);
        }
    };
    
    const handleCreateStoryboard = async () => {
        await props.onGenerateStoryboard();
        props.onClose(); // Close the modal after generation is complete
    };

    if (!props.isOpen) return null;
    
    const contentFormatOptions = t('smartDirector.contentFormats') as { [key: string]: string };

    return (
        <div className="fixed inset-0 bg-base-100 z-50 flex flex-col font-sans" role="dialog" aria-modal="true">
            <main className="flex-grow overflow-y-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
                <div className="mx-auto max-w-5xl">
                {step === 1 && (
                    <div className="space-y-4 max-w-2xl mx-auto">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-amber-400">{t('smartDirector.title') as string}</h2>
                            <p className="text-gray-400 mt-2 mb-6">{t('smartDirector.step1Description') as string}</p>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-1">{t('smartDirector.step1Label') as string}</label>
                            <select value={contentFormat} onChange={e => setContentFormat(e.target.value)} className="w-full bg-base-300 border border-gray-600 rounded-lg p-3 text-sm text-gray-200">
                                {Object.entries(contentFormatOptions).map(([key, value]) => (
                                    <option key={key} value={key}>{value}</option>
                                ))}
                            </select>
                             {contentFormat === 'custom_format' && (
                                <input type="text" value={customContentFormat} onChange={e => setCustomContentFormat(e.target.value)} placeholder={t('smartDirector.customFormatPlaceholder') as string} className="w-full bg-base-300 border border-gray-600 rounded-lg p-3 text-sm mt-2 text-gray-200" />
                            )}
                        </div>
                        
                        <div>
                             <label className="block text-sm font-semibold text-gray-300 mb-1">{t('smartDirector.step2Label') as string}</label>
                            <div className="w-full bg-base-300 border border-gray-600 rounded-lg p-3 text-sm max-h-48 overflow-y-auto space-y-2">
                                <div className="flex items-center">
                                    <input 
                                        type="checkbox"
                                        id="char-random"
                                        checked={selectedCharacterNames.includes('random')}
                                        onChange={(e) => handleCharacterSelectionChange('random', e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-500 bg-base-100 text-brand-primary focus:ring-brand-secondary"
                                    />
                                    <label htmlFor="char-random" className="ml-3 text-gray-300">{t('smartDirector.characterOptions.random') as string}</label>
                                </div>
                                
                                {props.characters.length > 0 && (
                                    <div>
                                        <p className="font-semibold text-gray-400 mt-2 mb-1">{t('smartDirector.characterOptions.yourGarage') as string}</p>
                                        {props.characters.map(c => (
                                            <div key={c.id} className="flex items-center pl-2">
                                                <input
                                                    type="checkbox"
                                                    id={`char-${c.id}`}
                                                    checked={selectedCharacterNames.includes(c.name)}
                                                    onChange={(e) => handleCharacterSelectionChange(c.name, e.target.checked)}
                                                    className="h-4 w-4 rounded border-gray-500 bg-base-100 text-brand-primary focus:ring-brand-secondary"
                                                />
                                                <label htmlFor={`char-${c.id}`} className="ml-3 text-gray-300">{c.name}</label>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-1">{t('smartDirector.step3Label') as string}</label>
                            <select value={theme} onChange={e => setTheme(e.target.value)} disabled={isGeneratingThemes || aiThemes.length === 0} className="w-full bg-base-300 border border-gray-600 rounded-lg p-3 text-sm text-gray-200 disabled:opacity-50">
                                {isGeneratingThemes && <option value="">{t('smartDirector.themeOptions.placeholder_loading') as string}</option>}
                                {!isGeneratingThemes && aiThemes.length === 0 && <option value="">{t('smartDirector.themeOptions.placeholder_select') as string}</option>}
                                
                                {aiThemes.map((group, index) => (
                                    <optgroup key={index} label={group.category_name}>
                                        {group.themes.map((themeIdea, themeIndex) => (
                                            <option key={themeIndex} value={themeIdea}>{themeIdea}</option>
                                        ))}
                                    </optgroup>
                                ))}
                                 <option value="custom_theme">{t('smartDirector.themeOptions.custom_theme') as string}</option>
                            </select>
                             {theme === 'custom_theme' && (
                                <input type="text" value={customTheme} onChange={e => setCustomTheme(e.target.value)} placeholder={t('smartDirector.customThemePlaceholder') as string} className="w-full bg-base-300 border border-gray-600 rounded-lg p-3 text-sm mt-2 text-gray-200" />
                            )}
                        </div>
                    </div>
                )}
                
                {step === 2 && (
                    <div className="space-y-3 max-w-2xl mx-auto">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-amber-400">{t('smartDirector.step2Title') as string}</h2>
                        </div>
                        {ideas.map((idea, index) => (
                            <div 
                                key={index} 
                                onClick={() => setSelectedIdea(idea)}
                                className={`p-4 rounded-lg cursor-pointer border-2 transition-all ${selectedIdea === idea ? 'bg-brand-primary/20 border-brand-primary' : 'bg-base-200 border-base-300 hover:border-gray-500'}`}
                            >
                                <h4 className="font-bold text-amber-400">Ide {index + 1}: {idea.title_suggestion}</h4>
                                <p className="text-gray-300 whitespace-pre-wrap text-sm">{idea.script_outline}</p>
                            </div>
                        ))}
                    </div>
                )}

                {step === 3 && (
                     <div className="space-y-6 max-w-3xl mx-auto">
                         <div className="text-center">
                            <h2 className="text-2xl font-bold text-amber-400">{t('smartDirector.step3Title') as string}</h2>
                        </div>
                        <div>
                            <label htmlFor="logline" className="block mb-2 font-semibold text-gray-300">{t('storyCreator.storyTitle') as string}</label>
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
                            <label htmlFor="scenario" className="block mb-2 font-semibold text-gray-300">{t('storyCreator.storyScript') as string}</label>
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
                            <label htmlFor="sceneCount" className="block mb-2 text-sm font-semibold text-gray-300">{t('storyCreator.sceneCount') as string}</label>
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
                                onClick={handleCreateStoryboard}
                                disabled={!canGenerateStoryboard || props.isGenerating}
                                className="w-full font-bold py-4 px-10 text-xl rounded-xl shadow-lg bg-brand-primary hover:bg-brand-dark disabled:bg-base-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                            >
                                {(props.isGenerating ? t('generatingButton') : t('storyCreator.createStoryboard')) as string}
                            </button>
                        </div>
                     </div>
                )}
                </div>
            </main>

            <footer className="flex-shrink-0 bg-base-200/80 backdrop-blur-sm border-t border-base-300 w-full sticky bottom-0 z-10">
                 <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 flex items-center h-20" role="toolbar">
                    <div className="flex justify-end items-center w-full gap-4">
                        <button onClick={props.onClose} className="px-6 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-200 bg-base-300 hover:bg-gray-700">
                            {t('smartDirector.cancelButton') as string}
                        </button>
                        
                        {step === 1 && (
                            <button onClick={handleGenerateIdeas} disabled={isGenerating || !props.activeKey} className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50">
                                {(isGenerating ? t('smartDirector.generatingIdeasButton') : t('smartDirector.generateIdeasButton')) as string}
                            </button>
                        )}
                        {step === 2 && (
                            <>
                                <button onClick={handleTryAgain} className="px-6 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-200 bg-base-300 hover:bg-gray-700">
                                    {t('smartDirector.tryAgainButton') as string}
                                </button>
                                <button onClick={handleSelectIdea} disabled={!selectedIdea} className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50">
                                    {t('smartDirector.applyIdeaButton') as string}
                                </button>
                            </>
                        )}
                    </div>
                 </div>
            </footer>
        </div>
    );
};
