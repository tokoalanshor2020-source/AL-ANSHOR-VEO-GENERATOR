import React, { useState, useEffect, useCallback } from 'react';
import type { Character, ImageFile } from '../../types';
import { useLocalization } from '../../i18n';
import { developCharacter, generateActionDna, DevelopedCharacterData } from '../../services/storyCreatorService';
import { UploadIcon } from '../icons/UploadIcon';
import { XCircleIcon } from '../icons/XCircleIcon';

interface CharacterWorkshopModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (character: Character) => void;
    initialCharacter: Character | null;
    activeApiKey: string | null;
}

export const CharacterWorkshopModal: React.FC<CharacterWorkshopModalProps> = ({ isOpen, onClose, onSave, initialCharacter, activeApiKey }) => {
    const { t } = useLocalization();
    const [step, setStep] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Step 1 State
    const [imageFile, setImageFile] = useState<ImageFile | null>(null);
    const [idea, setIdea] = useState('');

    // Step 2 State
    const [tempDevChar, setTempDevChar] = useState<DevelopedCharacterData | null>(null);
    const [brandName, setBrandName] = useState('');
    const [modelName, setModelName] = useState('');
    const [consistencyKey, setConsistencyKey] = useState('');
    const [material, setMaterial] = useState('');
    const [designLanguage, setDesignLanguage] = useState('');
    const [keyFeatures, setKeyFeatures] = useState<string[]>([]);
    
    // Step 3 State
    const [actionDnaSuggestions, setActionDnaSuggestions] = useState<string[]>([]);
    const [selectedActionDna, setSelectedActionDna] = useState<string[]>([]);
    const [customAction, setCustomAction] = useState('');

    useEffect(() => {
        if (initialCharacter) {
            setBrandName(initialCharacter.brandName);
            setModelName(initialCharacter.modelName);
            setConsistencyKey(initialCharacter.consistency_key);
            setMaterial(initialCharacter.material);
            setDesignLanguage(initialCharacter.designLanguage);
            setKeyFeatures(initialCharacter.keyFeatures);
            setSelectedActionDna(initialCharacter.actionDNA);
            // When editing, we skip step 1 and go directly to step 2
            setStep(2);
        }
    }, [initialCharacter]);
    
    const handleImageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64 = (e.target?.result as string).split(',')[1];
                setImageFile({ base64, mimeType: file.type, previewUrl: URL.createObjectURL(file) });
            };
            reader.readAsDataURL(file);
        }
    }, []);

    const handleDevelopCharacter = async () => {
        if (!activeApiKey) return;
        if (!imageFile && !idea.trim()) {
            alert(t('characterWorkshop.alertUploadOrDescribe'));
            return;
        }

        setIsProcessing(true);
        try {
            const result = await developCharacter(activeApiKey, {
                idea,
                imageBase64: imageFile?.base64 ?? null,
                imageType: imageFile?.mimeType ?? null,
            });
            setTempDevChar(result);
            setBrandName(result.brand_name);
            setModelName(result.model_name);
            setConsistencyKey(result.consistency_key);
            setMaterial(result.material);
            setDesignLanguage(result.design_language);
            setKeyFeatures(result.key_features);
            setStep(2);
        } catch (e) {
            alert(e instanceof Error ? e.message : 'An unknown error occurred');
        } finally {
            setIsProcessing(false);
        }
    };
    
     const handleGenerateActionDna = async (devChar: DevelopedCharacterData) => {
        if (!activeApiKey) return;
        setIsProcessing(true);
        try {
            const suggestions = await generateActionDna(activeApiKey, devChar);
            setActionDnaSuggestions(suggestions);
        } catch (e) {
            console.error("Failed to generate action DNA", e);
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleNext = () => {
        if (step === 2 && tempDevChar) {
            setStep(3);
            if (!initialCharacter) { // Only generate suggestions for new characters
                 handleGenerateActionDna(tempDevChar);
            }
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
            actionDNA: selectedActionDna,
        };
        onSave(finalCharacter);
    };

    if (!isOpen) return null;

    return (
         <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-base-200 rounded-2xl shadow-2xl w-full max-w-2xl border border-base-300 max-h-[90vh] flex flex-col">
                <h2 className="text-2xl font-bold text-amber-400 p-6 text-center flex-shrink-0">
                    {initialCharacter ? t('characterWorkshop.titleEdit') : t('characterWorkshop.titleCreate')}
                </h2>

                <div className="flex-grow overflow-y-auto px-6 space-y-4">
                    {/* Step 1 */}
                    {step === 1 && (
                        <div>
                            <p className="text-center text-gray-400 mb-4 text-sm">{t('characterWorkshop.step1Title')}</p>
                            <input type="file" id="charImageInput" className="hidden" accept="image/*" onChange={handleImageChange} />
                            <div className="w-full p-2 rounded-lg bg-base-300/50 mb-4 flex items-center justify-center text-gray-500 border-2 border-dashed border-gray-600 min-h-[100px]">
                                {imageFile ? <img src={imageFile.previewUrl} alt="Preview" className="max-h-40 object-contain"/> : <span>{t('characterWorkshop.imagePreview')}</span>}
                            </div>
                            <label htmlFor="charImageInput" className="cursor-pointer w-full inline-flex justify-center py-2 px-4 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-base-300 hover:bg-gray-700 mb-4">
                                {t('characterWorkshop.uploadButton')}
                            </label>
                            <textarea value={idea} onChange={e => setIdea(e.target.value)} placeholder={t('characterWorkshop.ideaPlaceholder') as string} className="w-full bg-base-300 border border-gray-600 rounded-lg p-3 text-gray-200" rows={2}></textarea>
                        </div>
                    )}
                    
                    {/* Step 2 */}
                    {step === 2 && (
                         <div>
                            <p className="text-center text-gray-400 mb-4 text-sm">{t('characterWorkshop.step2Title')}</p>
                            <div className="space-y-4">
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-300 mb-1">{t('characterWorkshop.brandName')}</label>
                                        <input type="text" value={brandName} onChange={e => setBrandName(e.target.value)} className="w-full bg-base-300 border border-gray-600 rounded-lg p-3" />
                                    </div>
                                     <div>
                                        <label className="block text-sm font-semibold text-gray-300 mb-1">{t('characterWorkshop.modelName')}</label>
                                        <input type="text" value={modelName} onChange={e => setModelName(e.target.value)} className="w-full bg-base-300 border border-gray-600 rounded-lg p-3" />
                                    </div>
                               </div>
                               <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-1">{t('characterWorkshop.consistencyId')}</label>
                                    <input type="text" value={consistencyKey} onChange={e => setConsistencyKey(e.target.value)} className="w-full bg-base-300 border border-gray-600 rounded-lg p-3" />
                                    <p className="text-xs text-gray-500 mt-1">{t('characterWorkshop.consistencyIdHint')}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-1">{t('characterWorkshop.mainMaterial')}</label>
                                    <input type="text" value={material} onChange={e => setMaterial(e.target.value)} className="w-full bg-base-300 border border-gray-600 rounded-lg p-3" />
                                </div>
                                <div>
                                     <label className="block text-sm font-semibold text-gray-300 mb-1">{t('characterWorkshop.designLanguage')}</label>
                                     <textarea value={designLanguage} onChange={e => setDesignLanguage(e.target.value)} className="w-full bg-base-300 border border-gray-600 rounded-lg p-3" rows={2}></textarea>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-1">{t('characterWorkshop.keyFeatures')}</label>
                                    <div className="space-y-2 p-3 bg-base-300/50 rounded-lg border border-gray-700">
                                        {keyFeatures.map((feature, index) => (
                                            <textarea key={index} value={feature} onChange={e => setKeyFeatures(kf => kf.map((item, i) => i === index ? e.target.value : item))} className="w-full bg-base-300 border border-gray-600 rounded-lg p-2 text-sm" rows={1}></textarea>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                     {/* Step 3 */}
                    {step === 3 && (
                         <div>
                            <p className="text-center text-gray-400 mb-4 text-sm">{t('characterWorkshop.step3Title')}</p>
                             <div className="mt-4">
                                <label className="block text-sm font-semibold text-gray-300 mb-2">{t('characterWorkshop.actionDnaSuggestions')}</label>
                                <div className="flex flex-wrap gap-2">
                                     {isProcessing && <div className="text-sm text-gray-400">Loading suggestions...</div>}
                                     {actionDnaSuggestions.map(suggestion => (
                                        <button key={suggestion} onClick={() => !selectedActionDna.includes(suggestion) && setSelectedActionDna(s => [...s, suggestion])} className="text-sm bg-base-300 text-gray-300 border border-gray-600 px-3 py-1 rounded-full hover:bg-gray-700 disabled:opacity-50" disabled={selectedActionDna.includes(suggestion)}>
                                            {suggestion}
                                        </button>
                                     ))}
                                </div>
                            </div>
                            <div className="mt-4">
                                 <label className="block text-sm font-semibold text-gray-300 mb-1">{t('characterWorkshop.addCustomAction')}</label>
                                <div className="flex gap-2">
                                    <input type="text" value={customAction} onChange={e => setCustomAction(e.target.value)} placeholder={t('characterWorkshop.customActionPlaceholder') as string} className="w-full bg-base-300 border border-gray-600 rounded-lg p-2 text-sm" />
                                    <button onClick={() => { if(customAction.trim()) { setSelectedActionDna(s => [...s, customAction.trim()]); setCustomAction(''); } }} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-base-300 hover:bg-gray-700">{t('characterWorkshop.addButton')}</button>
                                </div>
                            </div>
                             <div className="mt-4">
                                 <label className="block text-sm font-semibold text-gray-300 mb-2">{t('characterWorkshop.selectedActionDna')}</label>
                                <div className="flex flex-wrap gap-2 p-2 bg-base-300/50 rounded-lg border border-gray-700 min-h-[40px]">
                                    {selectedActionDna.map(dna => (
                                        <span key={dna} className="bg-orange-600 text-white text-sm font-medium px-3 py-1 rounded-full flex items-center gap-2">
                                            {dna}
                                            <button onClick={() => setSelectedActionDna(s => s.filter(item => item !== dna))} className="font-bold">&times;</button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-shrink-0 p-4 mt-4 border-t border-base-300">
                    <div className="flex justify-between items-center">
                        <button onClick={onClose} className="px-6 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-200 bg-base-300 hover:bg-gray-700">{t('closeButton')}</button>
                        <div className="flex gap-2">
                            {step > 1 && <button onClick={() => setStep(s => s - 1)} className="px-6 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-200 bg-base-300 hover:bg-gray-700">{t('characterWorkshop.backButton')}</button>}
                            
                            {step === 1 && <button onClick={handleDevelopCharacter} disabled={isProcessing} className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50">{isProcessing ? t('characterWorkshop.designingButton') : t('characterWorkshop.designButton')}</button>}
                            {step === 2 && <button onClick={handleNext} className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-dark">{t('characterWorkshop.nextButton')}</button>}
                            {step === 3 && <button onClick={handleSave} className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700">{initialCharacter ? t('characterWorkshop.updateButton') : t('characterWorkshop.saveButton')}</button>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
