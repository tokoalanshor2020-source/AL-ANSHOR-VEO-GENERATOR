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

export interface ImageFile {
  base64: string;
  mimeType: string;
  previewUrl: string;
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
    cta_overlay_text_id: {
      hook: string;
      character: string;
      goal: string;
    };
    cta_overlay_text_en: {
      hook: string;
      character: string;
      goal: string;
    };
  }[];
}

export interface DirectingSettings {
  sceneStyleSet: string;
  locationSet: string;
  customLocation: string;
  weatherSet: string;
  cameraStyleSet: string;
  narratorLanguageSet: string;
  customNarratorLanguage: string;
}