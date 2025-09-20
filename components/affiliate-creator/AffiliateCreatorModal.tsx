import React, { useState, useEffect, useCallback } from 'react';
import { useLocalization } from '../../i18n';
import type { AffiliateCreatorState, GeneratedAffiliateImage, ReferenceFile, StoredReferenceFile } from '../../types';
import { generateAffiliateImagePrompts, generateAffiliateImages } from '../../services/storyCreatorService';
import { FailoverParams } from '../../services/geminiService';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { ChevronLeftIcon } from '../icons/ChevronLeftIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';
import { RefreshIcon } from '../icons/RefreshIcon';
import { ReplaceIcon } from '../icons/ReplaceIcon';
import { DownloadIcon } from '../icons/DownloadIcon';
import { VideoIcon } from '../icons/VideoIcon';


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

const generateUUID = () => window.crypto.randomUUID();
const MAX_FILE_SIZE_MB = 25;
const MAX_VIDEO_DURATION_S = 10;

export const AffiliateCreatorModal: React.FC<AffiliateCreatorModalProps> = (props) => {
    const { 
        isOpen, onClose, onProceedToVideo, 
        allStoryApiKeys, activeStoryApiKey, onStoryKeyUpdate,
        allVideoApiKeys, activeVideoApiKey, onVideoKeyUpdate,
        affiliateCreatorState, setAffiliateCreatorState 
    } = props;
    
    const { t } = useLocalization();
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentFileIndex, setCurrentFileIndex] = useState(0);
    const [localReferenceFiles, setLocalReferenceFiles] = useState<ReferenceFile[]>([]);
    const [idea, setIdea] = useState('');

    const handleClose = () => {
        // Clear any unfinished generation placeholders
        if (isGenerating) {
            setAffiliateCreatorState(prev => ({ ...prev, generatedImages: prev.generatedImages.filter(img => img.base64) }));
        }
        onClose();
    };

    useEffect(() => {
        if (isOpen) document.body.classList.add('modal-open');
        return () => document.body.classList.remove('modal-open');
    }, [isOpen]);
    
     useEffect(() => {
        if (!isOpen) return;

        const dataURLtoBlob = (dataurl: string) => {
            const parts = dataurl.split(',');
            const mime = parts[0].match(/:(.*?);/)?.[1];
            if (!mime) return new Blob();
            const bstr = atob(parts[1]);
            let n = bstr.length; const u8arr = new Uint8Array(n);
            while (n--) { u8arr[n] = bstr.charCodeAt(n); }
            return new Blob([u8arr], { type: mime });
        };

        const newLocalFiles = affiliateCreatorState.referenceFiles.map(storedFile => {
            const dataUrl = `data:${storedFile.mimeType};base64,${storedFile.base64}`;
            const blob = dataURLtoBlob(dataUrl);
            const file = new File([blob], `reference.${storedFile.mimeType.split('/')[1]}`, { type: storedFile.mimeType });
            return { ...storedFile, previewUrl: URL.createObjectURL(file), file };
        });

        setLocalReferenceFiles(newLocalFiles);

        return () => {
            newLocalFiles.forEach(file => URL.revokeObjectURL(file.previewUrl));
        };
    }, [isOpen, affiliateCreatorState.referenceFiles]);

     const updateFiles = useCallback((updatedLocalFiles: ReferenceFile[]) => {
        setLocalReferenceFiles(updatedLocalFiles);
        const serializableFiles: StoredReferenceFile[] = updatedLocalFiles.map(f => ({
            id: f.id, base64: f.base64, mimeType: f.mimeType, type: f.type,
        }));
        setAffiliateCreatorState(prev => ({ ...prev, referenceFiles: serializableFiles }));
    }, [setAffiliateCreatorState]);
    
    const validateAndAddFiles = useCallback(async (files: FileList) => {
       const filePromises = Array.from(files).map((file): Promise<ReferenceFile | null> => new Promise(async (resolve) => {
            if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                alert(`File ${file.name} is too large. Max is ${MAX_FILE_SIZE_MB}MB.`);
                return resolve(null);
            }
            const type = file.type.startsWith('video') ? 'video' : 'image';
            if (type === 'video') {
                try {
                    await new Promise<void>((res, rej) => {
                        const video = document.createElement('video');
                        video.preload = 'metadata';
                        video.onloadedmetadata = () => {
                            URL.revokeObjectURL(video.src);
                            if (video.duration > MAX_VIDEO_DURATION_S) rej(new Error(`Video ${file.name} is too long (${video.duration.toFixed(1)}s). Max is ${MAX_VIDEO_DURATION_S}s.`));
                            else res();
                        };
                        video.onerror = () => rej(new Error('Could not load video metadata.'));
                        video.src = URL.createObjectURL(file);
                    });
                } catch (error) {
                    alert((error as Error).message);
                    return resolve(null);
                }
            }
            const reader = new FileReader();
            reader.onload = e => {
                const base64 = (e.target?.result as string).split(',')[1];
                resolve({ id: generateUUID(), base64, mimeType: file.type, previewUrl: URL.createObjectURL(file), type, file });
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
        }));
        const newFiles = (await Promise.all(filePromises)).filter((f): f is ReferenceFile => f !== null);
        if (newFiles.length > 0) updateFiles([...localReferenceFiles, ...newFiles]);
    }, [localReferenceFiles, updateFiles]);

    const handleFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            validateAndAddFiles(event.target.files);
            event.target.value = '';
        }
    };
    
    const removeFile = (id: string) => {
        const newFiles = localReferenceFiles.filter(f => {
             if (f.id === id) { URL.revokeObjectURL(f.previewUrl); return false; }
            return true;
        });
        if (newFiles.length > 0 && currentFileIndex >= newFiles.length) {
            setCurrentFileIndex(newFiles.length - 1);
        } else if (newFiles.length === 0) {
            setCurrentFileIndex(0);
        }
        updateFiles(newFiles);
    };

    const handleGenerateSequence = async () => {
        if (!activeStoryApiKey || !activeVideoApiKey || localReferenceFiles.length === 0) return;
        setIsGenerating(true);
        setError(null);

        const placeholders: GeneratedAffiliateImage[] = Array(affiliateCreatorState.numberOfImages).fill(null).map(() => ({
            id: generateUUID(), base64: '', mimeType: '', prompt: ''
        }));
        setAffiliateCreatorState(prev => ({ ...prev, generatedImages: placeholders }));

        try {
            const storyFailover: FailoverParams = { allKeys: allStoryApiKeys, activeKey: activeStoryApiKey, onKeyUpdate: onStoryKeyUpdate };
            const prompts = await generateAffiliateImagePrompts(storyFailover, {
                referenceFiles: localReferenceFiles.map(f => ({ base64: f.base64, mimeType: f.mimeType })),
                numberOfImages: affiliateCreatorState.numberOfImages,
                idea,
                model: affiliateCreatorState.model,
                vibe: affiliateCreatorState.vibe,
                customVibe: affiliateCreatorState.customVibe,
            });

            for (let i = 0; i < prompts.length; i++) {
                const prompt = prompts[i];
                const videoFailover: FailoverParams = { allKeys: allVideoApiKeys, activeKey: activeVideoApiKey, onKeyUpdate: onVideoKeyUpdate };
                const imageData = await generateAffiliateImages(videoFailover, prompt);
                setAffiliateCreatorState(prev => {
                    const newImages = [...prev.generatedImages];
                    newImages[i] = { id: placeholders[i].id, ...imageData, prompt };
                    return { ...prev, generatedImages: newImages };
                });
            }

        } catch (e) {
            const msg = e instanceof Error ? e.message : 'An unknown error occurred';
            setError(msg);
            setAffiliateCreatorState(prev => ({ ...prev, generatedImages: [] }));
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRegenerateImage = async (id: string, prompt: string) => {
        if (!activeVideoApiKey) return;
        const videoFailover: FailoverParams = { allKeys: allVideoApiKeys, activeKey: activeVideoApiKey, onKeyUpdate: onVideoKeyUpdate };
        
        setAffiliateCreatorState(prev => ({
            ...prev,
            generatedImages: prev.generatedImages.map(img => img.id === id ? { ...img, base64: '' } : img)
        }));
        
        try {
            const imageData = await generateAffiliateImages(videoFailover, prompt);
            setAffiliateCreatorState(prev => ({
                ...prev,
                generatedImages: prev.generatedImages.map(img => img.id === id ? { ...img, ...imageData } : img)
            }));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to regenerate image');
            // Restore previous image if regeneration fails
            setAffiliateCreatorState(prev => ({ ...prev, generatedImages: prev.generatedImages }));
        }
    };
    
    if (!isOpen) return null;
    const { referenceFiles, generatedImages, numberOfImages, model, vibe, customVibe } = affiliateCreatorState;
    const currentFile = localReferenceFiles[currentFileIndex];
    const vibes = t('affiliateCreator.vibes') as Record<string, string>;

    return (
        <div className="fixed inset-0 bg-base-100 z-50 flex flex-col font-sans" role="dialog" aria-modal="true">
            <header className="flex-shrink-0 bg-base-200/80 backdrop-blur-sm border-b border-base-300 w-full z-10">
                 <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
                    <div>
                        <h2 className="text-xl font-bold text-green-400">{t('affiliateCreator.title') as string}</h2>
                        <p className="text-sm text-gray-400">{t('affiliateCreator.description') as string}</p>
                    </div>
                    <button onClick={handleClose} className="px-6 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-200 bg-base-300 hover:bg-gray-700">{t('closeButton') as string}</button>
                </div>
            </header>

            <main className="flex-grow overflow-y-auto">
                 <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 pb-24 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div className="lg:sticky lg:top-28 bg-base-200 p-6 rounded-lg border border-base-300 space-y-4">
                        {/* Control Panel */}
                         <h3 className="font-semibold text-lg">{t('affiliateCreator.uploadSectionTitle') as string}</h3>
                          <div className="p-2 rounded-lg bg-base-300/50 border-2 border-dashed border-gray-600 min-h-[180px] flex flex-col justify-between">
                            {localReferenceFiles.length === 0 ? (
                                <label htmlFor="affiliate-file-input" className="cursor-pointer flex-grow flex flex-col items-center justify-center text-center hover:bg-base-300/30 transition-colors">
                                    <PlusIcon className="h-8 w-8 text-gray-400"/>
                                    <span className="text-sm mt-1 text-gray-400">{t('characterWorkshop.uploadButton') as string}</span>
                                </label>
                            ) : (
                                <div className="relative flex-grow flex items-center justify-center">
                                    {localReferenceFiles.length > 1 && <button onClick={() => setCurrentFileIndex(p => p === 0 ? localReferenceFiles.length - 1 : p - 1)} className="absolute left-0 z-10 p-2 bg-base-200/50 rounded-full hover:bg-base-200"><ChevronLeftIcon /></button>}
                                    <div className="w-full h-full max-h-48 aspect-video relative flex items-center justify-center">
                                        {currentFile?.type === 'image' ? <img src={currentFile.previewUrl} className="max-w-full max-h-full object-contain rounded"/> : <video controls src={currentFile?.previewUrl} className="max-w-full max-h-full object-contain rounded"/>}
                                        <button onClick={() => removeFile(currentFile.id)} className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full text-white hover:bg-red-500"><TrashIcon className="h-4 w-4" /></button>
                                    </div>
                                    {localReferenceFiles.length > 1 && <button onClick={() => setCurrentFileIndex(p => p === localReferenceFiles.length - 1 ? 0 : p + 1)} className="absolute right-0 z-10 p-2 bg-base-200/50 rounded-full hover:bg-base-200"><ChevronRightIcon /></button>}
                                </div>
                            )}
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-700/50">
                                <div className="text-xs text-gray-500">{localReferenceFiles.length > 0 ? `${currentFileIndex + 1} / ${localReferenceFiles.length}` : t('characterWorkshop.fileTypes') as string}</div>
                                <label htmlFor="affiliate-file-input" className="cursor-pointer p-2 rounded text-xs flex items-center gap-1 font-semibold text-brand-light hover:bg-brand-primary/20"><PlusIcon className="h-4 w-4"/> {t('characterWorkshop.uploadButton') as string}</label>
                            </div>
                        </div>
                        <input type="file" id="affiliate-file-input" className="hidden" multiple onChange={handleFilesChange} />
                        
                        <h3 className="font-semibold text-lg pt-2">{t('affiliateCreator.modelSectionTitle') as string}</h3>
                        <div className="flex gap-2">
                           {['woman', 'man', 'none'].map(m => (
                               <button key={m} onClick={() => setAffiliateCreatorState(p => ({...p, model: m as any}))} className={`flex-1 py-2 px-4 text-sm rounded-md transition-colors ${model === m ? 'bg-green-600 text-white font-semibold' : 'bg-base-300 hover:bg-gray-700'}`}>{t(`affiliateCreator.model${m.charAt(0).toUpperCase() + m.slice(1)}`) as string}</button>
                           ))}
                        </div>
                        
                        <h3 className="font-semibold text-lg pt-2">{t('affiliateCreator.vibeSectionTitle') as string}</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.entries(vibes).map(([key, value]) => (
                                <button key={key} onClick={() => setAffiliateCreatorState(p => ({...p, vibe: key}))} className={`py-2 px-4 text-sm rounded-md transition-colors ${vibe === key ? 'bg-green-600 text-white font-semibold' : 'bg-base-300 hover:bg-gray-700'}`}>{value}</button>
                            ))}
                        </div>
                        {vibe === 'custom' && <input type="text" value={customVibe} onChange={e => setAffiliateCreatorState(p => ({...p, customVibe: e.target.value}))} placeholder={t('affiliateCreator.customVibePlaceholder') as string} className="w-full bg-base-300 border border-gray-600 rounded-lg p-2.5 text-sm mt-2" />}

                         <h3 className="font-semibold text-lg pt-2">{t('affiliateCreator.numberOfImages') as string}</h3>
                        <div className="flex items-center gap-2">
                             <input type="range" min="3" max="12" value={numberOfImages} onChange={e => setAffiliateCreatorState(p => ({...p, numberOfImages: parseInt(e.target.value, 10)}))} className="w-full"/>
                            <span className="font-mono text-lg">{numberOfImages}</span>
                        </div>
                        
                         {/* FIX: Cast result of t() to string to match ReactNode type. */}
                         <button onClick={handleGenerateSequence} disabled={isGenerating || referenceFiles.length === 0} className="w-full mt-4 font-bold py-3 px-4 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white transition-colors">{(isGenerating ? t('affiliateCreator.generatingButton') : t('affiliateCreator.generateButton')) as string}</button>
                    </div>

                     <div className="bg-base-200 p-6 rounded-lg border border-base-300 space-y-4">
                        <h3 className="font-semibold text-lg">{t('affiliateCreator.resultsSectionTitle') as string}</h3>
                        {error && <p className="text-red-400 text-center">{error}</p>}
                        
                        {generatedImages.length === 0 ? (
                            <div className="text-center text-gray-500 py-10">{t('affiliateCreator.resultsPlaceholder') as string}</div>
                        ) : (
                             <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {generatedImages.map((img) => (
                                    <div key={img.id} className="aspect-[9/16] bg-base-300 rounded-lg relative group overflow-hidden">
                                        {img.base64 ? <img src={`data:${img.mimeType};base64,${img.base64}`} className="w-full h-full object-cover"/> : <div className="w-full h-full animate-pulse bg-gray-700"></div>}
                                        {img.base64 && (
                                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                 <div className="flex flex-col items-center gap-3">
                                                    <button onClick={() => handleRegenerateImage(img.id, img.prompt)} className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20"><RefreshIcon /></button>
                                                    <button className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20"><ReplaceIcon /></button>
                                                    <a href={`data:${img.mimeType};base64,${img.base64}`} download={`affiliate_img_${img.id}.png`} className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20"><DownloadIcon /></a>
                                                    <button onClick={() => onProceedToVideo(img.prompt, { base64: img.base64, mimeType: img.mimeType })} className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20"><VideoIcon /></button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};