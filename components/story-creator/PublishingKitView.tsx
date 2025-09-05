import React, { useState, useCallback, useEffect } from 'react';
import type { PublishingKitData, Character, StoryboardScene } from '../../types';
import { useLocalization, Language, languageMap } from '../../i18n';
import { generateLocalizedPublishingAssets, generateThumbnail, createImageWithOverlay } from '../../services/storyCreatorService';
import { FailoverParams } from '../../services/geminiService';

interface PublishingKitViewProps extends FailoverParams {
    kitData: PublishingKitData;
    characters: Character[];
    storyboard: StoryboardScene[];
    logline: string;
}

const CopyButton: React.FC<{ textToCopy: string | string[] }> = ({ textToCopy }) => {
    const [copied, setCopied] = useState(false);
    const text = Array.isArray(textToCopy) ? textToCopy.join(', ') : textToCopy;
    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return <button onClick={handleCopy} className="text-xs font-semibold py-1 px-3 rounded-lg bg-base-300 hover:bg-gray-700">{copied ? 'Copied!' : 'Copy'}</button>;
};

interface LocalizedAsset {
    title: string;
    description: string;
    tags: string[];
    ctaTexts: string[];
}

const AspectRatioSelector: React.FC<{ selected: string; onChange: (value: string) => void }> = ({ selected, onChange }) => {
    const supportedRatios = ['16:9', '1:1', '4:3', '3:4', '9:16'];
    return (
        <div className="flex items-center gap-2">
            <label htmlFor="aspect-ratio" className="text-xs font-semibold text-gray-400">Aspect Ratio:</label>
            <select
                id="aspect-ratio"
                value={selected}
                onChange={e => onChange(e.target.value)}
                className="bg-base-100/50 border border-gray-600 rounded-md p-1 text-xs text-gray-200 focus:ring-brand-primary focus:border-brand-primary"
            >
                {supportedRatios.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
        </div>
    );
};

export const PublishingKitView: React.FC<PublishingKitViewProps> = ({ kitData, activeKey, allKeys, onKeyUpdate, characters, storyboard, logline }) => {
    const { language, t } = useLocalization();
    
    const [assets, setAssets] = useState<{ [key: string]: LocalizedAsset }>({});
    const [selectedLang, setSelectedLang] = useState<Language>(language);
    const [debouncedLang, setDebouncedLang] = useState<Language>(language);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isGeneratingThumb, setIsGeneratingThumb] = useState<boolean>(false);
    const [thumbImageUrl, setThumbImageUrl] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState<string>('16:9');

    const failoverParams: FailoverParams = { allKeys, activeKey, onKeyUpdate };

    useEffect(() => {
        const initialAssets: { [key: string]: LocalizedAsset } = {
            id: {
                title: kitData.youtube_title_id,
                description: kitData.youtube_description_id,
                tags: kitData.youtube_tags_id,
                ctaTexts: kitData.thumbnail_concepts.map(c => c.cta_overlay_text_id),
            },
            en: {
                title: kitData.youtube_title_en,
                description: kitData.youtube_description_en,
                tags: kitData.youtube_tags_en,
                ctaTexts: kitData.thumbnail_concepts.map(c => c.cta_overlay_text_en),
            }
        };
        setAssets(initialAssets);
        setSelectedLang(language);
        setDebouncedLang(language);
        
        setError(null);
        setThumbImageUrl(null);
        setAspectRatio('16:9');
        setIsGeneratingThumb(false);
    }, [kitData, language]);
    
     useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedLang(selectedLang);
        }, 1000);

        return () => {
            clearTimeout(handler);
        };
    }, [selectedLang]);

    const generateLocalizedAssets = useCallback(async (langToGen: Language) => {
        if (!assets[langToGen] && activeKey) {
            setIsGenerating(true);
            setError(null);
            try {
                const result = await generateLocalizedPublishingAssets(
                    failoverParams,
                    { storyboard, characters, logline },
                    languageMap[langToGen]
                );
                setAssets(prev => ({ ...prev, [langToGen]: result }));
            } catch (err) {
                 const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                 const displayError = errorMessage === 'errorRateLimit' ? t('errorRateLimit') : errorMessage;
                 setError(displayError as string);
            } finally {
                setIsGenerating(false);
            }
        }
    }, [activeKey, assets, characters, logline, storyboard, t, failoverParams]);

    useEffect(() => {
        if (debouncedLang !== language || !assets[debouncedLang]) {
             generateLocalizedAssets(debouncedLang);
        }
    }, [debouncedLang, assets, generateLocalizedAssets, language]);


    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newLang = e.target.value as Language;
        setSelectedLang(newLang);
    };

    const handleAssetChange = <T extends keyof LocalizedAsset>(field: T, value: LocalizedAsset[T]) => {
        setAssets(prev => ({
            ...prev,
            [selectedLang]: {
                ...prev[selectedLang],
                [field]: value,
            }
        }));
    };
    
    const removeTag = (tagToRemove: string) => {
        const currentTags = assets[selectedLang]?.tags || [];
        handleAssetChange('tags', currentTags.filter(tag => tag !== tagToRemove));
    };

    const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const newTag = e.currentTarget.value.trim();
        const currentTags = assets[selectedLang]?.tags || [];
        if (e.key === 'Enter' && newTag) {
            e.preventDefault();
            if (!currentTags.includes(newTag)) {
                handleAssetChange('tags', [...currentTags, newTag]);
            }
            e.currentTarget.value = '';
        }
    };
    
     const handleGenerateThumbnail = async (prompt: string) => {
        if (!activeKey) return;
        
        const ctaText = assets[selectedLang]?.ctaTexts[0] || "WATCH NOW";
        setIsGeneratingThumb(true);
        setError(null);
        
        try {
            const imageData = await generateThumbnail(failoverParams, prompt, aspectRatio);
            const finalImage = await createImageWithOverlay(imageData, ctaText);
            setThumbImageUrl(finalImage);
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Unknown error';
            const displayError = errorMessage === 'errorRateLimit' ? t('errorRateLimit') : errorMessage;
            setError(displayError as string);
        } finally {
            setIsGeneratingThumb(false);
        }
    };

    const currentAsset = assets[selectedLang];
    const concept = kitData.thumbnail_concepts && kitData.thumbnail_concepts[0];
    
    return (
        <div className="p-6 space-y-8">
            <div className="bg-base-300/50 p-4 rounded-lg border border-base-300">
                 <label htmlFor="lang-selector" className="block text-sm font-semibold text-gray-300 mb-1">Target Language & Region</label>
                 <select id="lang-selector" value={selectedLang} onChange={handleLanguageChange} className="w-full bg-base-100/50 border border-gray-600 rounded-md p-2 text-md text-amber-400 font-bold focus:ring-brand-primary focus:border-brand-primary">
                    {Object.entries(languageMap).map(([code, name]) => (
                        <option key={code} value={code}>{name}</option>
                    ))}
                </select>
            </div>
            
            {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-200 p-3 rounded-lg text-sm text-center">
                    {error}
                </div>
            )}
             
             {isGenerating ? (
                 <div className="text-center py-10 text-gray-400">Generating assets for {languageMap[selectedLang]}...</div>
             ) : currentAsset ? (
                <>
                    <div>
                        <div className="flex justify-between items-center mb-2">
                           <h3 className="text-2xl font-bold text-cyan-300">YouTube Title</h3>
                           <CopyButton textToCopy={currentAsset.title} />
                        </div>
                        <input type="text" value={currentAsset.title} onChange={e => handleAssetChange('title', e.target.value)} className="w-full bg-base-300 border-gray-600 rounded-lg p-3 text-lg text-gray-200" />
                    </div>
                    
                    <div className="border-t border-base-300"></div>

                    <div>
                         <div className="flex justify-between items-center mb-2">
                           <h3 className="text-2xl font-bold text-cyan-300">YouTube Description</h3>
                           <CopyButton textToCopy={currentAsset.description} />
                        </div>
                        <textarea value={currentAsset.description} onChange={e => handleAssetChange('description', e.target.value)} rows={10} className="w-full bg-base-300 border-gray-600 rounded-lg p-3 text-sm text-gray-200 whitespace-pre-wrap"></textarea>
                    </div>

                    <div className="border-t border-base-300"></div>
                    
                    <div>
                        <div className="flex justify-between items-center mb-2">
                           <h3 className="text-2xl font-bold text-cyan-300">YouTube Tags</h3>
                           <CopyButton textToCopy={currentAsset.tags} />
                        </div>
                        <div className="flex flex-wrap gap-2 p-3 bg-base-300 rounded-lg border border-gray-600">
                            {currentAsset.tags.map(tag => (
                                <span key={tag} className="bg-base-200 text-cyan-200 text-sm font-medium px-3 py-1 rounded-full flex items-center gap-2">
                                    {tag}
                                    <button onClick={() => removeTag(tag)} className="font-bold text-md leading-none hover:text-white">&times;</button>
                                </span>
                            ))}
                            <input type="text" onKeyDown={addTag} placeholder="+ Add tag & press Enter" className="flex-grow bg-transparent focus:outline-none p-1 text-sm text-gray-200 placeholder-gray-500" />
                        </div>
                    </div>
                 </>
             ) : null}


            <div className="border-t border-base-300"></div>

            <div>
                <h3 className="text-2xl font-bold text-cyan-300 mb-2">Thumbnail Idea</h3>
                {concept && (
                     <div className="flex justify-center">
                        <div className="w-full max-w-lg bg-base-300/50 p-4 rounded-lg border border-base-300 flex flex-col">
                            <h4 className="font-bold text-amber-400 flex-shrink-0">
                                {currentAsset?.ctaTexts ? concept.concept_title_id : concept.concept_title_en}
                            </h4>
                            <p className="text-sm text-gray-400 mt-1 mb-3 flex-shrink-0">
                                {language === 'id' ? concept.concept_description_id : concept.concept_description_en}
                            </p>
                            <div className="aspect-video bg-base-300 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-600 flex-shrink-0">
                                {thumbImageUrl ? <img src={thumbImageUrl} alt="Generated thumbnail" className="w-full h-full object-cover rounded-lg"/> : isGeneratingThumb ? 'Generating...' : '...'}
                            </div>
                            
                            <div className="mt-3 flex-grow flex flex-col">
                                <pre className="flex-grow p-2 text-xs bg-base-300 rounded whitespace-pre-wrap font-mono overflow-auto">{concept.image_prompt}</pre>
                                <div className="mt-2">
                                    <CopyButton textToCopy={concept.image_prompt} />
                                </div>
                            </div>
                            
                            <div className="mt-auto pt-3 space-y-2">
                                <div className="flex justify-between items-center mb-2">
                                    <AspectRatioSelector 
                                        selected={aspectRatio}
                                        onChange={setAspectRatio}
                                    />
                                </div>
                                <button disabled={isGeneratingThumb || isGenerating} onClick={() => handleGenerateThumbnail(concept.image_prompt)} className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg disabled:opacity-50 flex-shrink-0">
                                    {isGeneratingThumb ? "Generating..." : "Generate Thumbnail"}
                                </button>
                                {thumbImageUrl && <a href={thumbImageUrl} download={`thumbnail.png`} className="block text-center w-full bg-brand-primary hover:bg-brand-dark text-white font-semibold py-2 rounded-lg flex-shrink-0">Download</a>}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};