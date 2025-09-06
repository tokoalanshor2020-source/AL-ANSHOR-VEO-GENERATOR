import React, { useState, useEffect, useCallback } from 'react';
import type { Character, ImageFile } from '../../types';
import { useLocalization } from '../../i18n';
import { developCharacter, generateActionDna } from '../../services/storyCreatorService';
import { UploadIcon } from '../icons/UploadIcon';
import { TagInput } from './TagInput';
import { FailoverParams } from '../../services/geminiService';

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

export const CharacterWorkshopModal: React.FC<CharacterWorkshopModalProps> = ({ isOpen, onClose, onSave, initialCharacter, activeApiKey, allStoryApiKeys, onStoryKeyUpdate }) => {
    const { t } = useLocalization();
    
    const [isProcessingAi, setIsProcessingAi] = useState(false);
    
    const [imageFile, setImageFile] = useState<ImageFile | null>(null);
    const [idea, setIdea] = useState('');

    const [brandName, setBrandName] = useState('');
    const [modelName, setModelName] = useState('');
    const [consistencyKey, setConsistencyKey] = useState('');
    const [material, setMaterial] = useState('');
    const [designLanguage, setDesignLanguage] = useState('');
    const [keyFeatures, setKeyFeatures] = useState<string[]>([]);
    const [actionDNA, setActionDNA] = useState<string[]>([]);

    const resetForm = useCallback(() => {
        setImageFile(prevFile => {
            if (prevFile?.previewUrl) {
                URL.revokeObjectURL(prevFile.previewUrl);
            }
            return null;
        });
        setIdea('');
        setBrandName(initialCharacter?.brandName || '');
        setModelName(initialCharacter?.modelName || '');
        setConsistencyKey(initialCharacter?.consistency_key || '');
        setMaterial(initialCharacter?.material || '');
        setDesignLanguage(initialCharacter?.designLanguage || '');
        setKeyFeatures(initialCharacter?.keyFeatures || []);
        setActionDNA(initialCharacter?.actionDNA || []);
    }, [initialCharacter]);

    useEffect(() => {
        if (isOpen) {
            resetForm();
        }
    }, [isOpen, resetForm]);
    
    const handleImageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64 = (e.target?.result as string).split(',')[1];
                const previewUrl = URL.createObjectURL(file);
                
                setImageFile(prevFile => {
                    if (prevFile?.previewUrl) {
                        URL.revokeObjectURL(prevFile.previewUrl);
                    }
                    return { base64, mimeType: file.type, previewUrl };
                });
            };
            reader.readAsDataURL(file);
            event.target.value = ''; // Allow re-uploading the same file
        }
    }, []);

    const getFailoverParams = (): FailoverParams => ({
        allKeys: allStoryApiKeys,
        activeKey: activeApiKey,
        onKeyUpdate: onStoryKeyUpdate,
    });

    const handleDesignWithAi = async () => {
        if (!activeApiKey) return;
        if (!imageFile && !idea.trim()) {
            alert(t('characterWorkshop.alertUploadOrDescribe'));
            return;
        }

        setIsProcessingAi(true);
        try {
            const failoverParams = getFailoverParams();
            const devData = await developCharacter(failoverParams, {
                idea,
                imageBase64: imageFile?.base64 ?? null,
                imageType: imageFile?.mimeType ?? null,
            });
            setBrandName(devData.brand_name);
            setModelName(devData.model_name);
            setConsistencyKey(devData.consistency_key);
            setMaterial(devData.material);
            setDesignLanguage(devData.design_language);
            setKeyFeatures(devData.key_features);
            
            // Also generate action DNA
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
        };
        onSave(finalCharacter);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed top-16 inset-x-0 bottom-0 bg-base-100 z-40 flex flex-col font-sans" role="dialog" aria-modal="true">
            {/* Main scrollable content */}
            <main className="flex-grow overflow-y-auto bg-base-100">
                <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        
                        {/* AI Assistant Section (Left, Sticky) */}
                        <div className="lg:sticky lg:top-8">
                             <div className="bg-base-200 p-6 rounded-lg border border-base-300">
                                <h3 className="font-semibold text-lg text-gray-200">{t('characterWorkshop.aiAssistantSection') as string}</h3>
                                <p className="text-xs text-gray-400 mb-3">{t('characterWorkshop.aiAssistantDescription') as string}</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <input type="file" id="charImageInput" className="hidden" accept="image/*" onChange={handleImageChange} />
                                        <label htmlFor="charImageInput" className="cursor-pointer w-full flex flex-col items-center justify-center p-4 rounded-lg bg-base-300/50 border-2 border-dashed border-gray-600 min-h-[100px] hover:border-brand-primary transition-colors">
                                            {imageFile ? <img src={imageFile.previewUrl} alt="Preview" className="max-h-24 object-contain rounded"/> : <UploadIcon className="h-8 w-8 text-gray-500" />}
                                            <span className="text-sm mt-2 text-gray-400">{imageFile ? "Change Image" : t('characterWorkshop.uploadButton') as string}</span>
                                        </label>
                                    </div>
                                    <textarea value={idea} onChange={e => setIdea(e.target.value)} placeholder={t('characterWorkshop.ideaPlaceholder') as string} className="w-full h-full bg-base-300 border border-gray-600 rounded-lg p-3 text-sm text-gray-200 placeholder-gray-500" rows={4}></textarea>
                                </div>
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

                        {/* Manual Entry Section (Right, Scrollable) */}
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
             {/* Footer */}
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