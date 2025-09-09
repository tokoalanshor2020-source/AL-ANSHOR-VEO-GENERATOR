import React, { useState, useEffect, useCallback } from 'react';
import { validateApiKey } from '../services/apiKeyService';
import { XCircleIcon } from './icons/XCircleIcon';
import { KeyIcon } from './icons/KeyIcon';
import { TrashIcon } from './icons/TrashIcon';
import { useLocalization } from '../i18n';

type KeyManagerType = 'story' | 'video';
type KeyStatus = 'valid' | 'invalid' | 'checking' | 'unchecked';

interface ApiKeyManagerProps {
  keyType: KeyManagerType;
  currentKeys: string[];
  activeKey: string | null;
  onKeysChange: (keys: string[]) => void;
  onActiveKeyChange: (key: string | null) => void;
  onClose: () => void;
}

const StatusBadge: React.FC<{ status: KeyStatus }> = ({ status }) => {
    const { t } = useLocalization();
    const statusMap = {
        valid: { text: t('apiKeyStatuses.valid') as string, className: 'bg-green-500/20 text-green-300 ring-green-500/30' },
        invalid: { text: t('apiKeyStatuses.invalid') as string, className: 'bg-red-500/20 text-red-300 ring-red-500/30' },
        checking: { text: t('apiKeyStatuses.checking') as string, className: 'bg-yellow-500/20 text-yellow-300 ring-yellow-500/30 animate-pulse' },
        unchecked: { text: t('apiKeyStatuses.unchecked') as string, className: 'bg-gray-500/20 text-gray-400 ring-gray-500/30' }
    };
    const { text, className } = statusMap[status] || statusMap.unchecked;
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${className}`}>{text}</span>;
};


const ApiKeyItem: React.FC<{
    apiKey: string;
    isActive: boolean;
    status: KeyStatus;
    onSelect: () => void;
    onDelete: () => void;
}> = ({ apiKey, isActive, status, onSelect, onDelete }) => {
    const displayKey = `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
    return (
        <li className={`flex items-center justify-between p-3 bg-base-300 rounded-lg transition-all border ${isActive ? 'border-brand-primary' : 'border-transparent'}`}>
            <div className="flex items-center gap-3">
                 <input
                    type="radio"
                    name="active-api-key"
                    id={`key-${apiKey}`}
                    checked={isActive}
                    onChange={onSelect}
                    className="h-4 w-4 text-brand-primary bg-base-100 border-gray-500 focus:ring-brand-secondary"
                />
                <label htmlFor={`key-${apiKey}`} className="font-mono text-sm text-gray-300 cursor-pointer">
                    {displayKey}
                </label>
                 <StatusBadge status={status} />
            </div>
             <button onClick={onDelete} className="p-1 text-gray-500 hover:text-red-400" aria-label={`Delete key ${displayKey}`}>
                <TrashIcon className="h-4 w-4" />
            </button>
        </li>
    );
};

// FIX: This file was incomplete, causing an export error. The component has been fully implemented below.
export const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ keyType, currentKeys, activeKey, onKeysChange, onActiveKeyChange, onClose }) => {
    const { t } = useLocalization();
    const [newApiKey, setNewApiKey] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [keyStatuses, setKeyStatuses] = useState<Record<string, KeyStatus>>({});

    const validateAllKeys = useCallback(() => {
        currentKeys.forEach(async key => {
            setKeyStatuses(prev => ({ ...prev, [key]: 'checking' }));
            const isValid = await validateApiKey(key);
            setKeyStatuses(prev => ({ ...prev, [key]: isValid ? 'valid' : 'invalid' }));
        });
    }, [currentKeys]);

    useEffect(() => {
        const initialStatuses: Record<string, KeyStatus> = {};
        currentKeys.forEach(key => {
            initialStatuses[key] = 'unchecked';
        });
        setKeyStatuses(initialStatuses);
        
        if (currentKeys.length > 0) {
            validateAllKeys();
        }
    }, [currentKeys, validateAllKeys]);
    
    const handleAddKey = async () => {
        const trimmedKey = newApiKey.trim();
        if (!trimmedKey) {
            setError(t('errorKeyEmpty') as string);
            return;
        }
        if (currentKeys.includes(trimmedKey)) {
            setError(t('errorKeyExists') as string);
            setNewApiKey('');
            return;
        }

        setIsAdding(true);
        setError(null);
        setKeyStatuses(prev => ({...prev, [trimmedKey]: 'checking'}));

        const isValid = await validateApiKey(trimmedKey);
        if (isValid) {
            const newKeys = [...currentKeys, trimmedKey];
            onKeysChange(newKeys);
            if (currentKeys.length === 0) {
                onActiveKeyChange(trimmedKey);
            }
            setKeyStatuses(prev => ({...prev, [trimmedKey]: 'valid'}));
            setNewApiKey('');
        } else {
            setError(t('errorKeyInvalid') as string);
            setKeyStatuses(prev => ({...prev, [trimmedKey]: 'invalid'}));
        }

        setIsAdding(false);
    };

    const handleSelectKey = (key: string) => {
        onActiveKeyChange(key);
    };

    const handleDeleteKey = (keyToDelete: string) => {
        const newKeys = currentKeys.filter(k => k !== keyToDelete);
        onKeysChange(newKeys);

        setKeyStatuses(prev => {
            const newStatuses = {...prev};
            delete newStatuses[keyToDelete];
            return newStatuses;
        });

        if (activeKey === keyToDelete) {
            onActiveKeyChange(newKeys.length > 0 ? newKeys[0] : null);
        }
    };

    const title = keyType === 'story' ? t('storyApiKeyManagerTitle') : t('videoApiKeyManagerTitle');
    const addNewKeyLabel = keyType === 'story' ? t('addNewStoryKeyLabel') : t('addNewVideoKeyLabel');
    const savedKeysLabel = keyType === 'story' ? t('savedStoryKeysLabel') : t('savedVideoKeysLabel');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
            <div className="bg-base-200 rounded-2xl shadow-2xl w-full max-w-lg border border-base-300 transform transition-all">
                <div className="flex items-center justify-between p-4 border-b border-base-300">
                    <h3 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                        <KeyIcon className="h-5 w-5" />
                        {title as string}
                    </h3>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-white">
                        <XCircleIcon className="h-6 w-6" />
                    </button>
                </div>
                
                <div className="p-6 space-y-6">
                    <div>
                        <label htmlFor="new-api-key" className="block text-sm font-semibold text-gray-300 mb-1">{addNewKeyLabel as string}</label>
                        <div className="flex gap-2">
                            <input
                                id="new-api-key"
                                type="password"
                                value={newApiKey}
                                onChange={e => {
                                    setNewApiKey(e.target.value);
                                    setError(null);
                                }}
                                onKeyDown={e => e.key === 'Enter' && handleAddKey()}
                                placeholder={t('apiKeyInputPlaceholder') as string}
                                className="w-full bg-base-300 border border-gray-600 rounded-lg p-2.5 text-sm text-gray-200"
                            />
                            <button onClick={handleAddKey} disabled={isAdding} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-dark disabled:bg-gray-600">
                                {isAdding ? t('validatingButton') as string : t('addKeyButton') as string}
                            </button>
                        </div>
                        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                    </div>

                    <div>
                         <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold text-gray-300">{savedKeysLabel as string}</h4>
                            <button onClick={validateAllKeys} className="text-xs text-brand-light hover:underline">{t('revalidateAllButton') as string}</button>
                        </div>
                        {currentKeys.length > 0 ? (
                            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                {currentKeys.map(key => (
                                    <ApiKeyItem
                                        key={key}
                                        apiKey={key}
                                        isActive={key === activeKey}
                                        status={keyStatuses[key] || 'unchecked'}
                                        onSelect={() => handleSelectKey(key)}
                                        onDelete={() => handleDeleteKey(key)}
                                    />
                                ))}
                            </ul>
                        ) : (
                            <div className="text-center text-gray-500 bg-base-300 p-6 rounded-lg">
                                <p>{t('noKeysSaved') as string}</p>
                                <p className="text-sm">{t('addKeyPrompt') as string}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 bg-base-300/50 text-right border-t border-base-300">
                    <button onClick={onClose} className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-base-300 hover:bg-gray-700">
                        {t('closeButton') as string}
                    </button>
                </div>
            </div>
        </div>
    );
};
