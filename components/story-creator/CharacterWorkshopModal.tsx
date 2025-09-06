import React, { useState, useEffect, useCallback } from 'react';
import type { Character, ReferenceFile } from '../../types';
import { useLocalization } from '../../i18n';
import { developCharacter, generateActionDna } from '../../services/storyCreatorService';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { TagInput } from './TagInput';
import { FailoverParams } from '../../services/geminiService';
import { ChevronLeftIcon } from '../icons/ChevronLeftIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';


interface CharacterWorkshopModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (character: Character) => void;
    initialCharacter: Character | null;
    activeApiKey: string | null;
    allStoryApiKeys: string[];
    onStoryKeyUpdate: (key: string) => void;
}

const generateUUID = () => {
    if (window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID();
    }
    // Fallback for insecure contexts or older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const MAX_FILE_SIZE_MB = 25;
const MAX_VIDEO_DURATION_S = 10;

export const CharacterWorkshopModal: React.FC<CharacterWorkshopModalProps> = ({ isOpen, onClose, onSave, initialCharacter, activeApiKey, allStoryApiKeys, onStoryKeyUpdate }) => {
    const { t } = useLocalization();
    
    const [isProcessingAi, setIsProcessingAi] = useState(false);
    
    const [referenceFiles, setReferenceFiles] = useState<ReferenceFile[]>([]);
    const [idea, setIdea] = useState('');
    const [currentFileIndex, setCurrentFileIndex] = useState(0);

    const [brandName, setBrandName] = useState('');
    const [modelName, setModelName] = useState('');
    const [consistencyKey, setConsistencyKey] = useState('');
    const [material, setMaterial] = useState('');
    const [designLanguage, setDesignLanguage] = useState('');
    const [keyFeatures, setKeyFeatures] = useState<string[]>([]);
    const [actionDNA, setActionDNA] = useState<string[]>([]);
    const [characterPersonality, setCharacterPersonality] = useState('');
    const [physicalDetails, setPhysicalDetails] = useState('');
    const [scaleAndSize, setScaleAndSize] = useState('');

    const resetForm = useCallback(() => {
        referenceFiles.forEach(file => URL.revokeObjectURL(file.previewUrl));
        setReferenceFiles([]);
        setCurrentFileIndex(0);

        setIdea('');
        setBrandName(initialCharacter?.brandName || '');
        setModelName(initialCharacter?.modelName || '');
        setConsistencyKey(initialCharacter?.consistency_key || '');
        setMaterial(initialCharacter?.material || '');
        setDesignLanguage(initialCharacter?.designLanguage || '');
        setKeyFeatures(initialCharacter?.keyFeatures || []);
        setActionDNA(initialCharacter?.actionDNA || []);
        setCharacterPersonality(initialCharacter?.character_personality || '');
        setPhysicalDetails(initialCharacter?.physical_details || '');
        setScaleAndSize(initialCharacter?.scale_and_size || '');
    }, [initialCharacter, referenceFiles]);

    useEffect(() => {
        if (isOpen) {
            resetForm();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, initialCharacter]); // Only re-run when modal opens or initial character changes
    
    const validateAndAddFiles = useCallback(async (files: FileList) => {
        for (const file of Array.from(files)) {
            // Validate Size
            if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                alert(`File ${file.name} is too large. Max size is ${MAX_FILE_SIZE_MB}MB.`);
                continue;
            }

            const type = file.type.startsWith('video') ? 'video' : 'image';

            // Validate Duration for Videos
            if (type === 'video') {
                try {
                    await new Promise<void>((resolve, reject) => {
                        const video = document.createElement('video');
                        video.preload = 'metadata';
                        video.onloadedmetadata = () => {
                            window.URL.revokeObjectURL(video.src);
                            if (video.duration > MAX_VIDEO_DURATION_S) {
                                reject(new Error(`Video ${file.name} is too long (${video.duration.toFixed(1)}s). Max ${MAX_VIDEO_DURATION_S}s allowed.`));
                            } else {
                                resolve();
                            }
                        };
                        video.onerror = () => reject(new Error('Could not load video metadata.'));
                        video.src = URL.createObjectURL(file);
                    });
                } catch (error) {
                    alert((error as Error).message);
                    continue;
                }
            }
            
            // Read file and add to state
             const reader = new FileReader();
             reader.onload = (e) => {
                const base64 = (e.target?.result as string).split(',')[1];
                const previewUrl = URL.createObjectURL(file);
                
                const newFile: ReferenceFile = {
                    id: generateUUID(),
                    base64,
                    mimeType: file.type,
                    previewUrl,
                    type,
                    file
                };

                setReferenceFiles(prev => [...prev, newFile]);
            };
            reader.readAsDataURL(file);
        }
    }, []);

    const handleFilesChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            validateAndAddFiles(event.target.files);
            event.target.value = ''; // Allow re-uploading the same file
        }
    }, [validateAndAddFiles]);

     const removeFile = (id: string) => {
        setReferenceFiles(prev => {
            const fileToRemove = prev.find(f => f.id === id);
            if (fileToRemove) {
                URL.revokeObjectURL(fileToRemove.previewUrl);
            }
            const newFiles = prev.filter(f => f.id !== id);
            
            // Adjust index after deletion
            if (newFiles.length === 0) {
                setCurrentFileIndex(0);
            } else if (currentFileIndex >= newFiles.length) {
                setCurrentFileIndex(newFiles.length - 1);
            }
            
            return newFiles;
        });
    };

    const goToPreviousFile = () => {
        const isFirst = currentFileIndex === 0;
        const newIndex = isFirst ? referenceFiles.length - 1 : currentFileIndex - 1;
        setCurrentFileIndex(newIndex);
    };

    const goToNextFile = () => {
        const isLast = currentFileIndex === referenceFiles.length - 1;
        const newIndex = isLast ? 0 : currentFileIndex + 1;
        setCurrentFileIndex(newIndex);
    };

    const getFailoverParams = (): FailoverParams => ({
        allKeys: allStoryApiKeys,
        activeKey: activeApiKey,
        onKeyUpdate: onStoryKeyUpdate,
    });

    const handleDesignWithAi = async () => {
        if (!activeApiKey) return;
        if (referenceFiles.length === 0 && !idea.trim()) {
            alert(t('characterWorkshop.alertUploadOrDescribe'));
            return;
        }

        setIsProcessingAi(true);
        try {
            const failoverParams = getFailoverParams();
            const devData = await developCharacter(failoverParams, {
                idea,
                referenceFiles: referenceFiles.map(f => ({ base64: f.base64, mimeType: f.mimeType })),
            });
            setBrandName(devData.brand_name);
            setModelName(devData.model_name);
            setConsistencyKey(devData.consistency_key);
            setMaterial(devData.material);
            setDesignLanguage(devData.design_language);
            setKeyFeatures(devData.key_features);
            setCharacterPersonality(devData.character_personality);
            setPhysicalDetails(devData.physical_details);
            setScaleAndSize(devData.scale_and_size);

            const dnaSuggestions = await generateActionDna(failoverParams, devData);
            setActionDNA(dnaSuggestions);

        } catch (e) {
            alert(e instanceof Error ? e.message : 'An unknown error occurred');
        } finally {
            setIsProcessingAi(false);
        }
    };
    
    const handleSave = () => {
        if (!brandName.trim() || !modelName.trim() || !consistencyKey.trim()) {
            alert(t('characterWorkshop.alertRequiredFields'));
            return;
        }

        const finalCharacter: Character = {
            id: initialCharacter?.id ?? generateUUID(),
            name: `${brandName} ${modelName}`,
            brandName,
            modelName,
            consistency_key: consistencyKey,
            material,
            designLanguage,
            keyFeatures,
            actionDNA,
            character_personality: characterPersonality,
            physical_details: physicalDetails,
            scale_and_size: scaleAndSize
        };
        onSave(finalCharacter);
    };

    if (!isOpen) return null;
    
    const currentFile = referenceFiles.length > 0 ? referenceFiles[currentFileIndex] : null;

    return (
        <div className="fixed top-16 inset-x-0 bottom-0 bg-base-100 z-20 flex flex-col font-sans" role="dialog" aria-modal="true">
            <main className="flex-grow overflow-y-auto bg-base-100">
                <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        <div className="lg:sticky lg:top-8">
                             <div className="bg-base-200 p-6 rounded-lg border border-base-300">
                                <h3 className="font-semibold text-lg text-gray-200">{t('characterWorkshop.aiAssistantSection') as string}</h3>
                                <p className="text-xs text-gray-400 mb-3">{t('characterWorkshop.aiAssistantDescription') as string}</p>
                                
                                <input type="file" id="charFileInput" className="hidden" multiple accept="image/*,video/mp4,video/quicktime,video/webm" onChange={handleFilesChange} />
                                
                                <div className="p-4 rounded-lg bg-base-300/50 border-2 border-dashed border-gray-600 min-h-[180px] flex flex-col justify-between">
                                    {referenceFiles.length === 0 ? (
                                        <label htmlFor="charFileInput" className="cursor-pointer flex-grow flex flex-col items-center justify-center p-2 rounded-lg text-center hover:bg-base-300/30 transition-colors">
                                             <PlusIcon className="h-8 w-8 text-gray-400"/>
                                             <span className="text-sm mt-1 text-gray-400">{t('characterWorkshop.uploadButton') as string}</span>
                                        </label>
                                    ) : (
                                        <div className="relative flex-grow flex items-center justify-center">
                                            {referenceFiles.length > 1 && (
                                                <button onClick={goToPreviousFile} className="absolute left-0 z-10 p-2 bg-base-200/50 rounded-full hover:bg-base-200 transition-colors" aria-label="Previous file">
                                                    <ChevronLeftIcon />
                                                </button>
                                            )}
                                
                                            <div className="w-full h-full max-h-48 aspect-video relative group flex items-center justify-center">
                                                {currentFile && (
                                                    <>
                                                        {currentFile.type === 'image' ? (
                                                            <img src={currentFile.previewUrl} alt="Reference preview" className="max-w-full max-h-full object-contain rounded-md"/>
                                                        ) : (
                                                            <video controls poster={currentFile.previewUrl} className="max-w-full max-h-full object-contain rounded-md">
                                                                <source src={currentFile.previewUrl} type={currentFile.mimeType} />
                                                            </video>
                                                        )}
                                                        <button onClick={() => removeFile(currentFile.id)} className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full text-white hover:bg-red-500" aria-label="Delete file">
                                                            <TrashIcon className="h-4 w-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                
                                            {referenceFiles.length > 1 && (
                                                <button onClick={goToNextFile} className="absolute right-0 z-10 p-2 bg-base-200/50 rounded-full hover:bg-base-200 transition-colors" aria-label="Next file">
                                                    <ChevronRightIcon />
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-700/50">
                                        <div className="text-xs text-gray-500">
                                            {referenceFiles.length > 0 ? `${currentFileIndex + 1} / ${referenceFiles.length}` : t('characterWorkshop.fileTypes') as string}
                                        </div>
                                        <label htmlFor="charFileInput" className="cursor-pointer p-2 rounded-lg text-xs flex items-center gap-1 font-semibold text-brand-light hover:bg-brand-primary/20">
                                            <PlusIcon className="h-4 w-4"/> {t('characterWorkshop.uploadButton') as string}
                                        </label>
                                    </div>
                                </div>
                                <textarea value={idea} onChange={e => setIdea(e.target.value)} placeholder={t('characterWorkshop.ideaPlaceholder') as string} className="mt-4 w-full bg-base-300 border border-gray-600 rounded-lg p-3 text-sm text-gray-200 placeholder-gray-500" rows={2}></textarea>
                                 <div className="mt-4">
                                    <button onClick={handleDesignWithAi} disabled={isProcessingAi || !activeApiKey} className="w-full inline-flex justify-center items-center gap-2 px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed disabled:opacity-70 transition-colors">
                                        {(isProcessingAi ? t('characterWorkshop.designingWithAiButton') : t('characterWorkshop.designWithAiButton')) as string}
                                    </button>
                                    {!activeApiKey && (
                                        <p className="text-xs text-yellow-400/80 text-center mt-2">
                                            {t('alertSetStoryApiKey') as string}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="bg-base-200 p-6 rounded-lg border border-base-300 space-y-4 mb-24">
                            <h3 className="font-semibold text-lg text-gray-200">{t('characterWorkshop.modelDetailsSection') as string}</h3>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-1">{t('characterWorkshop.brandName') as string}</label>
                                    <input type="text" value={brandName} onChange={e => setBrandName(e.target.value)} className="w-full bg-base-300 border border-gray-600 rounded-lg p-2.5 text-sm text-gray-200 placeholder-gray-500" />
                                </div>
                                 <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-1">{t('characterWorkshop.modelName') as string}</label>
                                    <input type="text" value={modelName} onChange={e => setModelName(e.target.value)} className="w-full bg-base-300 border border-gray-600 rounded-lg p-2.5 text-sm text-gray-200 placeholder-gray-500" />
                                </div>
                           </div>
                           <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-1">{t('characterWorkshop.consistencyId') as string}</label>
                                <input type="text" value={consistencyKey} onChange={e => setConsistencyKey(e.target.value)} className="w-full bg-base-300 border border-gray-600 rounded-lg p-2.5 text-sm text-gray-200 placeholder-gray-500" />
                                <p className="text-xs text-gray-500 mt-1">{t('characterWorkshop.consistencyIdHint') as string}</p>
                            </div>
                             <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-1">{t('characterWorkshop.mainMaterial') as string}</label>
                                <input type="text" value={material} onChange={e => setMaterial(e.target.value)} className="w-full bg-base-300 border border-gray-600 rounded-lg p-2.5 text-sm text-gray-200 placeholder-gray-500" />
                            </div>
                            <div>
                                 <label className="block text-sm font-semibold text-gray-300 mb-1">{t('characterWorkshop.designLanguage') as string}</label>
                                 <textarea value={designLanguage} onChange={e => setDesignLanguage(e.target.value)} className="w-full bg-base-300 border border-gray-600 rounded-lg p-2.5 text-sm text-gray-200 placeholder-gray-500" rows={3}></textarea>
                            </div>

                            <TagInput
                               label={t('characterWorkshop.keyFeatures') as string}
                               tags={keyFeatures}
                               onTagsChange={setKeyFeatures}
                               placeholder={t('characterWorkshop.keyFeaturesPlaceholder') as string}
                            />
                            
                            <div className="border-t border-base-300 my-4"></div>
                            
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-1">{t('characterWorkshop.characterPersonality') as string}</label>
                                <textarea value={characterPersonality} onChange={e => setCharacterPersonality(e.target.value)} placeholder={t('characterWorkshop.personalityPlaceholder') as string} className="w-full bg-base-300 border border-gray-600 rounded-lg p-2.5 text-sm text-gray-200 placeholder-gray-500" rows={3}></textarea>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-1">{t('characterWorkshop.physicalDetails') as string}</label>
                                <textarea value={physicalDetails} onChange={e => setPhysicalDetails(e.target.value)} placeholder={t('characterWorkshop.physicalDetailsPlaceholder') as string} className="w-full bg-base-300 border border-gray-600 rounded-lg p-2.5 text-sm text-gray-200 placeholder-gray-500" rows={3}></textarea>
                            </div>
                            
                             <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-1">{t('characterWorkshop.scaleAndSize') as string}</label>
                                <input type="text" value={scaleAndSize} onChange={e => setScaleAndSize(e.target.value)} placeholder={t('characterWorkshop.scaleAndSizePlaceholder') as string} className="w-full bg-base-300 border border-gray-600 rounded-lg p-2.5 text-sm text-gray-200 placeholder-gray-500" />
                            </div>

                            <div className="border-t border-base-300 my-4"></div>

                             <TagInput
                               label={t('characterWorkshop.actionDnaSection') as string}
                               description={t('characterWorkshop.actionDnaDescription') as string}
                               tags={actionDNA}
                               onTagsChange={setActionDNA}
                               placeholder={t('characterWorkshop.actionDnaPlaceholder') as string}
                            />
                        </div>
                    </div>
                </div>
            </main>
            <footer className="flex-shrink-0 bg-base-200/80 backdrop-blur-sm border-t border-base-300 w-full sticky bottom-0 z-10">
                <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 flex items-center justify-end h-20">
                     <div className="flex items-center gap-4">
                        <button onClick={onClose} className="px-6 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-200 bg-base-300 hover:bg-gray-700 transition-colors">
                            {t('closeButton') as string}
                        </button>
                        <button onClick={handleSave} className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors">
                            {(initialCharacter ? t('characterWorkshop.updateButton') : t('characterWorkshop.saveButton')) as string}
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
};
