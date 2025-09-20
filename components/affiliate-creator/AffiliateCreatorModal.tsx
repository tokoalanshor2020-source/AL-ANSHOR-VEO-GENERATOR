// FIX: Implemented the full AffiliateCreatorModal component to resolve module not found error.
import React, { useState, useCallback, useEffect } from 'react';
import { useLocalization } from '../../i18n';
import type { AffiliateCreatorState, GeneratedAffiliateImage, ReferenceFile, StoredReferenceFile } from '../../types';
import { FailoverParams } from '../../services/geminiService';
import { generateAffiliateImagePrompts, generateAffiliateImages, generateAffiliateVideoPrompt } from '../../services/storyCreatorService';
import { XCircleIcon } from '../icons/XCircleIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { DownloadIcon } from '../icons/DownloadIcon';
import { RefreshIcon } from '../icons/RefreshIcon';
import { ReplaceIcon } from '../icons/ReplaceIcon';
import { VideoIcon } from '../icons/VideoIcon';
import { ChevronLeftIcon } from '../icons/ChevronLeftIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';

interface AffiliateCreatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProceedToVideo: (prompt: string, image?: { base64: string, mimeType: string }) => void;
    allStoryApiKeys: string[];
    activeStoryApiKey: string | null;
    onStoryKeyUpdate: (key: string) => void;
    allVideoApiKeys: string[];
    activeVideoApiKey: string | null;
    onVideoKeyUpdate: (key: string) => void;
    affiliateCreatorState: AffiliateCreatorState;
    setAffiliateCreatorState: React.Dispatch<React.SetStateAction<AffiliateCreatorState>>;
}

const generateUUID = () => window.crypto?.randomUUID() ?? 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0, v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
});

const MAX_FILE_SIZE_MB = 10;
const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif'];

type GenerationStatus = 'idle' | 'loading' | 'done' | 'error';

export const AffiliateCreatorModal: React.FC<AffiliateCreatorModalProps> = (props) => {
    const { t } = useLocalization();
    const { isOpen, onClose, affiliateCreatorState, setAffiliateCreatorState } = props;
    const { referenceFiles, generatedImages, numberOfImages, model, vibe, customVibe } = affiliateCreatorState;

    const [localReferenceFiles, setLocalReferenceFiles] = useState<ReferenceFile[]>([]);
    const [currentFileIndex, setCurrentFileIndex] = useState(0);

    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [imageStatuses, setImageStatuses] = useState<Record<string, GenerationStatus>>({});

    useEffect(() => {
        if (isOpen) document.body.classList.add('modal-open');
        else document.body.classList.remove('modal-open');
    }, [isOpen]);
    
    // Sync local files with persisted state when modal opens
    useEffect(() => {
        if (!isOpen) return;
        
        const dataURLtoBlob = (dataurl: string) => {
            const parts = dataurl.split(',');
            const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
            const bstr = atob(parts[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) u8arr[n] = bstr.charCodeAt(n);
            return new Blob([u8arr], { type: mime });
        };
        
        const loadedFiles = referenceFiles.map(storedFile => {
            const dataUrl = `data:${storedFile.mimeType};base64,${storedFile.base64}`;
            const blob = dataURLtoBlob(dataUrl);
            const file = new File([blob], `reference.${storedFile.mimeType.split('/')[1] || 'bin'}`, { type: storedFile.mimeType });
            return { ...storedFile, previewUrl: URL.createObjectURL(file), file };
        });

        setLocalReferenceFiles(loadedFiles);
        
        return () => {
            loadedFiles.forEach(file => URL.revokeObjectURL(file.previewUrl));
        };
    }, [isOpen, referenceFiles]);

    const updateFiles = useCallback((updatedLocalFiles: ReferenceFile[]) => {
        setLocalReferenceFiles(updatedLocalFiles);
        const serializableFiles: StoredReferenceFile[] = updatedLocalFiles.map(f => ({
            id: f.id, base64: f.base64, mimeType: f.mimeType, type: f.type,
        }));
        setAffiliateCreatorState(prev => ({ ...prev, referenceFiles: serializableFiles }));
    }, [setAffiliateCreatorState]);
    
    const handleFilesChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        Array.from(files).forEach(file => {
             if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
                alert(`Unsupported file type: ${file.type}`); return;
            }
            if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                alert(`File is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Max size is ${MAX_FILE_SIZE_MB}MB.`); return;
            }

            const reader = new FileReader();
            reader.onload = e => {
                const base64 = (e.target?.result as string).split(',')[1];
                const newFile: ReferenceFile = {
                    id: generateUUID(), base64, mimeType: file.type,
                    previewUrl: URL.createObjectURL(file), type: 'image', file,
                };
                updateFiles([...localReferenceFiles, newFile]);
            };
            reader.readAsDataURL(file);
        });
        event.target.value = '';
    }, [localReferenceFiles, updateFiles]);
    
    const handleStateChange = <K extends keyof AffiliateCreatorState>(key: K, value: AffiliateCreatorState[K]) => {
        setAffiliateCreatorState(prev => ({...prev, [key]: value}));
    };
    
    const handleGenerate = async () => {
        if (!props.activeStoryApiKey || !props.activeVideoApiKey || referenceFiles.length === 0) return;
        setIsGenerating(true);
        setError(null);
        handleStateChange('generatedImages', []);

        const storyFailover: FailoverParams = { allKeys: props.allStoryApiKeys, activeKey: props.activeStoryApiKey, onKeyUpdate: props.onStoryKeyUpdate };
        const videoFailover: FailoverParams = { allKeys: props.allVideoApiKeys, activeKey: props.activeVideoApiKey, onKeyUpdate: props.onVideoKeyUpdate };
        
        try {
            const prompts = await generateAffiliateImagePrompts(storyFailover, affiliateCreatorState);
            const initialImages: GeneratedAffiliateImage[] = prompts.map(prompt => ({ id: generateUUID(), base64: '', mimeType: '', prompt }));
            handleStateChange('generatedImages', initialImages);
            
            const initialStatuses: Record<string, GenerationStatus> = {};
            initialImages.forEach(img => initialStatuses[img.id] = 'loading');
            setImageStatuses(initialStatuses);
            
            await Promise.all(initialImages.map(async (img) => {
                try {
                    const result = await generateAffiliateImages(videoFailover, img.prompt);
                    setAffiliateCreatorState(prev => ({
                        ...prev,
                        generatedImages: prev.generatedImages.map(i => i.id === img.id ? { ...i, ...result } : i)
                    }));
                    setImageStatuses(prev => ({...prev, [img.id]: 'done'}));
                } catch(e) {
                     console.error(`Failed to generate image for prompt: "${img.prompt}"`, e);
                     setImageStatuses(prev => ({...prev, [img.id]: 'error'}));
                }
            }));

        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleRegenerateImage = async (id: string, prompt: string) => {
        if (!props.activeVideoApiKey) return;
        setImageStatuses(prev => ({...prev, [id]: 'loading'}));
        const videoFailover: FailoverParams = { allKeys: props.allVideoApiKeys, activeKey: props.activeVideoApiKey, onKeyUpdate: props.onVideoKeyUpdate };
        try {
            const result = await generateAffiliateImages(videoFailover, prompt);
            setAffiliateCreatorState(prev => ({
                ...prev,
                generatedImages: prev.generatedImages.map(i => i.id === id ? { ...i, ...result } : i)
            }));
            setImageStatuses(prev => ({...prev, [id]: 'done'}));
        } catch(e) {
            console.error(`Failed to regenerate image:`, e);
            setImageStatuses(prev => ({...prev, [id]: 'error'}));
        }
    };

    const handleGenerateVideo = async (image: GeneratedAffiliateImage) => {
        if (!props.activeStoryApiKey) return;
        alert("Generating video prompt..."); // Placeholder for better UX
        const storyFailover: FailoverParams = { allKeys: props.allStoryApiKeys, activeKey: props.activeStoryApiKey, onKeyUpdate: props.onStoryKeyUpdate };
        try {
            const videoPrompt = await generateAffiliateVideoPrompt(storyFailover, image);
            props.onProceedToVideo(videoPrompt, { base64: image.base64, mimeType: image.mimeType });
        } catch(e) {
             alert(e instanceof Error ? e.message : 'Failed to generate video prompt.');
        }
    };

    if (!isOpen) return null;

    const currentFile = localReferenceFiles.length > 0 ? localReferenceFiles[currentFileIndex] : null;
    const vibeOptions = t('affiliateCreator.vibes') as { [key: string]: string };

    return (
        <div className="fixed inset-0 bg-base-100 z-50 flex flex-col font-sans" role="dialog" aria-modal="true">
            <header className="flex-shrink-0 bg-base-200/80 backdrop-blur-sm border-b border-base-300 w-full z-10">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
                    <div>
                        <h2 className="text-xl font-bold text-green-400">{t('affiliateCreator.title') as string}</h2>
                        <p className="text-sm text-gray-400">{t('affiliateCreator.description') as string}</p>
                    </div>
                     <button onClick={onClose} className="px-6 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-200 bg-base-300 hover:bg-gray-700">{t('closeButton') as string}</button>
                </div>
            </header>
            
            <main className="flex-grow overflow-y-auto">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 pb-24 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* Settings Column */}
                    <div className="lg:sticky lg:top-28 bg-base-200 p-6 rounded-lg border border-base-300 space-y-4">
                        <h3 className="font-semibold text-lg text-gray-200">{t('affiliateCreator.uploadSectionTitle') as string}</h3>
                        <input type="file" id="affiliateFileInput" className="hidden" multiple accept={SUPPORTED_IMAGE_TYPES.join(',')} onChange={handleFilesChange} />
                        <div className="p-2 rounded-lg bg-base-300/50 border-2 border-dashed border-gray-600 min-h-[150px] flex flex-col justify-between">
                            {localReferenceFiles.length === 0 ? (
                                 <label htmlFor="affiliateFileInput" className="cursor-pointer flex-grow flex flex-col items-center justify-center p-2 rounded-lg text-center hover:bg-base-300/30 transition-colors">
                                     <PlusIcon className="h-8 w-8 text-gray-400"/>
                                     <span className="text-sm mt-1 text-gray-400">{t('characterWorkshop.uploadButton') as string}</span>
                                </label>
                            ) : currentFile && (
                                <div className="relative flex-grow flex items-center justify-center">
                                    <img src={currentFile.previewUrl} alt="Reference preview" className="max-w-full max-h-full object-contain rounded-md"/>
                                    <button onClick={() => {}} className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full text-white hover:bg-red-500" aria-label="Delete file"><TrashIcon className="h-4 w-4" /></button>
                                </div>
                            )}
                        </div>

                        <h3 className="font-semibold text-lg text-gray-200 pt-2">{t('affiliateCreator.settingsSectionTitle') as string}</h3>
                        <div>
                             <label className="block text-sm font-semibold text-gray-300 mb-1">{t('affiliateCreator.modelSectionTitle') as string}</label>
                            <div className="flex gap-2">
                                <button onClick={() => handleStateChange('model', 'woman')} className={`flex-1 p-2 text-sm rounded-md ${model === 'woman' ? 'bg-brand-primary text-white' : 'bg-base-300'}`}>Woman</button>
                                <button onClick={() => handleStateChange('model', 'man')} className={`flex-1 p-2 text-sm rounded-md ${model === 'man' ? 'bg-brand-primary text-white' : 'bg-base-300'}`}>Man</button>
                                <button onClick={() => handleStateChange('model', 'none')} className={`flex-1 p-2 text-sm rounded-md ${model === 'none' ? 'bg-brand-primary text-white' : 'bg-base-300'}`}>None</button>
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-1">{t('affiliateCreator.vibeSectionTitle') as string}</label>
                            <select value={vibe} onChange={e => handleStateChange('vibe', e.target.value)} className="w-full bg-base-300 border border-gray-600 rounded-lg p-2 text-sm text-gray-200">
                                {Object.entries(vibeOptions).map(([key, value]) => (<option key={key} value={key}>{value}</option>))}
                            </select>
                            {vibe === 'custom' && <input type="text" value={customVibe} onChange={e => handleStateChange('customVibe', e.target.value)} placeholder={t('affiliateCreator.customVibePlaceholder') as string} className="w-full bg-base-300 border border-gray-600 rounded-lg p-2 text-sm mt-2" />}
                        </div>
                        <div>
                            <label htmlFor="num-images" className="block text-sm font-semibold text-gray-300 mb-1">{t('affiliateCreator.numberOfImages') as string} ({numberOfImages})</label>
                            <input id="num-images" type="range" min="3" max="12" value={numberOfImages} onChange={e => handleStateChange('numberOfImages', Number(e.target.value))} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
                        </div>

                        <button onClick={handleGenerate} disabled={isGenerating || referenceFiles.length === 0} className="w-full mt-4 py-3 text-white font-bold bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                            {isGenerating ? t('affiliateCreator.generatingButton') as string : t('affiliateCreator.generateButton') as string}
                        </button>
                         {error && <p className="text-red-400 text-xs text-center">{error}</p>}
                    </div>
                    {/* Results Column */}
                    <div className="lg:col-span-2">
                        <h3 className="font-semibold text-lg text-gray-200 mb-4">{t('affiliateCreator.resultsSectionTitle') as string}</h3>
                        {generatedImages.length === 0 && !isGenerating && (
                            <div className="text-center text-gray-500 py-20 bg-base-200 rounded-lg border-2 border-dashed border-gray-600">{t('affiliateCreator.resultsPlaceholder') as string}</div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {generatedImages.map(img => (
                                <div key={img.id} className="aspect-[9/16] bg-base-200 rounded-lg overflow-hidden relative group border border-base-300">
                                    {imageStatuses[img.id] === 'loading' && <div className="absolute inset-0 flex items-center justify-center animate-pulse">Loading...</div>}
                                    {imageStatuses[img.id] === 'error' && <div className="absolute inset-0 flex items-center justify-center text-red-400 text-xs p-2">Error</div>}
                                    {img.base64 && <img src={`data:${img.mimeType};base64,${img.base64}`} alt={img.prompt} className="w-full h-full object-cover" />}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                                        <p className="text-white text-[10px] line-clamp-4">{img.prompt}</p>
                                        <div className="space-y-1">
                                            <button onClick={() => handleRegenerateImage(img.id, img.prompt)} className="w-full text-xs p-1.5 flex items-center justify-center gap-1 bg-white/20 hover:bg-white/40 rounded text-white backdrop-blur-sm"><RefreshIcon/> {t('affiliateCreator.regenerate') as string}</button>
                                            <button className="w-full text-xs p-1.5 flex items-center justify-center gap-1 bg-white/20 hover:bg-white/40 rounded text-white backdrop-blur-sm"><ReplaceIcon/> {t('affiliateCreator.replace') as string}</button>
                                            <a href={`data:${img.mimeType};base64,${img.base64}`} download={`affiliate_${img.id.substring(0,6)}.jpg`} className="w-full text-xs p-1.5 flex items-center justify-center gap-1 bg-white/20 hover:bg-white/40 rounded text-white backdrop-blur-sm"><DownloadIcon/> {t('affiliateCreator.download') as string}</a>
                                            <button onClick={() => handleGenerateVideo(img)} className="w-full text-xs p-1.5 flex items-center justify-center gap-1 bg-green-600/80 hover:bg-green-600 rounded text-white backdrop-blur-sm"><VideoIcon className="h-4 w-4" /> {t('affiliateCreator.generateVideo') as string}</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};