import React, { useState, useEffect, useCallback } from 'react';
import type { Character, ImageFile } from '../../types';
import { useLocalization } from '../../i18n';
import { developCharacter, generateActionDna } from '../../services/storyCreatorService';
import { UploadIcon } from '../icons/UploadIcon';
import { TagInput } from './TagInput';

interface CharacterWorkshopModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (character: Character) => void;
    initialCharacter: Character | null;
    activeApiKey: string | null;
}

export const CharacterWorkshopModal: React.FC<CharacterWorkshopModalProps> = ({ isOpen, onClose, onSave, initialCharacter, activeApiKey }) => {
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
        setImageFile(null);
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
                if (imageFile?.previewUrl) {
                    URL.revokeObjectURL(imageFile.previewUrl);
                }
                setImageFile({ base64, mimeType: file.type, previewUrl });
            };
            reader.readAsDataURL(file);
            event.target.value = ''; // Allow re-uploading the same file
        }
    }, [imageFile]);

    const handleDesignWithAi = async () => {
        if (!activeApiKey) return;
        if (!imageFile && !idea.trim()) {
            alert(t('characterWorkshop.alertUploadOrDescribe'));
            return;
        }

        setIsProcessingAi(true);
        try {
            const devData = await developCharacter(activeApiKey, {
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
            const dnaSuggestions = await generateActionDna(activeApiKey, devData);
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
            id: initialCharacter?.id ?? crypto.randomUUID(),
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
         <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-base-200 rounded-2xl shadow-2xl w-full max-w-2xl border border-base-300 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 flex-shrink-0 text-center">
                    <h2 className="text-2xl font-bold text-amber-400">
                       {t('characterWorkshop.title')}
                    </h2>
                     <p className="text-sm text-gray-400 mt-1">{t('characterWorkshop.subtitle')}</p>
                </div>

                <div className="flex-grow overflow-y-auto px-6 space-y-6">
                    {/* AI Assistant Section */}
                    <div className="bg-base-300/40 p-4 rounded-lg border border-base-300">
                        <h3 className="font-semibold text-lg text-gray-200">{t('characterWorkshop.aiAssistantSection')}</h3>
                        <p className="text-xs text-gray-400 mb-3">{t('characterWorkshop.aiAssistantDescription')}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <input type="file" id="charImageInput" className="hidden" accept="image/*" onChange={handleImageChange} />
                                <label htmlFor="charImageInput" className="cursor-pointer w-full flex flex-col items-center justify-center p-4 rounded-lg bg-base-300/50 border-2 border-dashed border-gray-600 min-h-[100px] hover:border-brand-primary">
                                    {imageFile ? <img src={imageFile.previewUrl} alt="Preview" className="max-h-24 object-contain rounded"/> : <UploadIcon className="h-8 w-8 text-gray-500" />}
                                    <span className="text-sm mt-2 text-gray-400">{imageFile ? "Change Image" : t('characterWorkshop.uploadButton')}</span>
                                </label>
                            </div>
                            <textarea value={idea} onChange={e => setIdea(e.target.value)} placeholder={t('characterWorkshop.ideaPlaceholder') as string} className="w-full h-full bg-base-300 border border-gray-600 rounded-lg p-3 text-sm text-gray-200 placeholder-gray-500" rows={4}></textarea>
                        </div>
                         <button onClick={handleDesignWithAi} disabled={isProcessingAi || !activeApiKey} className="mt-3 w-full inline-flex justify-center items-center gap-2 px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50">
                            {isProcessingAi ? t('characterWorkshop.designingWithAiButton') : t('characterWorkshop.designWithAiButton')}
                        </button>
                    </div>

                    {/* Manual Entry Section */}
                     <div className="space-y-4 pb-4">
                        <h3 className="font-semibold text-lg text-gray-200">{t('characterWorkshop.modelDetailsSection')}</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-1">{t('characterWorkshop.brandName')}</label>
                                <input type="text" value={brandName} onChange={e => setBrandName(e.target.value)} className="w-full bg-base-300 border border-gray-600 rounded-lg p-2.5 text-sm text-gray-200 placeholder-gray-500" />
                            </div>
                             <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-1">{t('characterWorkshop.modelName')}</label>
                                <input type="text" value={modelName} onChange={e => setModelName(e.target.value)} className="w-full bg-base-300 border border-gray-600 rounded-lg p-2.5 text-sm text-gray-200 placeholder-gray-500" />
                            </div>
                       </div>
                       <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-1">{t('characterWorkshop.consistencyId')}</label>
                            <input type="text" value={consistencyKey} onChange={e => setConsistencyKey(e.target.value)} className="w-full bg-base-300 border border-gray-600 rounded-lg p-2.5 text-sm text-gray-200 placeholder-gray-500" />
                            <p className="text-xs text-gray-500 mt-1">{t('characterWorkshop.consistencyIdHint')}</p>
                        </div>
                         <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-1">{t('characterWorkshop.mainMaterial')}</label>
                            <input type="text" value={material} onChange={e => setMaterial(e.target.value)} className="w-full bg-base-300 border border-gray-600 rounded-lg p-2.5 text-sm text-gray-200 placeholder-gray-500" />
                        </div>
                        <div>
                             <label className="block text-sm font-semibold text-gray-300 mb-1">{t('characterWorkshop.designLanguage')}</label>
                             <textarea value={designLanguage} onChange={e => setDesignLanguage(e.target.value)} className="w-full bg-base-300 border border-gray-600 rounded-lg p-2.5 text-sm text-gray-200 placeholder-gray-500" rows={2}></textarea>
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

                <div className="flex-shrink-0 p-4 mt-4 border-t border-base-300 flex justify-between items-center">
                    <button onClick={onClose} className="px-6 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-200 bg-base-300 hover:bg-gray-700">{t('closeButton')}</button>
                    <button onClick={handleSave} className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700">
                        {initialCharacter ? t('characterWorkshop.updateButton') : t('characterWorkshop.saveButton')}
                    </button>
                </div>
            </div>
        </div>
    );
};
