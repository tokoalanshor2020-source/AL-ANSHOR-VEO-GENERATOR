import React, { useState } from 'react';
import { useLocalization } from '../../i18n';
// FIX: The StoryIdea type was imported from the wrong module. It is defined in `types.ts`.
import type { Character, StoryIdea } from '../../types';
import { generateStoryIdeas } from '../../services/storyCreatorService';
import { XCircleIcon } from '../icons/XCircleIcon';

interface DirectorBridgeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApplyIdea: (idea: StoryIdea) => void;
    characters: Character[];
    activeApiKey: string | null;
}

export const DirectorBridgeModal: React.FC<DirectorBridgeModalProps> = ({ isOpen, onClose, onApplyIdea, characters, activeApiKey }) => {
    const { t } = useLocalization();
    const [step, setStep] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Form state
    const [contentFormat, setContentFormat] = useState('cinematic_adventure');
    const [characterName, setCharacterName] = useState('random');
    const [theme, setTheme] = useState('random');
    const [customTheme, setCustomTheme] = useState('');
    
    // Results state
    const [ideas, setIdeas] = useState<StoryIdea[]>([]);
    const [selectedIdea, setSelectedIdea] = useState<StoryIdea | null>(null);

    const handleGenerateIdeas = async () => {
        if (!activeApiKey) return;
        setIsGenerating(true);
        setIdeas([]);
        setSelectedIdea(null);
        try {
            const generatedIdeas = await generateStoryIdeas(activeApiKey, {
                contentFormat,
                characterName,
                theme: theme === 'custom_theme' ? customTheme : theme,
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

    const handleApply = () => {
        if (selectedIdea) {
            onApplyIdea(selectedIdea);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-base-200 rounded-2xl shadow-2xl w-full max-w-2xl border border-base-300 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-base-300">
                    <h2 className="text-2xl font-bold text-amber-400 text-center flex-grow">
                        {step === 1 ? t('smartDirector.title') : t('smartDirector.step2Title')}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <XCircleIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* Step 1: Form */}
                {step === 1 && (
                    <div className="p-6 space-y-4 overflow-y-auto">
                        <p className="text-center text-gray-400 mb-6">{t('smartDirector.step1Description')}</p>
                        
                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-1">{t('smartDirector.step1Label')}</label>
                            <select value={contentFormat} onChange={e => setContentFormat(e.target.value)} className="w-full bg-base-300 border border-gray-600 rounded-lg p-3 text-sm">
                                <option value="cinematic_adventure">{t('smartDirector.contentFormats.cinematic_adventure')}</option>
                                <option value="product_review">{t('smartDirector.contentFormats.product_review')}</option>
                                <option value="unboxing">{t('smartDirector.contentFormats.unboxing')}</option>
                                <option value="vs_challenge">{t('smartDirector.contentFormats.vs_challenge')}</option>
                            </select>
                        </div>
                        
                        <div>
                             <label className="block text-sm font-semibold text-gray-300 mb-1">{t('smartDirector.step2Label')}</label>
                            <select value={characterName} onChange={e => setCharacterName(e.target.value)} className="w-full bg-base-300 border border-gray-600 rounded-lg p-3 text-sm">
                                <option value="random">{t('smartDirector.characterOptions.random')}</option>
                                {characters.length > 0 && (
                                    <optgroup label={t('smartDirector.characterOptions.yourGarage') as string}>
                                        {characters.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </optgroup>
                                )}
                                <optgroup label={t('smartDirector.characterOptions.construction') as string}>
                                    <option value="Beni si Buldoser Pemberani">{t('smartDirector.characterOptions.beniBulldozer')}</option>
                                </optgroup>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-1">{t('smartDirector.step3Label')}</label>
                            <select value={theme} onChange={e => setTheme(e.target.value)} className="w-full bg-base-300 border border-gray-600 rounded-lg p-3 text-sm">
                                <option value="random">{t('smartDirector.themeOptions.random')}</option>
                                 <optgroup label={t('smartDirector.themeOptions.adventureGroup') as string}>
                                    <option value="explore_new_area">{t('smartDirector.themeOptions.explore_new_area')}</option>
                                    <option value="rescue_mission">{t('smartDirector.themeOptions.rescue_mission')}</option>
                                </optgroup>
                                 <optgroup label={t('smartDirector.themeOptions.challengeGroup') as string}>
                                     <option value="overcome_obstacle">{t('smartDirector.themeOptions.overcome_obstacle')}</option>
                                 </optgroup>
                                 <option value="custom_theme">{t('smartDirector.themeOptions.custom_theme')}</option>
                            </select>
                             {theme === 'custom_theme' && (
                                <input type="text" value={customTheme} onChange={e => setCustomTheme(e.target.value)} placeholder={t('smartDirector.customThemePlaceholder') as string} className="w-full bg-base-300 border border-gray-600 rounded-lg p-3 text-sm mt-2" />
                            )}
                        </div>
                    </div>
                )}
                
                {/* Step 2: Results */}
                {step === 2 && (
                    <div className="p-6 space-y-3 overflow-y-auto">
                        {ideas.map((idea, index) => (
                            <div 
                                key={index} 
                                onClick={() => setSelectedIdea(idea)}
                                className={`p-4 rounded-lg cursor-pointer border transition-all ${selectedIdea === idea ? 'bg-brand-primary/20 border-brand-primary' : 'bg-base-300 border-gray-600 hover:border-gray-500'}`}
                            >
                                <h4 className="font-bold text-amber-400">Ide {index + 1}: {idea.title_suggestion}</h4>
                                <p className="text-gray-300 whitespace-pre-wrap text-sm">{idea.script_outline}</p>
                            </div>
                        ))}
                    </div>
                )}
                
                <div className="flex-shrink-0 p-4 mt-auto border-t border-base-300 flex justify-between items-center">
                    {step === 1 && <button onClick={onClose} className="px-6 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-200 bg-base-300 hover:bg-gray-700">{t('smartDirector.cancelButton')}</button>}
                    {step === 2 && <button onClick={handleTryAgain} className="px-6 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-200 bg-base-300 hover:bg-gray-700">{t('smartDirector.tryAgainButton')}</button>}
                    
                    {step === 1 && <button onClick={handleGenerateIdeas} disabled={isGenerating} className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50">{isGenerating ? t('smartDirector.generatingIdeasButton') : t('smartDirector.generateIdeasButton')}</button>}
                    {step === 2 && <button onClick={handleApply} disabled={!selectedIdea} className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50">{t('smartDirector.applyIdeaButton')}</button>}
                </div>
            </div>
        </div>
    );
};