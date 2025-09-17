// types.ts

export interface GeneratorOptions {
  prompt: string;
  image?: {
    base64: string;
    mimeType: string;
  };
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
  enableSound: boolean;
  resolution: '720p' | '1080p';
}

// Add VideoGeneratorState to persist form state
export interface VideoGeneratorState {
  prompt: string;
  // Store only serializable data for localStorage
  imageFile: { base64: string; mimeType: string; } | null;
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
  enableSound: boolean;
  resolution: '720p' | '1080p';
}

// FIX: Add missing ImageFile interface for the video generator form.
export interface ImageFile {
  base64: string;
  mimeType: string;
  previewUrl: string;
}

export interface ReferenceFile {
  id: string;
  base64: string;
  mimeType: string;
  previewUrl: string;
  type: 'image' | 'video';
  file: File; // Keep the original file for size/duration checks
}

// Add StoredReferenceFile for serializable data
export interface StoredReferenceFile {
  id: string;
  base64: string;
  mimeType: string;
  type: 'image' | 'video';
}

// Add ReferenceIdeaState to persist form state
export interface ReferenceIdeaState {
  referenceFiles: StoredReferenceFile[];
  results: GeneratedPrompts | null;
}


// --- Story Creator Types ---

export type ActiveTab = 'editor' | 'storyboard' | 'publishingKit';

export interface Character {
  id: string;
  name: string;
  brandName: string;
  modelName: string;
  material: string;
  designLanguage: string;
  keyFeatures: string[];
  consistency_key: string;
  actionDNA: string[];
  character_personality?: string;
  physical_details?: string;
  scale_and_size?: string;
}

export interface StoryboardScene {
  scene_number: number;
  scene_title: string;
  scene_summary: string;
  character_actions: {
    character_name: string;
    action_description: string;
    consistency_key: string;
  }[];
  cinematography: {
    shot_type: string;
    camera_angle: string;
    camera_movement: string;
  };
  sound_design: {
    sfx: string[];
    ambience: string;
    narration_script: string;
    audio_mixing_guide: string;
  };
  blueprintPrompt?: string;
  cinematicPrompt?: string;
}

export interface StoryIdea {
    title_suggestion: string;
    script_outline: string;
}

export interface StoryIdeaOptions {
    contentFormat: string;
    characterNames: string[];
    theme: string;
    language: string;
}

export interface ThemeSuggestion {
    category_name: string;
    themes: string[];
}

export interface PublishingKitData {
  youtube_title_id: string;
  youtube_title_en: string;
  youtube_description_id: string;
  youtube_description_en: string;

  youtube_tags_id: string[];
  youtube_tags_en: string[];
  affiliate_links: {
    primary_character_template: string;
    all_characters_template: string;
  };
  thumbnail_concepts: {
    concept_title_id: string;
    concept_title_en: string;
    concept_description_id: string;
    concept_description_en: string;
    image_prompt: string;
    advanced_prompt_json_id: string;
    advanced_prompt_json_en: string;
    concept_caption_id: string;
    concept_caption_en: string;
  }[];
}

export interface DirectingSettings {
  sceneStyleSet: string;
  customSceneStyle: string;
  locationSet: string;
  customLocation: string;
  weatherSet: string;
  customWeather: string;
  cameraStyleSet: string;
  customCameraStyle: string;
  narratorLanguageSet: string;
  customNarratorLanguage: string;
  timeOfDay: string;
  artStyle: string;
  soundtrackMood: string;
  pacing: string;
}
export interface ThemeIdeaOptions {
    contentFormat: string;
    characterNames: string[];
    language: string;
}

export interface GeneratedPrompts {
  simple_prompt: string;
  json_prompt: string;
}