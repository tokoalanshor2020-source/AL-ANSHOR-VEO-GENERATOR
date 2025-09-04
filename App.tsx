import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { VideoGeneratorForm } from './components/VideoGeneratorForm';
import { Loader } from './components/Loader';
import { VideoPlayer } from './components/VideoPlayer';
import { ApiKeyManager } from './components/ApiKeyManager';
import { StoryCreator } from './components/story-creator/StoryCreator';
import type { GeneratorOptions, Character, StoryboardScene, DirectingSettings, PublishingKitData } from './types';
import { generateVideo } from './services/geminiService';
import { useLocalization } from './i18n';

const STORY_API_KEYS_STORAGE_KEY = 'gemini-story-api-keys';
const ACTIVE_STORY_API_KEY_STORAGE_KEY = 'gemini-active-story-api-key';
const VIDEO_API_KEYS_STORAGE_KEY = 'gemini-video-api-keys';
const ACTIVE_VIDEO_API_KEY_STORAGE_KEY = 'gemini-active-video-api-key';

type AppView = 'story-creator' | 'video-generator';
type KeyManagerType = 'story' | 'video';

const initialDirectingSettings: DirectingSettings = {
    sceneStyleSet: 'standard_cinematic',
    locationSet: 'natural_outdoor',
    customLocation: '',
    weatherSet: 'sunny',
    cameraStyleSet: 'standard_cinematic',
    narratorLanguageSet: 'id',
    customNarratorLanguage: '',
};

export default function App() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [storyApiKeys, setStoryApiKeys] = useState<string[]>([]);
  const [activeStoryApiKey, setActiveStoryApiKey] = useState<string | null>(null);
  
  const [videoApiKeys, setVideoApiKeys] = useState<string[]>([]);
  const [activeVideoApiKey, setActiveVideoApiKey] = useState<string | null>(null);

  const [keyManagerConfig, setKeyManagerConfig] = useState<{ type: KeyManagerType } | null>(null);
  
  const { t, language, dir } = useLocalization();

  const [view, setView] = useState<AppView>('story-creator');
  const [promptForVideo, setPromptForVideo] = useState<string>('');
  
  // --- Lifted State from StoryCreator ---
  const [characters, setCharacters] = useState<Character[]>([]);
  const [storyboard, setStoryboard] = useState<StoryboardScene[]>([]);
  const [logline, setLogline] = useState('');
  const [scenario, setScenario] = useState('');
  const [sceneCount, setSceneCount] = useState(3);
  const [directingSettings, setDirectingSettings] = useState<DirectingSettings>(initialDirectingSettings);
  const [publishingKit, setPublishingKit] = useState<PublishingKitData | null>(null);


  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
  }, [language, dir]);

  useEffect(() => {
    // Load story keys
    try {
      const storedKeys = localStorage.getItem(STORY_API_KEYS_STORAGE_KEY);
      const storedActiveKey = localStorage.getItem(ACTIVE_STORY_API_KEY_STORAGE_KEY);
      const keys: string[] = storedKeys ? JSON.parse(storedKeys) : [];
      
      if (keys.length > 0) {
        setStoryApiKeys(keys);
        if (storedActiveKey && keys.includes(storedActiveKey)) {
          setActiveStoryApiKey(storedActiveKey);
        } else {
          const newActiveKey = keys[0];
          setActiveStoryApiKey(newActiveKey);
          localStorage.setItem(ACTIVE_STORY_API_KEY_STORAGE_KEY, newActiveKey);
        }
      }
    } catch (e) {
      console.error("Failed to parse Story API keys from localStorage", e);
      localStorage.removeItem(STORY_API_KEYS_STORAGE_KEY);
      localStorage.removeItem(ACTIVE_STORY_API_KEY_STORAGE_KEY);
    }
    
    // Load video keys
    try {
      const storedKeys = localStorage.getItem(VIDEO_API_KEYS_STORAGE_KEY);
      const storedActiveKey = localStorage.getItem(ACTIVE_VIDEO_API_KEY_STORAGE_KEY);
      const keys: string[] = storedKeys ? JSON.parse(storedKeys) : [];
      
      if (keys.length > 0) {
        setVideoApiKeys(keys);
        if (storedActiveKey && keys.includes(storedActiveKey)) {
          setActiveVideoApiKey(storedActiveKey);
        } else {
          const newActiveKey = keys[0];
          setActiveVideoApiKey(newActiveKey);
          localStorage.setItem(ACTIVE_VIDEO_API_KEY_STORAGE_KEY, newActiveKey);
        }
      }
    } catch (e) {
      console.error("Failed to parse Video API keys from localStorage", e);
      localStorage.removeItem(VIDEO_API_KEYS_STORAGE_KEY);
      localStorage.removeItem(ACTIVE_VIDEO_API_KEY_STORAGE_KEY);
    }
  }, []);
  
  const handleSetStoryApiKeys = (keys: string[]) => {
    setStoryApiKeys(keys);
    localStorage.setItem(STORY_API_KEYS_STORAGE_KEY, JSON.stringify(keys));
  };

  const handleSetActiveStoryApiKey = (key: string | null) => {
    setActiveStoryApiKey(key);
    if (key) {
      localStorage.setItem(ACTIVE_STORY_API_KEY_STORAGE_KEY, key);
    } else {
      localStorage.removeItem(ACTIVE_STORY_API_KEY_STORAGE_KEY);
    }
    if(key) setKeyManagerConfig(null)
  };

  const handleSetVideoApiKeys = (keys: string[]) => {
    setVideoApiKeys(keys);
    localStorage.setItem(VIDEO_API_KEYS_STORAGE_KEY, JSON.stringify(keys));
  };

  const handleSetActiveVideoApiKey = (key: string | null) => {
    setActiveVideoApiKey(key);
    if (key) {
      localStorage.setItem(ACTIVE_VIDEO_API_KEY_STORAGE_KEY, key);
    } else {
      localStorage.removeItem(ACTIVE_VIDEO_API_KEY_STORAGE_KEY);
    }
     if(key) setKeyManagerConfig(null)
  };

  const handleGenerateVideo = useCallback(async (options: GeneratorOptions) => {
    if (!activeVideoApiKey) {
      setError(t('alertSetVideoApiKey') as string);
      setKeyManagerConfig({type: 'video'});
      return;
    }

    setIsLoading(true);
    setError(null);
    setVideoUrl(null);
    setPromptForVideo(options.prompt);

    try {
      const url = await generateVideo(activeVideoApiKey, options);
      setVideoUrl(url);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [activeVideoApiKey, t]);
  
  const handleProceedToVideoGenerator = (prompt: string) => {
    setPromptForVideo(prompt);
    setView('video-generator');
    window.scrollTo(0, 0);
  };
  
  const handleBackToStoryCreator = () => {
    setVideoUrl(null);
    setError(null);
    // Do not reset promptForVideo, it's tied to the video generator view
    setView('story-creator');
    window.scrollTo(0, 0);
  };

  const handleNewStoryReset = () => {
      setLogline('');
      setScenario('');
      setSceneCount(3);
      setStoryboard([]);
      setDirectingSettings(initialDirectingSettings);
      setPublishingKit(null);
      setError(null);
  };
  
  const handleUpdateScene = (sceneIndex: number, updatedPrompts: Partial<Pick<StoryboardScene, 'blueprintPrompt' | 'cinematicPrompt'>>) => {
      setStoryboard(currentStoryboard =>
          currentStoryboard.map((scene, index) => {
              if (index === sceneIndex) {
                  return { ...scene, ...updatedPrompts };
              }
              return scene;
          })
      );
  };


  return (
    <div className="min-h-screen bg-base-100 font-sans text-gray-200">
      {keyManagerConfig && (
        <ApiKeyManager
          keyType={keyManagerConfig.type}
          currentKeys={keyManagerConfig.type === 'story' ? storyApiKeys : videoApiKeys}
          activeKey={keyManagerConfig.type === 'story' ? activeStoryApiKey : activeVideoApiKey}
          onKeysChange={keyManagerConfig.type === 'story' ? handleSetStoryApiKeys : handleSetVideoApiKeys}
          onActiveKeyChange={keyManagerConfig.type === 'story' ? handleSetActiveStoryApiKey : handleSetActiveVideoApiKey}
          onClose={() => setKeyManagerConfig(null)}
        />
      )}
      
      <header className="sticky top-0 z-30 w-full border-b border-base-300 bg-base-100/90 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Header 
              onManageStoryKeysClick={() => setKeyManagerConfig({ type: 'story' })} 
              onManageVideoKeysClick={() => setKeyManagerConfig({ type: 'video' })} 
            />
          </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 mt-8">
        {view === 'story-creator' && (
           <StoryCreator
              // Pass down all the state and setters
              activeStoryApiKey={activeStoryApiKey}
              onManageKeysClick={() => setKeyManagerConfig({ type: 'story' })}
              onProceedToVideo={handleProceedToVideoGenerator}
              characters={characters}
              setCharacters={setCharacters}
              storyboard={storyboard}
              setStoryboard={setStoryboard}
              logline={logline}
              setLogline={setLogline}
              scenario={scenario}
              setScenario={setScenario}
              sceneCount={sceneCount}
              setSceneCount={setSceneCount}
              directingSettings={directingSettings}
              setDirectingSettings={setDirectingSettings}
              onNewStory={handleNewStoryReset}
              onUpdateScene={handleUpdateScene}
              publishingKit={publishingKit}
              setPublishingKit={setPublishingKit}
           />
        )}

        {view === 'video-generator' && (
          <div>
              <button 
                onClick={handleBackToStoryCreator}
                className="mb-6 inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-base-300 hover:bg-brand-primary/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base-100 focus:ring-brand-secondary transition-colors"
              >
                  &larr; {t('backToStoryCreator')}
              </button>
            <div className="bg-base-200 p-6 sm:p-8 rounded-2xl shadow-2xl border border-base-300">
              <VideoGeneratorForm 
                isGenerating={isLoading} 
                onSubmit={handleGenerateVideo}
                hasActiveVideoApiKey={!!activeVideoApiKey}
                onManageKeysClick={() => setKeyManagerConfig({ type: 'video' })}
                initialPrompt={promptForVideo}
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
              <VideoPlayer videoUrl={videoUrl} prompt={promptForVideo} />
            )}
          </div>
        )}
      </main>
        
      <footer className="w-full mt-12 pb-8 text-center text-gray-500 text-sm">
        <p>Powered by Google's VEO & Gemini Models</p>
      </footer>
    </div>
  );
}
