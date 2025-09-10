import React, { useState, useCallback, useEffect } from 'react';
import { useLocalization } from '../../i18n';
import type { GeneratedPrompts, ReferenceFile } from '../../types';
import { FailoverParams } from '../../services/geminiService';
import { analyzeReferences } from '../../services/storyCreatorService';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { ChevronLeftIcon } from '../icons/ChevronLeftIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';

interface ReferenceIdeaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProceedToVideo: (prompt: string) => void;
    allApiKeys: string[];
    activeApiKey: string | null;
    onKeyUpdate: (key: string) => void;
}

const generateUUID = () => {
    if (window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const MAX_FILE_SIZE_MB = 25;
const MAX_VIDEO_DURATION_S = 10;

const CopyButton: React.FC<{ textToCopy: string }> = ({ textToCopy }) => {
    const { t } = useLocalization();
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button 
            onClick={handleCopy} 
            className="absolute top-2 right-2 text-xs font-semibold py-1 px-2 rounded-md bg-base-100/50 hover:bg-gray-700"
        >
            {/* FIX: Cast result of t() to string to match ReactNode type. */}
            {copied ? t('publishingKit.copiedButton') as string : t('publishingKit.copyButton') as string}
        </button>
    );
};

export const ReferenceIdeaModal: React.FC<ReferenceIdeaModalProps> = ({ isOpen, onClose, onProceedToVideo, allApiKeys, activeApiKey, onKeyUpdate }) => {
    const { t } = useLocalization();
    const [isProcessing, setIsProcessing] = useState(false);
    const [referenceFiles, setReferenceFiles] = useState<ReferenceFile[]>([]);
    const [currentFileIndex, setCurrentFileIndex] = useState(0);
    const [results, setResults] = useState<GeneratedPrompts | null>(null);
    const [error, setError] = useState<string | null>(null);

    const resetState = useCallback(() => {
        referenceFiles.forEach(file => URL.revokeObjectURL(file.previewUrl));
        setReferenceFiles([]);
        setCurrentFileIndex(0);
        setResults(null);
        setError(null);
        setIsProcessing(false);
    }, [referenceFiles]);

    const handleClose = () => {
        resetState();
        onClose();
    };
    
    useEffect(() => {
        return () => {
            referenceFiles.forEach(file => URL.revokeObjectURL(file.previewUrl));
        }
    }, [referenceFiles]);

    const validateAndAddFiles = useCallback(async (files: FileList) => {
        for (const file of Array.from(files)) {
            if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                alert(`File ${file.name} is too large. Max size is ${MAX_FILE_SIZE_MB}MB.`);
                continue;
            }
            const type = file.type.startsWith('video') ? 'video' : 'image';
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
             const reader = new FileReader();
             reader.onload = (e) => {
                const base64 = (e.target?.result as string).split(',')[1];
                const previewUrl = URL.createObjectURL(file);
                
                const newFile: ReferenceFile = {
                    id: generateUUID(), base64, mimeType: file.type, previewUrl, type, file
                };

                setReferenceFiles(prev => [...prev, newFile]);
            };
            reader.readAsDataURL(file);
        }
    }, []);

    const handleFilesChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            validateAndAddFiles(event.target.files);
            event.target.value = '';
        }
    }, [validateAndAddFiles]);
    
    const removeFile = (id: string) => {
        setReferenceFiles(prev => {
            const fileToRemove = prev.find(f => f.id === id);
            if (fileToRemove) {
                URL.revokeObjectURL(fileToRemove.previewUrl);
            }
            const newFiles = prev.filter(f => f.id !== id);
            
            if (newFiles.length === 0) {
                setCurrentFileIndex(0);
            } else if (currentFileIndex >= newFiles.length) {
                setCurrentFileIndex(newFiles.length - 1);
            }
            
            return newFiles;
        });
    };
    
    const goToPreviousFile = () => {
        setCurrentFileIndex(prev => (prev === 0 ? referenceFiles.length - 1 : prev - 1));
    };

    const goToNextFile = () => {
        setCurrentFileIndex(prev => (prev === referenceFiles.length - 1 ? 0 : prev + 1));
    };

    const handleAnalyze = async () => {
        if (!activeApiKey || referenceFiles.length === 0) return;
        setIsProcessing(true);
        setError(null);
        setResults(null);
        try {
            const failoverParams: FailoverParams = { allKeys: allApiKeys, activeKey: activeApiKey, onKeyUpdate };
            const generatedPrompts = await analyzeReferences(failoverParams, referenceFiles);
            setResults(generatedPrompts);
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
            setError(errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };
    
    if (!isOpen) return null;

    const currentFile = referenceFiles.length > 0 ? referenceFiles[currentFileIndex] : null;

    return (
        <div className="fixed top-16 inset-x-0 bottom-0 bg-base-100 z-20 flex flex-col font-sans" role="dialog" aria-modal="true">
            <header className="flex-shrink-0 bg-base-200/80 backdrop-blur-sm border-b border-base-300 w-full sticky top-0 z-10">
                 <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
                    <div>
                        <h2 className="text-xl font-bold text-purple-400">{t('referenceIdeaModal.title') as string}</h2>
                        <p className="text-sm text-gray-400">{t('referenceIdeaModal.description') as string}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={handleClose} className="px-6 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-200 bg-base-300 hover:bg-gray-700">
                            {t('closeButton') as string}
                        </button>
                    </div>
                </div>
            </header>
            <main className="flex-grow overflow-y-auto">
                 <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div className="lg:sticky lg:top-28 bg-base-200 p-6 rounded-lg border border-base-300 space-y-4">
                        <h3 className="font-semibold text-lg text-gray-200">{t('referenceIdeaModal.uploadArea') as string}</h3>
                        <input type="file" id="refFileInput" className="hidden" multiple accept="image/*,video/mp4,video/quicktime,video/webm" onChange={handleFilesChange} />
                         <div className="p-4 rounded-lg bg-base-300/50 border-2 border-dashed border-gray-600 min-h-[250px] flex flex-col justify-between">
                             {referenceFiles.length === 0 ? (
                                <label htmlFor="refFileInput" className="cursor-pointer flex-grow flex flex-col items-center justify-center p-2 rounded-lg text-center hover:bg-base-300/30 transition-colors">
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
                                <label htmlFor="refFileInput" className="cursor-pointer p-2 rounded-lg text-xs flex items-center gap-1 font-semibold text-brand-light hover:bg-brand-primary/20">
                                    <PlusIcon className="h-4 w-4"/> {t('characterWorkshop.uploadButton') as string}
                                </label>
                            </div>
                         </div>
                         <button onClick={handleAnalyze} disabled={isProcessing || referenceFiles.length === 0} className="w-full inline-flex justify-center items-center gap-2 px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50">
                            {(isProcessing ? t('referenceIdeaModal.analyzingButton') : t('referenceIdeaModal.analyzeButton')) as string}
                        </button>
                    </div>
                    <div className="bg-base-200 p-6 rounded-lg border border-base-300 space-y-4">
                         <h3 className="font-semibold text-lg text-gray-200">{t('referenceIdeaModal.resultsTitle') as string}</h3>
                         {error && <p className="text-red-400 text-sm bg-red-900/30 p-2 rounded-md">{error}</p>}
                         {!results && !isProcessing && (
                            <div className="text-center text-gray-500 py-10">
                                <p>{t('referenceIdeaModal.placeholder') as string}</p>
                            </div>
                         )}
                         {results && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-1">{t('referenceIdeaModal.simplePromptLabel') as string}</label>
                                    <div className="relative">
                                        <textarea readOnly value={results.simple_prompt} className="w-full h-40 bg-base-300 border border-gray-600 rounded-lg p-2.5 text-sm text-gray-200" />
                                        <CopyButton textToCopy={results.simple_prompt} />
                                    </div>
                                    <button onClick={() => onProceedToVideo(results.simple_prompt)} className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg">
                                        {t('referenceIdeaModal.useSimplePromptButton') as string}
                                    </button>
                                </div>
                                 <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-1">{t('referenceIdeaModal.jsonPromptLabel') as string}</label>
                                    <div className="relative">
                                        <textarea readOnly value={results.json_prompt} className="w-full h-64 bg-base-300 border border-gray-600 rounded-lg p-2.5 text-xs font-mono text-gray-200" />
                                         <CopyButton textToCopy={results.json_prompt} />
                                    </div>
                                     <button onClick={() => onProceedToVideo(results.json_prompt)} className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg">
                                        {t('referenceIdeaModal.useJsonPromptButton') as string}
                                    </button>
                                </div>
                            </div>
                         )}
                    </div>
                </div>
            </main>
        </div>
    );
};