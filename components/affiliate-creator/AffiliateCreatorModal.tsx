// FIX: Implemented the full AffiliateCreatorModal component to resolve module not found and other related errors.
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useLocalization } from '../../i18n';
import type { AffiliateCreatorState, GeneratedAffiliateImage, StoredReferenceFile, ReferenceFile, VideoPromptType } from '../../types';
import { FailoverParams } from '../../services/geminiService';
import { generateAffiliateImagePrompts, generateAffiliateImages, generateAffiliateVideoPrompt, generateAffiliateDescription } from '../../services/storyCreatorService';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { ChevronLeftIcon } from '../icons/ChevronLeftIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';
import { ShoppingCartIcon } from '../icons/ShoppingCartIcon';
import { RefreshIcon } from '../icons/RefreshIcon';
import { ReplaceIcon } from '../icons/ReplaceIcon';
import { DownloadIcon } from '../icons/DownloadIcon';
import { VideoIcon } from '../icons/VideoIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';
import { ClipboardIcon } from '../icons/ClipboardIcon';
import { CheckIcon } from '../icons/CheckIcon';

interface AffiliateCreatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    // FIX: Update the `onProceedToVideo` prop to accept the `affiliateImageId` payload.
    onProceedToVideo: (prompt: string, data?: { base64: string; mimeType: string } | { affiliateImageId: string }) => void;
    allStoryApiKeys: string[];
    activeStoryApiKey: string | null;
    onStoryKeyUpdate: (key: string) => void;
    allVideoApiKeys: string[];
    activeVideoApiKey: string | null;
    onVideoKeyUpdate: (key: string) => void;
    affiliateCreatorState: AffiliateCreatorState;
    setAffiliateCreatorState: React.Dispatch<React.SetStateAction<AffiliateCreatorState>>;
}

const generateUUID = () => {
    if (window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

const MAX_FILE_SIZE_MB = 25;
const MAX_VIDEO_DURATION_S = 10;

const CopyPromptButton: React.FC<{ prompt: string }> = ({ prompt }) => {
    const { t } = useLocalization();
    const [copied, setCopied] = useState(false);
    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation(); // prevent opening overlay
        navigator.clipboard.writeText(prompt);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button 
            onClick={handleCopy} 
            className="p-1.5 bg-black/50 text-white rounded-full hover:bg-brand-primary"
            title={copied ? t('affiliateCreator.copiedTooltip') as string : t('affiliateCreator.copyPromptTooltip') as string}
        >
            {copied ? 
                <CheckIcon className="h-4 w-4" /> :
                <ClipboardIcon className="h-4 w-4" />
            }
        </button>
    );
};

export const AffiliateCreatorModal: React.FC<AffiliateCreatorModalProps> = ({
    isOpen,
    onClose,
    onProceedToVideo,
    allStoryApiKeys,
    activeStoryApiKey,
    onStoryKeyUpdate,
    allVideoApiKeys,
    activeVideoApiKey,
    onVideoKeyUpdate,
    affiliateCreatorState,
    setAffiliateCreatorState,
}) => {
    const { t } = useLocalization();
    const [isGenerating, setIsGenerating] = useState(false);
    const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [localProductReferenceFiles, setLocalProductReferenceFiles] = useState<ReferenceFile[]>([]);
    const [currentProductFileIndex, setCurrentProductFileIndex] = useState(0);
    const [localActorReferenceFiles, setLocalActorReferenceFiles] = useState<ReferenceFile[]>([]);
    const [currentActorFileIndex, setCurrentActorFileIndex] = useState(0);

    const [generatingStates, setGeneratingStates] = useState<Record<string, 'regenerating' | 'uploading' | 'prompting'>>({});
    
    const { generatedImages, numberOfImages, model, vibe, customVibe, productDescription, aspectRatio, narratorLanguage, customNarratorLanguage, speechStyle, customSpeechStyle } = affiliateCreatorState;
    

    // Sync local state with persisted state when modal opens
    useEffect(() => {
        if (isOpen) {
            const dataURLtoBlob = (dataurl: string) => {
                const parts = dataurl.split(',');
                const mime = parts[0].match(/:(.*?);/)?.[1];
                if (!mime) return new Blob();
                const bstr = atob(parts[1]);
                let n = bstr.length;
                const u8arr = new Uint8Array(n);
                while (n--) {
                    u8arr[n] = bstr.charCodeAt(n);
                }
                return new Blob([u8arr], { type: mime });
            };

            const mapStoredToLocal = (storedFiles: StoredReferenceFile[]) => {
                return storedFiles.map(storedFile => {
                    const dataUrl = `data:${storedFile.mimeType};base64,${storedFile.base64}`;
                    const blob = dataURLtoBlob(dataUrl);
                    const file = new File([blob], `reference.${storedFile.mimeType.split('/')[1]}`, { type: storedFile.mimeType });
                    return {
                        ...storedFile,
                        previewUrl: URL.createObjectURL(file),
                        file,
                    };
                });
            }

            const newLocalProductFiles = mapStoredToLocal(affiliateCreatorState.productReferenceFiles);
            const newLocalActorFiles = mapStoredToLocal(affiliateCreatorState.actorReferenceFiles);

            setLocalProductReferenceFiles(newLocalProductFiles);
            setLocalActorReferenceFiles(newLocalActorFiles);
            setError(null);
            setGeneratingStates({});
        } else {
            // Cleanup on close
             localProductReferenceFiles.forEach(file => URL.revokeObjectURL(file.previewUrl));
             localActorReferenceFiles.forEach(file => URL.revokeObjectURL(file.previewUrl));
             setLocalProductReferenceFiles([]);
             setLocalActorReferenceFiles([]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, affiliateCreatorState.productReferenceFiles, affiliateCreatorState.actorReferenceFiles]);


    const updateFiles = useCallback((updatedLocalFiles: ReferenceFile[], type: 'product' | 'actor') => {
        const serializableFiles: StoredReferenceFile[] = updatedLocalFiles.map(f => ({
            id: f.id,
            base64: f.base64,
            mimeType: f.mimeType,
            type: f.type,
        }));
        if (type === 'product') {
            setLocalProductReferenceFiles(updatedLocalFiles);
            setAffiliateCreatorState(prev => ({ ...prev, productReferenceFiles: serializableFiles }));
        } else {
            setLocalActorReferenceFiles(updatedLocalFiles);
            setAffiliateCreatorState(prev => ({ ...prev, actorReferenceFiles: serializableFiles }));
        }
    }, [setAffiliateCreatorState]);
    
    const validateAndAddFiles = useCallback(async (files: FileList, type: 'product' | 'actor') => {
        const processFile = (file: File): Promise<ReferenceFile | null> => {
            return new Promise(async (resolve) => {
                if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                    alert(`File ${file.name} exceeds max size of ${MAX_FILE_SIZE_MB}MB.`);
                    resolve(null);
                    return;
                }

                const fileType = file.type.startsWith('video') ? 'video' : 'image';

                if (fileType === 'video') {
                    try {
                        await new Promise<void>((res, rej) => {
                            const video = document.createElement('video');
                            video.preload = 'metadata';
                            video.onloadedmetadata = () => {
                                window.URL.revokeObjectURL(video.src);
                                if (video.duration > MAX_VIDEO_DURATION_S) {
                                    rej(new Error(`Video ${file.name} is too long (${video.duration.toFixed(1)}s). Max ${MAX_VIDEO_DURATION_S}s allowed.`));
                                } else {
                                    res();
                                }
                            };
                            video.onerror = () => rej(new Error('Could not load video metadata.'));
                            video.src = URL.createObjectURL(file);
                        });
                    } catch (error) {
                        alert((error as Error).message);
                        resolve(null);
                        return;
                    }
                }

                const reader = new FileReader();
                reader.onload = (e) => {
                    const base64 = (e.target?.result as string).split(',')[1];
                    const previewUrl = URL.createObjectURL(file);
                    resolve({
                        id: generateUUID(), base64, mimeType: file.type,
                        previewUrl, type: fileType, file
                    });
                };
                reader.onerror = () => {
                    alert(`Error reading file ${file.name}`);
                    resolve(null);
                };
                reader.readAsDataURL(file);
            });
        };

        const currentFiles = type === 'product' ? localProductReferenceFiles : localActorReferenceFiles;

        const filePromises = Array.from(files).map(processFile);
        const newFiles = (await Promise.all(filePromises)).filter((f): f is ReferenceFile => f !== null);

        if (newFiles.length > 0) {
            updateFiles([...currentFiles, ...newFiles], type);
        }
    }, [localProductReferenceFiles, localActorReferenceFiles, updateFiles]);


    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'product' | 'actor') => {
        const files = event.target.files;
        if (files) {
            validateAndAddFiles(files, type);
            event.target.value = ''; // Allow re-uploading
        }
    };

    const removeFile = (id: string, type: 'product' | 'actor') => {
        const currentFiles = type === 'product' ? localProductReferenceFiles : localActorReferenceFiles;
        const newFiles = currentFiles.filter(f => {
             if (f.id === id) {
                URL.revokeObjectURL(f.previewUrl);
                return false;
            }
            return true;
        });
        
        const setCurrentIndex = type === 'product' ? setCurrentProductFileIndex : setCurrentActorFileIndex;
        if (newFiles.length === 0) setCurrentIndex(0);
        else if (currentProductFileIndex >= newFiles.length) setCurrentIndex(newFiles.length - 1);
        
        updateFiles(newFiles, type);
    };
    
    const goToPreviousProductFile = () => setCurrentProductFileIndex(prev => (prev === 0 ? localProductReferenceFiles.length - 1 : prev - 1));
    const goToNextProductFile = () => setCurrentProductFileIndex(prev => (prev === localProductReferenceFiles.length - 1 ? 0 : prev + 1));
    const goToPreviousActorFile = () => setCurrentActorFileIndex(prev => (prev === 0 ? localActorReferenceFiles.length - 1 : prev - 1));
    const goToNextActorFile = () => setCurrentActorFileIndex(prev => (prev === localActorReferenceFiles.length - 1 ? 0 : prev + 1));

    const handleGenerate = async () => {
        if (!activeStoryApiKey || !activeVideoApiKey || affiliateCreatorState.productReferenceFiles.length === 0) return;
        setIsGenerating(true);
        setError(null);
        setAffiliateCreatorState(prev => ({ ...prev, generatedImages: [] }));
        
        const storyFailover: FailoverParams = { allKeys: allStoryApiKeys, activeKey: activeStoryApiKey, onKeyUpdate: onStoryKeyUpdate };
        const videoFailover: FailoverParams = { allKeys: allVideoApiKeys, activeKey: activeVideoApiKey, onKeyUpdate: onVideoKeyUpdate };
        
        try {
            const prompts = await generateAffiliateImagePrompts(storyFailover, affiliateCreatorState);
            
            const referenceFiles = [...affiliateCreatorState.productReferenceFiles, ...affiliateCreatorState.actorReferenceFiles];
            const imagePromises = prompts.map(p => generateAffiliateImages(videoFailover, p, affiliateCreatorState.aspectRatio, referenceFiles));
            
            const results = await Promise.all(imagePromises);

            const newImages: GeneratedAffiliateImage[] = results.map(res => ({
                id: generateUUID(),
                ...res
            }));
            
            setAffiliateCreatorState(prev => ({...prev, generatedImages: newImages}));

        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred');
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleGenerateVideoPrompt = async (id: string, promptType: VideoPromptType, index: number) => {
        const targetImage = affiliateCreatorState.generatedImages.find(img => img.id === id);
        if (!targetImage || !activeStoryApiKey) return;
    
        setGeneratingStates(prev => ({ ...prev, [id]: 'prompting' }));
        setError(null);
    
        const storyFailover: FailoverParams = { allKeys: allStoryApiKeys, activeKey: activeStoryApiKey, onKeyUpdate: onStoryKeyUpdate };
        
        try {
            const langForPrompt = narratorLanguage === 'custom'
                ? customNarratorLanguage
                : narratorLanguage;
    
            if (!langForPrompt.trim()) {
                setError("Please select or enter a narrator language.");
                setGeneratingStates(prev => { const n = {...prev}; delete n[id]; return n; });
                return;
            }
    
            let previousNarration: string | undefined = undefined;
            if (promptType === 'continuation' || promptType === 'closing') {
                if (index > 0) {
                    const prevImage = affiliateCreatorState.generatedImages[index - 1];
                    if (prevImage.videoPrompt) {
                        try {
                            const parsedPrompt = JSON.parse(prevImage.videoPrompt);
                            previousNarration = parsedPrompt.NARRATION_SCRIPT?.NARRATION;
                        } catch (e) {
                            console.error("Could not parse previous video prompt to get narration.");
                        }
                    }
                    if (!previousNarration) {
                        setError(`Please generate a prompt for the previous image (image ${index}) first.`);
                        setGeneratingStates(prev => { const n = {...prev}; delete n[id]; return n; });
                        return;
                    }
                } else if (promptType === 'continuation') {
                     setError("Cannot generate a continuation prompt for the first image.");
                     setGeneratingStates(prev => { const n = {...prev}; delete n[id]; return n; });
                     return;
                }
            }
            
            const isSingleImage = affiliateCreatorState.generatedImages.length === 1;
    
            const settings = {
                narratorLanguage: affiliateCreatorState.narratorLanguage,
                customNarratorLanguage: affiliateCreatorState.customNarratorLanguage,
                aspectRatio: affiliateCreatorState.aspectRatio,
                vibe: affiliateCreatorState.vibe,
                customVibe: affiliateCreatorState.customVibe,
                speechStyle: affiliateCreatorState.speechStyle,
                customSpeechStyle: affiliateCreatorState.customSpeechStyle,
            };
    
            const promptJson = await generateAffiliateVideoPrompt(storyFailover, targetImage, settings, promptType, isSingleImage, previousNarration);
            
            const updatedImage: GeneratedAffiliateImage = { ...targetImage, videoPrompt: promptJson };
    
            setAffiliateCreatorState(prev => ({
                ...prev,
                generatedImages: prev.generatedImages.map(img => img.id === id ? updatedImage : img)
            }));
            
        } catch (e) {
            setError(e instanceof Error ? e.message : `Failed to generate video prompt`);
        } finally {
            setGeneratingStates(prev => {
                const newStates = { ...prev };
                delete newStates[id];
                return newStates;
            });
        }
    };

    const handleAction = async (id: string, action: 'regenerate' | 'upload') => {
        const targetImage = generatedImages.find(img => img.id === id);
        if (!targetImage) return;

        const stateValue = action === 'regenerate' ? 'regenerating' : 'uploading';
        setGeneratingStates(prev => ({ ...prev, [id]: stateValue }));

        const videoFailover: FailoverParams = { allKeys: allVideoApiKeys, activeKey: activeVideoApiKey, onKeyUpdate: onVideoKeyUpdate };
        const referenceFiles = [...affiliateCreatorState.productReferenceFiles, ...affiliateCreatorState.actorReferenceFiles];
        try {
            if (action === 'upload') {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            const base64 = (event.target?.result as string).split(',')[1];
                            const updatedImage: GeneratedAffiliateImage = { ...targetImage, base64, mimeType: file.type };
                            setAffiliateCreatorState(prev => ({
                                ...prev,
                                generatedImages: prev.generatedImages.map(img => img.id === id ? updatedImage : img)
                            }));
                        };
                        reader.readAsDataURL(file);
                    }
                };
                input.click();
            } else { // regenerate
                const newImageResult = await generateAffiliateImages(videoFailover, targetImage.prompt, affiliateCreatorState.aspectRatio, referenceFiles);
                const updatedImage: GeneratedAffiliateImage = { ...newImageResult, id: targetImage.id, videoPrompt: targetImage.videoPrompt }; // Keep existing video prompt

                setAffiliateCreatorState(prev => ({
                    ...prev,
                    generatedImages: prev.generatedImages.map(img => img.id === id ? updatedImage : img)
                }));
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : `Failed to ${action}`);
        } finally {
            setGeneratingStates(prev => {
                const newStates = { ...prev };
                delete newStates[id];
                return newStates;
            });
        }
    };

    const handleGenerateDescription = async () => {
        if (!activeStoryApiKey || (localProductReferenceFiles.length === 0 && localActorReferenceFiles.length === 0)) return;
        setIsGeneratingDescription(true);
        const storyFailover: FailoverParams = { allKeys: allStoryApiKeys, activeKey: activeStoryApiKey, onKeyUpdate: onStoryKeyUpdate };
        try {
            const description = await generateAffiliateDescription(storyFailover, { 
                productFiles: localProductReferenceFiles.map(f => ({ base64: f.base64, mimeType: f.mimeType })),
                actorFiles: localActorReferenceFiles.map(f => ({ base64: f.base64, mimeType: f.mimeType }))
            });
            setAffiliateCreatorState(p => ({ ...p, productDescription: description }));
        } catch(e) {
            setError(e instanceof Error ? e.message : 'Failed to generate description');
        } finally {
            setIsGeneratingDescription(false);
        }
    };

    const handleGenerateAllVideos = () => {
        const imagesWithPrompts = affiliateCreatorState.generatedImages.filter(img => img.videoPrompt);
        if (imagesWithPrompts.length === 0) {
            // This case should be prevented by the disabled button, but it's good practice to check.
            return;
        }

        imagesWithPrompts.forEach(img => {
            if (img.videoPrompt) {
                // Use the payload with affiliateImageId to avoid sessionStorage quota errors
                onProceedToVideo(img.videoPrompt, { affiliateImageId: img.id });
            }
        });
    };

    if (!isOpen) return null;
    
    const currentProductFile = localProductReferenceFiles.length > 0 ? localProductReferenceFiles[currentProductFileIndex] : null;
    const currentActorFile = localActorReferenceFiles.length > 0 ? localActorReferenceFiles[currentActorFileIndex] : null;

    return (
        <div className="fixed inset-0 bg-base-100 z-50 flex flex-col font-sans" role="dialog" aria-modal="true">
            <header className="flex-shrink-0 bg-base-200/80 backdrop-blur-sm border-b border-base-300 w-full sticky top-0 z-10">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
                    <div className="flex items-center gap-3">
                         <ShoppingCartIcon className="h-6 w-6 text-green-400"/>
                        <div>
                            <h2 className="text-xl font-bold text-green-400">{t('affiliateCreator.title') as string}</h2>
                            <p className="text-sm text-gray-400">{t('affiliateCreator.description') as string}</p>
                        </div>
                    </div>
                     <div className="flex items-center gap-4">
                        <button
                            onClick={handleGenerateAllVideos}
                            disabled={affiliateCreatorState.generatedImages.filter(img => img.videoPrompt).length === 0}
                            className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:opacity-50 transition-colors"
                        >
                            {t('affiliateCreator.generateVideo') as string}
                        </button>
                        <button onClick={onClose} className="px-6 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-200 bg-base-300 hover:bg-gray-700">
                            {t('closeButton') as string}
                        </button>
                    </div>
                </div>
            </header>
            <main className="flex-grow overflow-y-auto">
                 <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-1 lg:sticky lg:top-28 space-y-6">
                        {/* --- Product Upload Section --- */}
                        <div className="bg-base-200 p-4 rounded-lg border border-base-300 space-y-3">
                            <h3 className="font-semibold text-lg text-gray-200">{t('affiliateCreator.uploadSectionTitle') as string}</h3>
                            <input type="file" id="affiliateProductFileInput" className="hidden" multiple accept="image/*,video/mp4,video/quicktime,video/webm" onChange={(e) => handleFileChange(e, 'product')} />
                            <div className="p-2 rounded-lg bg-base-300/50 border-2 border-dashed border-gray-600 min-h-[150px] flex flex-col justify-between">
                                {localProductReferenceFiles.length === 0 ? (
                                    <label htmlFor="affiliateProductFileInput" className="cursor-pointer flex-grow flex flex-col items-center justify-center p-2 rounded-lg text-center hover:bg-base-300/30 transition-colors">
                                        <PlusIcon className="h-8 w-8 text-gray-400"/>
                                        <span className="text-sm mt-1 text-gray-400">{t('characterWorkshop.uploadButton') as string}</span>
                                    </label>
                                ) : (
                                    <div className="relative flex-grow flex items-center justify-center">
                                         {localProductReferenceFiles.length > 1 && (
                                            <button onClick={goToPreviousProductFile} className="absolute left-0 z-10 p-2 bg-base-200/50 rounded-full hover:bg-base-200 transition-colors" aria-label="Previous file"><ChevronLeftIcon /></button>
                                        )}
                                        <div className="w-full h-full max-h-48 aspect-[9/16] relative group flex items-center justify-center">
                                            {currentProductFile && (
                                                <>
                                                    {currentProductFile.type === 'image' ? (
                                                        <img src={currentProductFile.previewUrl} alt="Product Reference" className="max-w-full max-h-full object-contain rounded-md"/>
                                                    ) : (
                                                        <video controls src={currentProductFile.previewUrl} className="max-w-full max-h-full object-contain rounded-md" />
                                                    )}
                                                    <button onClick={() => removeFile(currentProductFile.id, 'product')} className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full text-white hover:bg-red-500"><TrashIcon className="h-4 w-4" /></button>
                                                </>
                                            )}
                                        </div>
                                         {localProductReferenceFiles.length > 1 && (
                                            <button onClick={goToNextProductFile} className="absolute right-0 z-10 p-2 bg-base-200/50 rounded-full hover:bg-base-200 transition-colors" aria-label="Next file"><ChevronRightIcon /></button>
                                        )}
                                    </div>
                                )}
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-700/50">
                                    <div className="text-xs text-gray-500">
                                        {localProductReferenceFiles.length > 0 ? `${currentProductFileIndex + 1} / ${localProductReferenceFiles.length}` : 'Images & Videos (10s max)'}
                                    </div>
                                    <label htmlFor="affiliateProductFileInput" className="cursor-pointer p-2 rounded-lg text-xs flex items-center gap-1 font-semibold text-brand-light hover:bg-brand-primary/20">
                                        <PlusIcon className="h-4 w-4"/> {t('characterWorkshop.uploadButton') as string}
                                    </label>
                                </div>
                            </div>
                        </div>
                        {/* --- Actor Upload Section --- */}
                        <div className="bg-base-200 p-4 rounded-lg border border-base-300 space-y-3">
                            <h3 className="font-semibold text-lg text-gray-200">{t('affiliateCreator.uploadActorSectionTitle') as string}</h3>
                            <input type="file" id="affiliateActorFileInput" className="hidden" multiple accept="image/*,video/mp4,video/quicktime,video/webm" onChange={(e) => handleFileChange(e, 'actor')} />
                            <div className="p-2 rounded-lg bg-base-300/50 border-2 border-dashed border-gray-600 min-h-[150px] flex flex-col justify-between">
                                {localActorReferenceFiles.length === 0 ? (
                                    <label htmlFor="affiliateActorFileInput" className="cursor-pointer flex-grow flex flex-col items-center justify-center p-2 rounded-lg text-center hover:bg-base-300/30 transition-colors">
                                        <PlusIcon className="h-8 w-8 text-gray-400"/>
                                        <span className="text-sm mt-1 text-gray-400">{t('characterWorkshop.uploadButton') as string}</span>
                                    </label>
                                ) : (
                                    <div className="relative flex-grow flex items-center justify-center">
                                         {localActorReferenceFiles.length > 1 && (
                                            <button onClick={goToPreviousActorFile} className="absolute left-0 z-10 p-2 bg-base-200/50 rounded-full hover:bg-base-200 transition-colors" aria-label="Previous file"><ChevronLeftIcon /></button>
                                        )}
                                        <div className="w-full h-full max-h-48 aspect-[9/16] relative group flex items-center justify-center">
                                            {currentActorFile && (
                                                <>
                                                    {currentActorFile.type === 'image' ? (
                                                        <img src={currentActorFile.previewUrl} alt="Actor Reference" className="max-w-full max-h-full object-contain rounded-md"/>
                                                    ) : (
                                                        <video controls src={currentActorFile.previewUrl} className="max-w-full max-h-full object-contain rounded-md" />
                                                    )}
                                                    <button onClick={() => removeFile(currentActorFile.id, 'actor')} className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full text-white hover:bg-red-500"><TrashIcon className="h-4 w-4" /></button>
                                                </>
                                            )}
                                        </div>
                                         {localActorReferenceFiles.length > 1 && (
                                            <button onClick={goToNextActorFile} className="absolute right-0 z-10 p-2 bg-base-200/50 rounded-full hover:bg-base-200 transition-colors" aria-label="Next file"><ChevronRightIcon /></button>
                                        )}
                                    </div>
                                )}
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-700/50">
                                    <div className="text-xs text-gray-500">
                                        {localActorReferenceFiles.length > 0 ? `${currentActorFileIndex + 1} / ${localActorReferenceFiles.length}` : 'Images & Videos (10s max)'}
                                    </div>
                                    <label htmlFor="affiliateActorFileInput" className="cursor-pointer p-2 rounded-lg text-xs flex items-center gap-1 font-semibold text-brand-light hover:bg-brand-primary/20">
                                        <PlusIcon className="h-4 w-4"/> {t('characterWorkshop.uploadButton') as string}
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* --- Description and Settings Section --- */}
                        <div className="bg-base-200 p-4 rounded-lg border border-base-300 space-y-4">
                             <h3 className="font-semibold text-lg text-gray-200">{t('affiliateCreator.settingsSectionTitle') as string}</h3>
                            <div className="flex items-center justify-end">
                                <button onClick={handleGenerateDescription} disabled={isGeneratingDescription || (localProductReferenceFiles.length === 0 && localActorReferenceFiles.length === 0) } className="text-xs font-semibold text-amber-400 hover:text-amber-300 disabled:opacity-50">
                                    {isGeneratingDescription ? t('affiliateCreator.generatingButton') as string : t('affiliateCreator.generateDescriptionButton') as string}
                                </button>
                            </div>
                            <div>
                                <label htmlFor="productDescription" className="sr-only">Product Description</label>
                                <textarea
                                    id="productDescription"
                                    value={productDescription}
                                    onChange={e => setAffiliateCreatorState(p => ({...p, productDescription: e.target.value}))}
                                    placeholder={t('affiliateCreator.productDescriptionPlaceholder') as string}
                                    className="w-full bg-base-300 border border-gray-600 rounded-lg p-2.5 text-sm text-gray-200 placeholder-gray-500 transition-colors focus:border-brand-primary focus:ring-brand-primary"
                                    rows={4}
                                />
                            </div>
                             <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-1">{t('affiliateCreator.modelSectionTitle') as string}</label>
                                <select value={model} onChange={e => setAffiliateCreatorState(p => ({...p, model: e.target.value as any}))} className="w-full bg-base-300 border border-gray-600 rounded-lg p-2.5 text-sm text-gray-200">
                                    <option value="woman">{t('affiliateCreator.modelWoman') as string}</option>
                                    <option value="man">{t('affiliateCreator.modelMan') as string}</option>
                                    <option value="none">{t('affiliateCreator.modelNone') as string}</option>
                                </select>
                             </div>
                             <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-1">{t('affiliateCreator.vibeSectionTitle') as string}</label>
                                 <select value={vibe} onChange={e => setAffiliateCreatorState(p => ({...p, vibe: e.target.value}))} className="w-full bg-base-300 border border-gray-600 rounded-lg p-2.5 text-sm text-gray-200">
                                    {Object.entries(t('affiliateCreator.vibes') as {[key: string]: string}).map(([key, name]) => (
                                        <option key={key} value={key}>{name}</option>
                                    ))}
                                 </select>
                                 {vibe === 'custom' && <input type="text" value={customVibe} onChange={e => setAffiliateCreatorState(p => ({...p, customVibe: e.target.value}))} placeholder={t('affiliateCreator.customVibePlaceholder') as string} className="mt-2 w-full bg-base-300 border border-gray-600 rounded-lg p-2.5 text-sm" />}
                             </div>
                            <div>
                                <label htmlFor="numImages" className="block text-sm font-semibold text-gray-300 mb-1">{t('affiliateCreator.numberOfImages') as string}</label>
                                <input id="numImages" type="number" min="1" max="20" value={numberOfImages} onChange={e => setAffiliateCreatorState(p => ({...p, numberOfImages: parseInt(e.target.value)}))} className="w-full bg-base-300 border border-gray-600 rounded-lg p-2.5 text-sm" />
                            </div>
                             <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-1">{t('affiliateCreator.aspectRatio') as string}</label>
                                <select value={aspectRatio} onChange={e => setAffiliateCreatorState(p => ({...p, aspectRatio: e.target.value as any}))} className="w-full bg-base-300 border border-gray-600 rounded-lg p-2.5 text-sm text-gray-200">
                                    <option value="9:16">9:16 (Vertical)</option>
                                    <option value="16:9">16:9 (Horizontal)</option>
                                    <option value="1:1">1:1 (Square)</option>
                                    <option value="4:3">4:3 (Standard)</option>
                                    <option value="3:4">3:4 (Portrait)</option>
                                </select>
                             </div>
                             <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-1">{t('affiliateCreator.narratorLanguage') as string}</label>
                                <select
                                    value={narratorLanguage}
                                    onChange={e => setAffiliateCreatorState(p => ({ ...p, narratorLanguage: e.target.value }))}
                                    className="w-full bg-base-300 border border-gray-600 rounded-lg p-2.5 text-sm text-gray-200"
                                >
                                    <option value="en">English</option>
                                    <option value="id">Indonesian</option>
                                    <option value="es">Spanish</option>
                                    <option value="zh">Chinese</option>
                                    <option value="ja">Japanese</option>
                                    <option value="custom">Custom...</option>
                                </select>
                                {narratorLanguage === 'custom' && (
                                    <input
                                        type="text"
                                        value={customNarratorLanguage}
                                        onChange={e => setAffiliateCreatorState(p => ({ ...p, customNarratorLanguage: e.target.value }))}
                                        placeholder={t('affiliateCreator.customNarratorLanguagePlaceholder') as string}
                                        className="mt-2 w-full bg-base-300 border border-gray-600 rounded-lg p-2.5 text-sm"
                                    />
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-1">{t('affiliateCreator.speechStyle') as string}</label>
                                <select
                                    value={speechStyle}
                                    onChange={e => setAffiliateCreatorState(p => ({ ...p, speechStyle: e.target.value }))}
                                    className="w-full bg-base-300 border border-gray-600 rounded-lg p-2.5 text-sm text-gray-200"
                                >
                                    {Object.entries(t('affiliateCreator.speechStyles') as {[key: string]: string}).map(([key, name]) => (
                                        <option key={key} value={key}>{name}</option>
                                    ))}
                                </select>
                                {speechStyle === 'custom' && (
                                    <input
                                        type="text"
                                        value={customSpeechStyle}
                                        onChange={e => setAffiliateCreatorState(p => ({ ...p, customSpeechStyle: e.target.value }))}
                                        placeholder={t('affiliateCreator.customSpeechStylePlaceholder') as string}
                                        className="mt-2 w-full bg-base-300 border border-gray-600 rounded-lg p-2.5 text-sm"
                                    />
                                )}
                            </div>
                            <button onClick={handleGenerate} disabled={isGenerating || affiliateCreatorState.productReferenceFiles.length === 0} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg disabled:opacity-50">
                                {isGenerating ? t('affiliateCreator.generatingButton') as string : t('affiliateCreator.generateButton') as string}
                            </button>
                        </div>
                    </div>
                    
                    {/* --- Results Section --- */}
                    <div className="lg:col-span-2 bg-base-200 p-4 rounded-lg border border-base-300">
                        <h3 className="font-semibold text-lg text-gray-200 mb-4">{t('affiliateCreator.resultsSectionTitle') as string}</h3>
                        {error && <p className="text-red-400 text-center">{error}</p>}
                        
                        {generatedImages.length === 0 && !isGenerating && (
                            <div className="text-center text-gray-500 py-20">{t('affiliateCreator.resultsPlaceholder') as string}</div>
                        )}
                        {isGenerating && <div className="text-center text-gray-400 py-20">{t('affiliateCreator.generatingButton') as string}</div>}

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {generatedImages.map((img, index) => {
                                const isFirst = index === 0;
                                const isLast = index === generatedImages.length - 1;

                                return (
                                <div key={img.id} className="relative group aspect-[9/16] bg-base-300 rounded-lg overflow-hidden">
                                    {img.videoPrompt && (
                                        <div className="absolute top-2 right-2 z-10">
                                            <CopyPromptButton prompt={img.videoPrompt} />
                                        </div>
                                    )}
                                    <img src={`data:${img.mimeType};base64,${img.base64}`} alt={img.prompt} className="w-full h-full object-cover"/>
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                                        <p className="text-white text-xs leading-tight mb-2 max-h-20 overflow-hidden">{img.prompt}</p>
                                        <div className="space-y-1">
                                            {isFirst && (
                                                <button onClick={() => handleGenerateVideoPrompt(img.id, 'hook', index)} disabled={!!generatingStates[img.id]} className="w-full btn-xs flex items-center justify-center gap-1 bg-cyan-600 hover:bg-cyan-700 text-white">
                                                    {generatingStates[img.id] === 'prompting' ? '...' : t('affiliateCreator.promptHook') as string}
                                                </button>
                                            )}
                                            {!isFirst && !isLast && (
                                                <button onClick={() => handleGenerateVideoPrompt(img.id, 'continuation', index)} disabled={!!generatingStates[img.id]} className="w-full btn-xs flex items-center justify-center gap-1 bg-cyan-600 hover:bg-cyan-700 text-white disabled:opacity-50">
                                                    {generatingStates[img.id] === 'prompting' ? '...' : t('affiliateCreator.promptContinuation') as string}
                                                </button>
                                            )}
                                            {isLast && !isFirst && (
                                                <button onClick={() => handleGenerateVideoPrompt(img.id, 'closing', index)} disabled={!!generatingStates[img.id]} className="w-full btn-xs flex items-center justify-center gap-1 bg-cyan-600 hover:bg-cyan-700 text-white">
                                                    {generatingStates[img.id] === 'prompting' ? '...' : t('affiliateCreator.promptClosing') as string}
                                                </button>
                                            )}

                                            <button onClick={() => handleAction(img.id, 'regenerate')} disabled={!!generatingStates[img.id]} className="w-full btn-xs flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white"><RefreshIcon className="h-3 w-3" />{t('affiliateCreator.regenerate') as string}</button>
                                            <button onClick={() => handleAction(img.id, 'upload')} disabled={!!generatingStates[img.id]} className="w-full btn-xs flex items-center justify-center gap-1 bg-yellow-600 hover:bg-yellow-700 text-black"><ReplaceIcon className="h-3 w-3" />{t('affiliateCreator.upload') as string}</button>
                                            <a href={`data:${img.mimeType};base64,${img.base64}`} download={`affiliate_${img.id.substring(0,6)}.jpg`} className="w-full btn-xs flex items-center justify-center gap-1 bg-gray-600 hover:bg-gray-700 text-white"><DownloadIcon className="h-3 w-3" />{t('affiliateCreator.download') as string}</a>
                                        </div>
                                    </div>
                                    {generatingStates[img.id] && (
                                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-white text-xs animate-pulse">
                                            {generatingStates[img.id]}...
                                        </div>
                                    )}
                                </div>
                                );
                            })}
                        </div>
                    </div>
                 </div>
            </main>
        </div>
    );
};