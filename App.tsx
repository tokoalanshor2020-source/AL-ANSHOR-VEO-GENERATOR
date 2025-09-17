import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { VideoGeneratorForm } from './components/VideoGeneratorForm';
import { Loader } from './components/Loader';
import { VideoPlayer } from './components/VideoPlayer';
import { ApiKeyManager } from './components/ApiKeyManager';
import { StoryCreator } from './components/story-creator/StoryCreator';
import type { GeneratorOptions, Character, StoryboardScene, DirectingSettings, PublishingKitData, ActiveTab, VideoGeneratorState, ReferenceIdeaState } from './types';
import { generateVideo } from './services/geminiService';
import { useLocalization } from './i18n';
import { TutorialModal } from './components/TutorialModal';

const STORY_API_KEYS_STORAGE_KEY = 'gemini-story-api-keys';
const ACTIVE_STORY_API_KEY_STORAGE_KEY = 'gemini-active-story-api-key';
const VIDEO_API_KEYS_STORAGE_KEY = 'gemini-video-api-keys';
const ACTIVE_VIDEO_API_KEY_STORAGE_KEY = 'gemini-active-video-api-key';
const CHARACTERS_STORAGE_KEY = 'gemini-story-characters';
const STORY_CREATOR_SESSION_KEY = 'gemini-story-creator-session';
const VIDEO_GENERATOR_SESSION_KEY = 'gemini-video-generator-session';
const APP_VIEW_STORAGE_KEY = 'gemini-app-view';
const REFERENCE_IDEA_SESSION_KEY = 'gemini-reference-idea-session';


type AppView = 'story-creator' | 'video-generator';
type KeyManagerType = 'story' | 'video';

// FIX: Initialize all properties for the `DirectingSettings` type to resolve TypeScript error.
const initialDirectingSettings: DirectingSettings = {
    sceneStyleSet: 'standard_cinematic',
    customSceneStyle: '',
    locationSet: 'natural_outdoor',
    customLocation: '',
    weatherSet: 'sunny',
    customWeather: '',
    cameraStyleSet: 'standard_cinematic',
    customCameraStyle: '',
    narratorLanguageSet: 'id',
    customNarratorLanguage: '',
    timeOfDay: 'default',
    artStyle: 'hyper_realistic',
    soundtrackMood: 'epic_orchestral',
    pacing: 'normal',
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
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
  
  const { t, language, dir } = useLocalization();

  const [view, setView] = useState<AppView>(() => {
    try {
        const storedView = localStorage.getItem(APP_VIEW_STORAGE_KEY) as AppView;
        if (storedView === 'video-generator' || storedView === 'story-creator') {
            return storedView;
        }
    } catch (e) {
        console.error("Failed to load app view from localStorage", e);
        localStorage.removeItem(APP_VIEW_STORAGE_KEY);
    }
    return 'story-creator';
  });
  
  // State for video generator form, persisted to localStorage
  const [videoGeneratorState, setVideoGeneratorState] = useState<VideoGeneratorState>(() => {
    try {
        const storedSession = localStorage.getItem(VIDEO_GENERATOR_SESSION_KEY);
        if (storedSession) {
            return JSON.parse(storedSession);
        }
    } catch (e) {
        console.error("Failed to parse video generator session from localStorage", e);
        localStorage.removeItem(VIDEO_GENERATOR_SESSION_KEY);
    }
    return {
        prompt: '',
        imageFile: null,
        aspectRatio: '16:9',
        enableSound: true,
        resolution: '720p',
    };
  });
  
    // State for reference idea modal, persisted to localStorage
  const [referenceIdeaState, setReferenceIdeaState] = useState<ReferenceIdeaState>(() => {
    try {
        const storedSession = localStorage.getItem(REFERENCE_IDEA_SESSION_KEY);
        if (storedSession) {
            return JSON.parse(storedSession);
        }
    } catch (e) {
        console.error("Failed to parse reference idea session from localStorage", e);
        localStorage.removeItem(REFERENCE_IDEA_SESSION_KEY);
    }
    return {
        referenceFiles: [],
        results: null,
    };
  });
  
  // --- Lifted State from StoryCreator ---
  const [characters, setCharacters] = useState<Character[]>(() => {
    try {
        const storedCharacters = localStorage.getItem(CHARACTERS_STORAGE_KEY);
        return storedCharacters ? JSON.parse(storedCharacters) : [];
    } catch (e) {
        console.error("Failed to parse characters from localStorage", e);
        localStorage.removeItem(CHARACTERS_STORAGE_KEY);
        return [];
    }
  });

  const [initialSession] = useState(() => {
    try {
        const storedSession = localStorage.getItem(STORY_CREATOR_SESSION_KEY);
        if (storedSession) {
            return JSON.parse(storedSession);
        }
    } catch (e) {
        console.error("Failed to parse story session from localStorage", e);
        localStorage.removeItem(STORY_CREATOR_SESSION_KEY);
    }
    return {};
  });

  const [storyboard, setStoryboard] = useState<StoryboardScene[]>(initialSession.storyboard || []);
  const [logline, setLogline] = useState(initialSession.logline || '');
  const [scenario, setScenario] = useState(initialSession.scenario || '');
  const [sceneCount, setSceneCount] = useState(initialSession.sceneCount || 3);
  const [directingSettings, setDirectingSettings] = useState<DirectingSettings>(initialSession.directingSettings || initialDirectingSettings);
  const [publishingKit, setPublishingKit] = useState<PublishingKitData | null>(initialSession.publishingKit || null);
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialSession.activeTab || 'editor');
  const [isReferenceIdeaModalOpen, setIsReferenceIdeaModalOpen] = useState(initialSession.isReferenceIdeaModalOpen || false);


  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const promptId = urlParams.get('init_video_prompt_id');

    if (promptId) {
        try {
            const storedPrompt = sessionStorage.getItem(promptId);
            if (storedPrompt !== null) {
                setView('video-generator');
                setVideoGeneratorState(prevState => ({
                    ...prevState,
                    prompt: storedPrompt,
                    imageFile: null // Reset image when coming from storyboard
                }));
                sessionStorage.removeItem(promptId); // Clean up

                // Clean the URL to avoid re-triggering on refresh
                urlParams.delete('init_video_prompt_id');
                const newRelativeUrl = `${window.location.pathname}?${urlParams.toString()}`.replace(/\?$/, '');
                window.history.replaceState({}, document.title, newRelativeUrl);
            }
        } catch (e) {
            console.error("Failed to initialize video generator from session storage", e);
            setError("Could not load the prompt for this video generation tab.");
        }
    }
  }, []); // Run only on initial mount

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
  }, [language, dir]);

  useEffect(() => {
    // Save characters to localStorage whenever they change
    try {
        localStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify(characters));
    } catch(e) {
        console.error("Failed to save characters to localStorage", e);
    }
  }, [characters]);

   useEffect(() => {
    try {
        const sessionData = {
            logline,
            scenario,
            sceneCount,
            directingSettings,
            storyboard,
            publishingKit,
            activeTab,
            isReferenceIdeaModalOpen,
        };
        localStorage.setItem(STORY_CREATOR_SESSION_KEY, JSON.stringify(sessionData));
    } catch(e) {
        console.error("Failed to save story session to localStorage", e);
    }
  }, [logline, scenario, sceneCount, directingSettings, storyboard, publishingKit, activeTab, isReferenceIdeaModalOpen]);
  
   useEffect(() => {
    try {
        localStorage.setItem(APP_VIEW_STORAGE_KEY, view);
    } catch(e) {
        console.error("Failed to save app view to localStorage", e);
    }
  }, [view]);

  useEffect(() => {
    try {
        localStorage.setItem(VIDEO_GENERATOR_SESSION_KEY, JSON.stringify(videoGeneratorState));
    } catch(e) {
        console.error("Failed to save video generator session to localStorage", e);
    }
  }, [videoGeneratorState]);

  useEffect(() => {
    try {
        localStorage.setItem(REFERENCE_IDEA_SESSION_KEY, JSON.stringify(referenceIdeaState));
    } catch(e) {
        console.error("Failed to save reference idea session to localStorage", e);
    }
  }, [referenceIdeaState]);

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

  const handleSetActiveStoryApiKey = useCallback((key: string | null) => {
    setActiveStoryApiKey(key);
    if (key) {
      localStorage.setItem(ACTIVE_STORY_API_KEY_STORAGE_KEY, key);
    } else {
      localStorage.removeItem(ACTIVE_STORY_API_KEY_STORAGE_KEY);
    }
    if(key) setKeyManagerConfig(null)
  }, []);

  const handleSetVideoApiKeys = (keys: string[]) => {
    setVideoApiKeys(keys);
    localStorage.setItem(VIDEO_API_KEYS_STORAGE_KEY, JSON.stringify(keys));
  };

  const handleSetActiveVideoApiKey = useCallback((key: string | null) => {
    setActiveVideoApiKey(key);
    if (key) {
      localStorage.setItem(ACTIVE_VIDEO_API_KEY_STORAGE_KEY, key);
    } else {
      localStorage.removeItem(ACTIVE_VIDEO_API_KEY_STORAGE_KEY);
    }
     if(key) setKeyManagerConfig(null)
  }, []);

  const handleGenerateVideo = useCallback(async (options: GeneratorOptions) => {
    if (!activeVideoApiKey) {
// FIX: Cast result of t() to string
      setError(t('alertSetVideoApiKey') as string);
      setKeyManagerConfig({type: 'video'});
      return;
    }

    setIsLoading(true);
    setError(null);
    setVideoUrl(null);

    try {
      const url = await generateVideo({
        allKeys: videoApiKeys,
        activeKey: activeVideoApiKey,
        onKeyUpdate: handleSetActiveVideoApiKey,
        options: options,
      });
      setVideoUrl(url);
    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
// FIX: Cast result of t() to string
      const displayError = errorMessage === 'errorRateLimit' ? t('errorRateLimit') as string : errorMessage;
      setError(displayError as string);
    } finally {
      setIsLoading(false);
    }
  }, [activeVideoApiKey, videoApiKeys, handleSetActiveVideoApiKey, t]);
  
  const handleProceedToVideoGenerator = (prompt: string) => {
    const generateUUID = () => {
        if (window.crypto && window.crypto.randomUUID) {
            return window.crypto.randomUUID();
        }
        // Fallback for older browsers
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    };

    const promptId = `prompt-${generateUUID()}`;
    try {
        sessionStorage.setItem(promptId, prompt);
        const url = new URL(window.location.href);
        url.searchParams.set('init_video_prompt_id', promptId);
        window.open(url.toString(), '_blank');
    } catch (e) {
        console.error("Failed to open new tab for video generator", e);
        setError("Could not open a new tab. Please check your browser's pop-up blocker settings.");
    }
  };
  
  const handleBackToStoryCreator = () => {
    if (window.opener && !window.opener.closed) {
        window.close();
    } else {
        setVideoUrl(null);
        setError(null);
        setView('story-creator');
        window.scrollTo(0, 0);
    }
  };

  const handleNewStoryReset = () => {
      setLogline('');
      setScenario('');
      setSceneCount(3);
      setStoryboard([]);
      setDirectingSettings(initialDirectingSettings);
      setPublishingKit(null);
      setError(null);
      setActiveTab('editor');
      setIsReferenceIdeaModalOpen(false);
      try {
        localStorage.removeItem(STORY_CREATOR_SESSION_KEY);
      } catch (e) {
        console.error("Failed to clear story session from localStorage", e);
      }
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

      {isTutorialOpen && (
        <TutorialModal onClose={() => setIsTutorialOpen(false)} />
      )}
      
      <header className="sticky top-0 z-30 w-full border-b border-base-300 bg-base-100/90 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Header 
              onManageStoryKeysClick={() => setKeyManagerConfig({ type: 'story' })} 
              onManageVideoKeysClick={() => setKeyManagerConfig({ type: 'video' })} 
              onOpenTutorialClick={() => setIsTutorialOpen(true)}
            />
          </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 mt-8">
        {view === 'story-creator' && (
           <StoryCreator
              allStoryApiKeys={storyApiKeys}
              activeStoryApiKey={activeStoryApiKey}
              onStoryKeyUpdate={handleSetActiveStoryApiKey}
              allVideoApiKeys={videoApiKeys}
              activeVideoApiKey={activeVideoApiKey}
              onVideoKeyUpdate={handleSetActiveVideoApiKey}
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
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              referenceIdeaState={referenceIdeaState}
              setReferenceIdeaState={setReferenceIdeaState}
              isReferenceIdeaModalOpen={isReferenceIdeaModalOpen}
              setIsReferenceIdeaModalOpen={setIsReferenceIdeaModalOpen}
           />
        )}

        {view === 'video-generator' && (
          <div>
              <button 
                onClick={handleBackToStoryCreator}
                className="mb-6 inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-base-300 hover:bg-brand-primary/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base-100 focus:ring-brand-secondary transition-colors"
              >
{/* FIX: Cast result of t() to string */}
                  &larr; {t('backToStoryboard') as string}
              </button>
            <div className="bg-base-200 p-6 sm:p-8 rounded-2xl shadow-2xl border border-base-300">
              <VideoGeneratorForm 
                isGenerating={isLoading} 
                onSubmit={handleGenerateVideo}
                hasActiveVideoApiKey={!!activeVideoApiKey}
                onManageKeysClick={() => setKeyManagerConfig({ type: 'video' })}
                generatorState={videoGeneratorState}
                onStateChange={setVideoGeneratorState}
                characters={characters}
                allVideoApiKeys={videoApiKeys}
                activeVideoApiKey={activeVideoApiKey}
                onVideoKeyUpdate={handleSetActiveVideoApiKey}
              />
            </div>

            {isLoading && <Loader />}
            
            {error && (
              <div className="mt-8 bg-red-900/50 border border-red-700 text-red-200 p-4 rounded-lg text-center">
                {/* FIX: Cast result of t() to string */}
                <h3 className="font-bold text-lg">{t('generationFailed') as string}</h3>
                <p className="mt-1">{error}</p>
              </div>
            )}

            {videoUrl && !isLoading && (
              <VideoPlayer videoUrl={videoUrl} prompt={videoGeneratorState.prompt} />
            )}
          </div>
        )}
      </main>
        
      <footer className="w-full mt-12 pb-8 text-center text-gray-500 text-sm">
        <p>Powered by MOH RIYAN ADI SAPUTRA</p>
      </footer>
    </div>
  );
}