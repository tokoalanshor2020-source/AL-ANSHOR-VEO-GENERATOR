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
    const statusMap = {
        valid: { text: 'VALID', className: 'bg-green-500/20 text-green-300 ring-green-500/30' },
        invalid: { text: 'INVALID', className: 'bg-red-500/20 text-red-300 ring-red-500/30' },
        checking: { text: 'CHECKING...', className: 'bg-yellow-500/20 text-yellow-300 ring-yellow-500/30 animate-pulse' },
        unchecked: { text: 'UNCHECKED', className: 'bg-gray-500/20 text-gray-400 ring-gray-500/30' }
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
            <button
                onClick={onDelete}
                className="text-gray-500 hover:text-red-400 transition-colors"
                aria-label={`Delete key ${displayKey}`}
            >
                <TrashIcon className="h-5 w-5" />
            </button>
        </li>
    )
}

export const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ keyType, currentKeys, activeKey, onKeysChange, onActiveKeyChange, onClose }) => {
  const [newKey, setNewKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLocalization();

  const [keyStatuses, setKeyStatuses] = useState<{ [key: string]: KeyStatus }>({});

  const runAllValidations = useCallback(async () => {
    const initialStatuses: { [key: string]: KeyStatus } = {};
    currentKeys.forEach(key => { initialStatuses[key] = 'checking'; });
    setKeyStatuses(initialStatuses);
    
    const validationPromises = currentKeys.map(async (key) => {
        const isValid = await validateApiKey(key);
        return { key, status: isValid ? 'valid' : 'invalid' } as const;
    });

    for await (const result of validationPromises) {
         setKeyStatuses(prev => ({ ...prev, [result.key]: result.status }));
    }
   }, [currentKeys]);
   
   useEffect(() => {
        if(currentKeys.length > 0){
            runAllValidations();
        }
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [currentKeys]);


  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedKey = newKey.trim();
    if (!trimmedKey) {
        setError(t('errorKeyEmpty') as string);
        return;
    }
    if (currentKeys.includes(trimmedKey)) {
        setError(t('errorKeyExists') as string);
        return;
    }

    setIsValidating(true);
    setKeyStatuses(prev => ({ ...prev, [trimmedKey]: 'checking' }));
    const isValid = await validateApiKey(trimmedKey);
    setIsValidating(false);

    setKeyStatuses(prev => ({ ...prev, [trimmedKey]: isValid ? 'valid' : 'invalid' }));

    if (isValid) {
        const updatedKeys = [...currentKeys, trimmedKey];
        onKeysChange(updatedKeys);
        if (!activeKey) {
            onActiveKeyChange(trimmedKey);
        }
        setNewKey('');
    } else {
        setError(t('errorKeyInvalid') as string);
    }
  };
  
  const handleDeleteKey = (keyToDelete: string) => {
    const updatedKeys = currentKeys.filter(k => k !== keyToDelete);
    onKeysChange(updatedKeys);
     setKeyStatuses(prev => {
        const newStatuses = { ...prev };
        delete newStatuses[keyToDelete];
        return newStatuses;
    });
    if (activeKey === keyToDelete) {
        const newActiveKey = updatedKeys.length > 0 ? updatedKeys.find(k => keyStatuses[k] === 'valid') || updatedKeys[0] : null;
        onActiveKeyChange(newActiveKey);
    }
  }

  // FIX: Cast results of t() to string
  const title = t(keyType === 'story' ? 'storyApiKeyManagerTitle' : 'videoApiKeyManagerTitle') as string;
  const addNewKeyLabel = t(keyType === 'story' ? 'addNewStoryKeyLabel' : 'addNewVideoKeyLabel') as string;
  const savedKeysLabel = t(keyType === 'story' ? 'savedStoryKeysLabel' : 'savedVideoKeysLabel') as string;


  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
      <div className="bg-base-200 rounded-2xl shadow-2xl w-full max-w-md border border-base-300 transform transition-all">
        <div className="flex items-center justify-between p-4 border-b border-base-300">
            <div className="flex items-center gap-3">
                <KeyIcon className="h-6 w-6 text-brand-light" />
                <h2 className="text-lg font-semibold text-gray-100">{title}</h2>
            </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <h3 className="text-sm font-medium text-gray-300">{addNewKeyLabel}</h3>
            <form onSubmit={handleAddKey} className="flex items-start gap-2">
                <div className="flex-grow">
                    <input
                    type="password"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder={t('apiKeyInputPlaceholder') as string}
                    className="block w-full bg-base-300 border-gray-600 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm text-gray-200 placeholder-gray-500"
                    />
                    {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
                </div>
                <button
                    type="submit"
                    disabled={isValidating}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base-200 focus:ring-brand-secondary disabled:bg-base-300 disabled:cursor-not-allowed transition-colors"
                >
                    {/* FIX: Cast result of t() to string */}
                    {(isValidating ? t('validatingButton') : t('addKeyButton')) as string}
                </button>
            </form>

            <div className="border-t border-base-300 my-4"></div>

            <div>
                 <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium text-gray-300">{savedKeysLabel}</h3>
                    <button onClick={runAllValidations} className="text-xs font-semibold py-1 px-3 rounded-lg bg-base-300 hover:bg-gray-700">Re-validate All</button>
                </div>
                 {currentKeys.length > 0 ? (
                    <ul className="space-y-2">
                        {currentKeys.map(key => (
                           <ApiKeyItem 
                             key={key}
                             apiKey={key}
                             isActive={key === activeKey}
                             status={keyStatuses[key] || 'unchecked'}
                             onSelect={() => onActiveKeyChange(key)}
                             onDelete={() => handleDeleteKey(key)}
                           />
                        ))}
                    </ul>
                 ) : (
                    <div className="text-center text-sm text-gray-500 py-4 bg-base-300 rounded-lg">
                        {/* FIX: Cast result of t() to string */}
                        <p>{t('noKeysSaved') as string}</p>
                        {/* FIX: Cast result of t() to string */}
                        <p>{t('addKeyPrompt') as string}</p>
                    </div>
                 )}
            </div>
        </div>

        <div className="bg-base-300/50 p-4 text-right rounded-b-2xl">
            <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-200 bg-base-300 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base-200 focus:ring-brand-secondary transition-colors"
            >
                {/* FIX: Cast result of t() to string */}
                {t('closeButton') as string}
            </button>
        </div>
      </div>
    </div>
  );
};