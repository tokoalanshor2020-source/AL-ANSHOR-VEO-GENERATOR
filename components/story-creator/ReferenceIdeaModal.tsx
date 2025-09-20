import React, { useState, useCallback, useEffect } from 'react';
import { useLocalization } from '../../i18n';
import type { GeneratedPrompts, ReferenceFile, ReferenceIdeaState, StoredReferenceFile } from '../../types';
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
    referenceIdeaState: ReferenceIdeaState;
    setReferenceIdeaState: React.Dispatch<React.SetStateAction<ReferenceIdeaState>>;
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

export const ReferenceIdeaModal: React.FC<ReferenceIdeaModalProps> = ({ isOpen, onClose, onProceedToVideo, allApiKeys, activeApiKey, onKeyUpdate, referenceIdeaState, setReferenceIdeaState }) => {
    const { t } = useLocalization();
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [localReferenceFiles, setLocalReferenceFiles] = useState<ReferenceFile[]>([]);
    const [currentFileIndex, setCurrentFileIndex] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const { referenceFiles: storedFiles, results } = referenceIdeaState;

    const handleClose = () => {
        onClose();
    };
    
    useEffect(() => {
        let isMounted = true;
        
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

            const newLocalFiles = storedFiles.map(storedFile => {
                const dataUrl = `data:${storedFile.mimeType};base64,${storedFile.base64}`;
                const blob = dataURLtoBlob(dataUrl);
                const file = new File([blob], `reference.${storedFile.mimeType.split('/')[1]}`, { type: storedFile.mimeType });
                return {
                    ...storedFile,
                    previewUrl: URL.createObjectURL(file),
                    file,
                };
            });

            if (isMounted) {
                 setLocalReferenceFiles(newLocalFiles);
            }
        }
        
        return () => {
            isMounted = false;
            setLocalReferenceFiles(currentFiles => {
                currentFiles.forEach(file => URL.revokeObjectURL(file.previewUrl));
                return [];
            });
        };
    }, [isOpen, storedFiles]);
    
    const updateFiles = useCallback((updatedLocalFiles: ReferenceFile[]) => {
        setLocalReferenceFiles(updatedLocalFiles);
        const serializableFiles: StoredReferenceFile[] = updatedLocalFiles.map(f => ({
            id: f.id,
            base64: f.base64,
            mimeType: f.mimeType,
            type: f.type,
        }));
        setReferenceIdeaState(prev => ({ ...prev, referenceFiles: serializableFiles }));
    }, [setReferenceIdeaState]);

    const validateAndAddFiles = useCallback(async (files: FileList) => {
        const processFile = (file: File): Promise<ReferenceFile | null> => {
            return new Promise(async (resolve) => {
                if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                    alert(`File ${file.name} is too large. Max size is ${MAX_FILE_SIZE_MB}MB.`);
                    resolve(null);
                    return;
                }

                const type = file.type.startsWith('video') ? 'video' : 'image';

                if (type === 'video') {
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
                        id: generateUUID(), base64, mimeType: file.type, previewUrl, type, file
                    });
                };
                reader.onerror = () => {
                    alert(`Error reading file ${file.name}`);
                    resolve(null);
                };
                reader.readAsDataURL(file);
            });
        };

        const filePromises = Array.from(files).map(processFile);
        const newFiles = (await Promise.all(filePromises)).filter((f): f is ReferenceFile => f !== null);

        if (newFiles.length > 0) {
            updateFiles([...localReferenceFiles, ...newFiles]);
        }
    }, [localReferenceFiles, updateFiles]);


    const handleFilesChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            validateAndAddFiles(event.target.files);
            event.target.value = '';
        }
    }, [validateAndAddFiles]);
    
    const removeFile = (id: string) => {
        const newFiles = localReferenceFiles.filter(f => {
             if (f.id === id) {
                URL.revokeObjectURL(f.previewUrl);
                return false;
            }
            return true;
        });
        
        if (newFiles.length === 0) {
            setCurrentFileIndex(0);
        } else if (currentFileIndex >= newFiles.length) {
            setCurrentFileIndex(newFiles.length - 1);
        }
        
        updateFiles(newFiles);
    };
    
    const goToPreviousFile = () => {
        setCurrentFileIndex(prev => (prev === 0 ? localReferenceFiles.length - 1 : prev - 1));
    };

    const goToNextFile = () => {
        setCurrentFileIndex(prev => (prev === localReferenceFiles.length - 1 ? 0 : prev + 1));
    };

    const handleAnalyze = async () => {
        if (!activeApiKey || localReferenceFiles.length === 0) return;
        setIsProcessing(true);
        setError(null);
        setReferenceIdeaState(prev => ({ ...prev, results: null }));
        try {
            const failoverParams: FailoverParams = { allKeys: allApiKeys, activeKey: activeApiKey, onKeyUpdate };
            const generatedPrompts = await analyzeReferences(failoverParams, localReferenceFiles);
            setReferenceIdeaState(prev => ({ ...prev, results: generatedPrompts }));
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
            setError(errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };
    
    if (!isOpen) return null;

    const currentFile = localReferenceFiles.length > 0 ? localReferenceFiles[currentFileIndex] : null;

    return (
        <div className="fixed inset-0 bg-base-100 z-50 flex flex-col font-sans" role="dialog" aria-modal="true">
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
                 <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 pb-24 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div className="lg:sticky lg:top-28 bg-base-200 p-6 rounded-lg border border-base-300 space-y-4">
                        <h3 className="font-semibold text-lg text-gray-200">{t('referenceIdeaModal.uploadArea') as string}</h3>
                        
                        <input type="file" id="refFileInput" className="hidden" multiple accept="image/*,video/mp4,video/quicktime,video/webm" onChange={handleFilesChange} />
                        
                        <div className="p-4 rounded-lg bg-base-300/50 border-2 border-dashed border-gray-600 min-h-[180px] flex flex-col justify-between">
                            {localReferenceFiles.length === 0 ? (
                                <label htmlFor="refFileInput" className="cursor-pointer flex-grow flex flex-col items-center justify-center p-2 rounded-lg text-center hover:bg-base-300/30 transition-colors">
                                     <PlusIcon className="h-8 w-8 text-gray-400"/>
                                     <span className="text-sm mt-1 text-gray-400">{t('characterWorkshop.uploadButton') as string}</span>
                                </label>
                            ) : (
                                <div className="relative flex-grow flex items-center justify-center">
                                    {localReferenceFiles.length > 1 && (
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
                        
                                    {localReferenceFiles.length > 1 && (
                                        <button onClick={goToNextFile} className="absolute right-0 z-10 p-2 bg-base-200/50 rounded-full hover:bg-base-200 transition-colors" aria-label="Next file">
                                            <ChevronRightIcon />
                                        </button>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-700/50">
                                <div className="text-xs text-gray-500">
                                    {localReferenceFiles.length > 0 ? `${currentFileIndex + 1} / ${localReferenceFiles.length}` : t('characterWorkshop.fileTypes') as string}
                                </div>
                                <label htmlFor="refFileInput" className="cursor-pointer p-2 rounded-lg text-xs flex items-center gap-1 font-semibold text-brand-light hover:bg-brand-primary/20">
                                    <PlusIcon className="h-4 w-4"/> {t('characterWorkshop.uploadButton') as string}
                                </label>
                            </div>
                        </div>
                         <div className="mt-4">
                            <button onClick={handleAnalyze} disabled={isProcessing || !activeApiKey || localReferenceFiles.length === 0} className="w-full inline-flex justify-center items-center gap-2 px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed disabled:opacity-70 transition-colors">
                                {(isProcessing ? t('referenceIdeaModal.analyzingButton') : t('referenceIdeaModal.analyzeButton')) as string}
                            </button>
                            {!activeApiKey && (
                                <p className="text-xs text-yellow-400/80 text-center mt-2">
                                    {t('alertSetStoryApiKey') as string}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="bg-base-200 p-6 rounded-lg border border-base-300 space-y-4">
                        <h3 className="font-semibold text-lg text-gray-200">{t('referenceIdeaModal.resultsTitle') as string}</h3>
                        {error && <p className="text-red-400 text-center">{error}</p>}
                        {!results && !isProcessing && (
                            <div className="text-center text-gray-500 py-10">{t('referenceIdeaModal.placeholder') as string}</div>
                        )}
                        {isProcessing && <div className="text-center text-gray-400 py-10">{t('referenceIdeaModal.analyzingButton') as string}</div>}
                        {results && (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-1">{t('referenceIdeaModal.simplePromptLabel') as string}</label>
                                    <div className="relative">
                                        <pre className="p-3 bg-base-300 rounded-md text-sm text-gray-300 whitespace-pre-wrap font-mono min-h-[150px] overflow-auto">
                                            {results.simple_prompt}
                                        </pre>
                                        <CopyButton textToCopy={results.simple_prompt} />
                                    </div>
                                    <button 
                                        onClick={() => onProceedToVideo(results.simple_prompt)}
                                        className="mt-2 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg text-sm"
                                    >
                                        {t('referenceIdeaModal.useSimplePromptButton') as string}
                                    </button>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-1">{t('referenceIdeaModal.jsonPromptLabel') as string}</label>
                                     <div className="relative">
                                        <pre className="p-3 bg-base-300 rounded-md text-sm text-gray-300 whitespace-pre-wrap font-mono min-h-[150px] overflow-auto">
                                            {(() => {
                                                try {
                                                    return JSON.stringify(JSON.parse(results.json_prompt), null, 2);
                                                } catch {
                                                    return results.json_prompt;
                                                }
                                            })()}
                                        </pre>
                                        <CopyButton textToCopy={results.json_prompt} />
                                    </div>
                                    <button 
                                        onClick={() => onProceedToVideo(results.json_prompt)}
                                        className="mt-2 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg text-sm"
                                    >
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