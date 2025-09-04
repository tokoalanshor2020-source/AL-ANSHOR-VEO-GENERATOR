import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { VideoGeneratorForm } from './components/VideoGeneratorForm';
import { Loader } from './components/Loader';
import { VideoPlayer } from './components/VideoPlayer';
import { ApiKeyManager } from './components/ApiKeyManager';
import type { GeneratorOptions } from './types';
import { generateVideo } from './services/geminiService';
import { useLocalization } from './i18n';


const API_KEYS_STORAGE_KEY = 'gemini-api-keys';
const ACTIVE_API_KEY_STORAGE_KEY = 'gemini-active-api-key';

export default function App() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [promptForPlayer, setPromptForPlayer] = useState<string>('');
  
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [activeApiKey, setActiveApiKey] = useState<string | null>(null);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const { t, language, dir } = useLocalization();

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
  }, [language, dir]);

  useEffect(() => {
    try {
      const storedKeys = localStorage.getItem(API_KEYS_STORAGE_KEY);
      const storedActiveKey = localStorage.getItem(ACTIVE_API_KEY_STORAGE_KEY);
      const keys: string[] = storedKeys ? JSON.parse(storedKeys) : [];
      
      if (keys.length > 0) {
        setApiKeys(keys);
        if (storedActiveKey && keys.includes(storedActiveKey)) {
          setActiveApiKey(storedActiveKey);
        } else {
          const newActiveKey = keys[0];
          setActiveApiKey(newActiveKey);
          localStorage.setItem(ACTIVE_API_KEY_STORAGE_KEY, newActiveKey);
        }
      }
    } catch (e) {
      console.error("Failed to parse API keys from localStorage", e);
      localStorage.removeItem(API_KEYS_STORAGE_KEY);
      localStorage.removeItem(ACTIVE_API_KEY_STORAGE_KEY);
    }
  }, []);
  
  const handleSetApiKeys = (keys: string[]) => {
    setApiKeys(keys);
    localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(keys));
  };

  const handleSetActiveApiKey = (key: string | null) => {
    setActiveApiKey(key);
    if (key) {
      localStorage.setItem(ACTIVE_API_KEY_STORAGE_KEY, key);
    } else {
      localStorage.removeItem(ACTIVE_API_KEY_STORAGE_KEY);
    }
  };

  const handleGenerateVideo = useCallback(async (options: GeneratorOptions) => {
    if (!activeApiKey) {
      setError(t('alertSetApiKey') as string);
      setIsKeyModalOpen(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    setVideoUrl(null);
    setPromptForPlayer(options.prompt);

    try {
      const url = await generateVideo(activeApiKey, options);
      setVideoUrl(url);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [activeApiKey, t]);

  return (
    <div className="min-h-screen bg-base-100 font-sans text-gray-200">
      {isKeyModalOpen && (
        <ApiKeyManager
          currentKeys={apiKeys}
          activeKey={activeApiKey}
          onKeysChange={handleSetApiKeys}
          onActiveKeyChange={handleSetActiveApiKey}
          onClose={() => setIsKeyModalOpen(false)}
        />
      )}
      
      {/* Sticky Header */}
      <header className="sticky top-0 z-10 w-full border-b border-base-300 bg-base-100/90 backdrop-blur-sm">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <Header onManageKeysClick={() => setIsKeyModalOpen(true)} />
          </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
        <main className="mt-8">
          <div className="bg-base-200 p-6 sm:p-8 rounded-2xl shadow-2xl border border-base-300">
            <VideoGeneratorForm 
              isGenerating={isLoading} 
              onSubmit={handleGenerateVideo}
              hasActiveApiKey={!!activeApiKey}
              onManageKeysClick={() => setIsKeyModalOpen(true)}
            />
          </div>

          {isLoading && <Loader />}
          
          {error && (
            <div className="mt-8 bg-red-900/50 border border-red-700 text-red-200 p-4 rounded-lg text-center">
              <h3 className="font-bold text-lg">{t('generationFailed')}</h3>
              <p className="mt-1">{error}</p>
            </div>
          )}

          {videoUrl && !isLoading && (
            <VideoPlayer videoUrl={videoUrl} prompt={promptForPlayer} />
          )}
        </main>
        
        <footer className="w-full mt-12 pb-8 text-center text-gray-500 text-sm">
          <p>Powered by Google's VEO Model</p>
        </footer>
      </div>
    </div>
  );
}