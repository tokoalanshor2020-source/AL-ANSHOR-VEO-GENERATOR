import { GoogleGenAI, Type, type GenerateContentResponse, type GenerateImagesResponse } from "@google/genai";
import type { Character, DirectingSettings, StoryboardScene, StoryIdea, PublishingKitData, ThemeSuggestion, ThemeIdeaOptions } from '../types';
import { executeWithFailover, FailoverParams } from './geminiService';


interface StoryboardOptions {
    logline: string;
    scenario: string;
    sceneCount: number;
    characters: Character[];
    directingSettings: DirectingSettings;
}

export interface CharacterDevelopmentOptions {
    idea: string;
    referenceFiles: {
        base64: string;
        mimeType: string;
    }[];
}

export interface DevelopedCharacterData {
    brand_name: string;
    model_name: string;
    material: string;
    design_language: string;
    key_features: string[];
    consistency_key: string;
    character_personality: string;
    physical_details: string;
    scale_and_size: string;
}

export interface StoryIdeaOptions {
    contentFormat: string;
    characterNames: string[];
    theme: string;
}

export interface PublishingKitOptions {
    storyboard: StoryboardScene[];
    characters: Character[];
    logline: string;
}

interface ThumbnailData {
    base64: string;
    mimeType: string;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const makeGenerativeApiCall = async <T>(apiCall: () => Promise<T>, maxRetries = 3): Promise<T> => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await apiCall();
        } catch (error) {
             if (error instanceof Error && (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED'))) {
                if (attempt === maxRetries - 1) {
                    throw new Error('errorRateLimit');
                }
                const delayTime = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
                console.warn(`Rate limit hit. Retrying in ${delayTime.toFixed(0)}ms... (Attempt ${attempt + 1}/${maxRetries})`);
                await delay(delayTime);
            } else {
                throw error;
            }
        }
    }
    throw new Error('errorRateLimit');
};

const getAiInstance = (apiKey: string) => new GoogleGenAI({ apiKey });

const safeJsonParse = (jsonString: string) => {
    try {
        const cleanedString = jsonString.replace(/^```json\s*|```\s*$/g, '').trim();
        return JSON.parse(cleanedString);
    } catch (e) {
        console.error("Failed to parse JSON:", jsonString);
        throw new Error("Received an invalid JSON response from the AI.");
    }
};

const masterSceneObjectSchema = {
    type: Type.OBJECT,
    properties: {
        scene_number: { type: Type.NUMBER },
        scene_title: { type: Type.STRING },
        scene_summary: { type: Type.STRING },
        character_actions: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    character_name: { type: Type.STRING },
                    action_description: { type: Type.STRING },
                    consistency_key: { type: Type.STRING }
                },
                 required: ["character_name", "action_description", "consistency_key"]
            }
        },
        cinematography: {
            type: Type.OBJECT,
            properties: {
                shot_type: { type: Type.STRING },
                camera_angle: { type: Type.STRING },
                camera_movement: { type: Type.STRING }
            },
            required: ["shot_type", "camera_angle", "camera_movement"]
        },
        sound_design: {
            type: Type.OBJECT,
            properties: {
                sfx: { type: Type.ARRAY, items: { type: Type.STRING } },
                ambience: { type: Type.STRING },
                narration_script: { type: Type.STRING },
                audio_mixing_guide: { type: Type.STRING }
            },
            required: ["sfx", "ambience", "narration_script", "audio_mixing_guide"]
        }
    },
    required: ["scene_number", "scene_title", "scene_summary", "character_actions", "cinematography", "sound_design"]
};

const storyboardSchema = {
    type: Type.OBJECT,
    properties: { 
        storyboard: { 
            type: Type.ARRAY, 
            items: masterSceneObjectSchema 
        }
    },
    required: ["storyboard"]
};


export const generateStoryboard = async (failoverParams: FailoverParams, options: StoryboardOptions): Promise<StoryboardScene[]> => {
    return executeWithFailover({
        ...failoverParams,
        apiExecutor: async (apiKey) => {
            const ai = getAiInstance(apiKey);
            const { logline, scenario, sceneCount, characters, directingSettings } = options;

            const characterDetails = characters.length > 0
                ? `Karakter utama dalam cerita ini adalah: ${characters.map(c => `Nama: ${c.name}, ID Konsistensi: ${c.consistency_key}, Deskripsi Detail: ${c.designLanguage}, Fitur Kunci: ${c.keyFeatures.join(', ')}, Material: ${c.material}`).join('; ')}.`
                : "Tidak ada karakter spesifik yang dipilih.";
            
            // Handle custom inputs
            const sceneStyle = directingSettings.sceneStyleSet === 'custom_scene' ? directingSettings.customSceneStyle.trim() : directingSettings.sceneStyleSet;
            const location = directingSettings.locationSet === 'custom_location' ? directingSettings.customLocation.trim() : directingSettings.locationSet;
            const weather = directingSettings.weatherSet === 'custom_weather' ? directingSettings.customWeather.trim() : directingSettings.weatherSet;
            const cameraStyle = directingSettings.cameraStyleSet === 'custom_camera' ? directingSettings.customCameraStyle.trim() : directingSettings.cameraStyleSet;
            const narratorLanguage = directingSettings.narratorLanguageSet === 'custom_language' ? directingSettings.customNarratorLanguage.trim() : directingSettings.narratorLanguageSet;

            const prompt = `
                Anda adalah seorang sutradara dan penulis naskah profesional untuk film pendek yang dibintangi oleh mainan.
                Tugas Anda adalah membuat storyboard terperinci berdasarkan informasi berikut:

                Judul Cerita/Logline: ${logline}
                Ringkasan Cerita/Skenario: ${scenario}
                Jumlah Adegan yang Diminta: ${sceneCount}
                ${characterDetails}

                Pengaturan Penyutradaraan Tambahan:
                - Set Adegan: ${sceneStyle}
                - Set Lokasi Utama: ${location}
                - Set Cuaca & Atmosfer: ${weather}
                - Gaya Kamera (POV): ${cameraStyle}
                - Bahasa Narator: ${narratorLanguage}
                - Waktu: ${directingSettings.timeOfDay}
                - Gaya Seni / Mood Visual: ${directingSettings.artStyle}
                - Mood Soundtrack: ${directingSettings.soundtrackMood}
                - Tempo Adegan: ${directingSettings.pacing}

                Tugas Anda:
                Buatlah storyboard dalam format JSON yang valid. JSON harus berisi sebuah objek dengan satu kunci "storyboard", yang nilainya adalah sebuah array dari objek-objek adegan.
                Setiap objek adegan harus secara ketat mengikuti skema yang ditentukan.
                Pastikan untuk memasukkan tindakan karakter (character_actions) yang spesifik untuk setiap karakter yang disebutkan, lengkap dengan 'consistency_key' mereka.
                Kembangkan sinopsis menjadi ${sceneCount} adegan yang mengalir secara logis.
                Pastikan semua field dalam skema JSON terisi dengan konten yang relevan dan kreatif.
                Jangan mengembalikan apapun selain objek JSON yang valid.
            `;
            
            const response: GenerateContentResponse = await makeGenerativeApiCall(() => ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: storyboardSchema,
                }
            }));

            const result = safeJsonParse(response.text);
            return result.storyboard;
        }
    });
};

export const generateBlueprintPrompt = async (failoverParams: FailoverParams, scene: StoryboardScene, characters: Character[], directingSettings: DirectingSettings): Promise<string> => {
    return executeWithFailover({
        ...failoverParams,
        apiExecutor: async (apiKey) => {
            const ai = getAiInstance(apiKey);
            const characterDetails = characters.map(c => `[${c.consistency_key}: ${c.designLanguage}, ${c.keyFeatures.join(', ')}]`).join(' ');

            const prompt = `
                Create a detailed "blueprint" prompt for an AI image generator to create a keyframe for a video scene.
                This is for a cinematic video featuring toys.
                
                Scene Details:
                - Scene Number: ${scene.scene_number}
                - Title: ${scene.scene_title}
                - Summary: ${scene.scene_summary}
                - Character Actions: ${scene.character_actions.map(a => `${a.character_name} (${a.consistency_key}) ${a.action_description}`).join('. ')}
                - Cinematography: ${scene.cinematography.shot_type}, ${scene.cinematography.camera_angle}, ${scene.cinematography.camera_movement}.
                - Directing Style: ${directingSettings.artStyle}, ${directingSettings.weatherSet} weather, set at ${directingSettings.timeOfDay}. Location is ${directingSettings.locationSet}.

                Character DNA (for visual consistency):
                ${characterDetails}

                Task: Write a concise, powerful, and visually descriptive prompt under 150 words. Focus ONLY on the visual elements. Describe the scene as if for a photograph. Include character details using their consistency_key. Do not add instructions like "create" or "generate".
            `;
            
            const response = await makeGenerativeApiCall(() => ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            }));
            return response.text.trim();
        }
    });
};

export const generateCinematicPrompt = async (failoverParams: FailoverParams, scene: StoryboardScene, characters: Character[], directingSettings: DirectingSettings): Promise<string> => {
    return executeWithFailover({
        ...failoverParams,
        apiExecutor: async (apiKey) => {
            const ai = getAiInstance(apiKey);
            const characterDetails = characters.map(c => `[Character DNA for ${c.consistency_key}: A ${c.material} ${c.modelName}. Design Language: ${c.designLanguage}. Key Visual Features: ${c.keyFeatures.join(', ')}. Details: ${c.physical_details}. Size: ${c.scale_and_size}. Personality: ${c.character_personality}]`).join('\n');

            const prompt = `
                You are a prompt engineer for a text-to-video AI model (like VEO).
                Your task is to convert a storyboard scene into a highly detailed, cinematic prompt.

                Storyboard Scene Information:
                - Scene: ${scene.scene_number} - ${scene.scene_title}
                - Summary: ${scene.scene_summary}
                - Character Actions: ${scene.character_actions.map(a => `${a.character_name} (${a.consistency_key}) performs: ${a.action_description}`).join('; ')}
                - Cinematography: ${scene.cinematography.shot_type}, ${scene.cinematography.camera_angle}, movement is ${scene.cinematography.camera_movement}.
                - Sound Design: Ambience is ${scene.sound_design.ambience}. SFX include ${scene.sound_design.sfx.join(', ')}.
                
                Overall Directing Style:
                - Art Style: ${directingSettings.artStyle}
                - Location: ${directingSettings.locationSet === 'custom_location' ? directingSettings.customLocation : directingSettings.locationSet}
                - Weather: ${directingSettings.weatherSet === 'custom_weather' ? directingSettings.customWeather : directingSettings.weatherSet}
                - Time of Day: ${directingSettings.timeOfDay}
                - Camera Style: ${directingSettings.cameraStyleSet === 'custom_camera' ? directingSettings.customCameraStyle : directingSettings.cameraStyleSet}
                - Pacing: ${directingSettings.pacing}

                Character Visual DNA (Crucial for consistency):
                ${characterDetails}

                Your Task:
                Synthesize ALL the information above into a single, comprehensive, and vivid paragraph.
                This paragraph will be the final prompt for the video generation model.
                - Start with the Character DNA section. This is the most important part for visual consistency.
                - Describe the setting, atmosphere, and action in extreme detail.
                - Incorporate all cinematography and directing style notes.
                - Be evocative and use powerful, descriptive language.
                - The final output should be a single block of text. Do not use markdown or headings.
            `;

            const response = await makeGenerativeApiCall(() => ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            }));
            return response.text.trim();
        }
    });
};

const publishingKitSchema = {
    type: Type.OBJECT,
    properties: {
        youtube_title_id: { type: Type.STRING },
        youtube_title_en: { type: Type.STRING },
        youtube_description_id: { type: Type.STRING },
        youtube_description_en: { type: Type.STRING },
        youtube_tags_id: { type: Type.ARRAY, items: { type: Type.STRING } },
        youtube_tags_en: { type: Type.ARRAY, items: { type: Type.STRING } },
        affiliate_links: {
            type: Type.OBJECT,
            properties: {
                primary_character_template: { type: Type.STRING },
                all_characters_template: { type: Type.STRING },
            },
            required: ["primary_character_template", "all_characters_template"]
        },
        thumbnail_concepts: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    concept_title_id: { type: Type.STRING },
                    concept_title_en: { type: Type.STRING },
                    concept_description_id: { type: Type.STRING },
                    concept_description_en: { type: Type.STRING },
                    image_prompt: { type: Type.STRING },
                    cta_overlay_text_id: {
                        type: Type.OBJECT,
                        properties: { hook: { type: Type.STRING }, character: { type: Type.STRING }, goal: { type: Type.STRING } },
                        required: ["hook", "character", "goal"]
                    },
                    cta_overlay_text_en: {
                        type: Type.OBJECT,
                        properties: { hook: { type: Type.STRING }, character: { type: Type.STRING }, goal: { type: Type.STRING } },
                        required: ["hook", "character", "goal"]
                    },
                },
                required: ["concept_title_id", "concept_title_en", "concept_description_id", "concept_description_en", "image_prompt", "cta_overlay_text_id", "cta_overlay_text_en"]
            }
        }
    },
    required: ["youtube_title_id", "youtube_title_en", "youtube_description_id", "youtube_description_en", "youtube_tags_id", "youtube_tags_en", "affiliate_links", "thumbnail_concepts"]
};

export const generatePublishingKit = async (failoverParams: FailoverParams, options: PublishingKitOptions): Promise<PublishingKitData> => {
    return executeWithFailover({
        ...failoverParams,
        apiExecutor: async (apiKey) => {
            const ai = getAiInstance(apiKey);
            const { storyboard, characters, logline } = options;

            const prompt = `
                You are a YouTube content strategist for a toy channel. Based on the provided story summary, generate a complete publishing kit.
                
                Story Logline: ${logline}
                Story Summary: ${storyboard.map(s => s.scene_summary).join(' ')}
                Characters: ${characters.map(c => c.name).join(', ')}

                Task:
                Generate a JSON object that strictly adheres to the provided schema.
                - Create catchy, SEO-friendly titles in both Bahasa Indonesia (id) and English (en).
                - Write detailed descriptions in both languages, including a story summary and call-to-actions.
                - Generate relevant tags/keywords in both languages.
                - Create affiliate link templates. Use "[LINK]" as a placeholder.
                - Generate ONLY ONE creative thumbnail concept. For this concept:
                    - Provide titles and descriptions in both languages.
                    - Write a highly detailed AI image generator prompt for the thumbnail.
                    - Provide short, punchy Call-To-Action (CTA) overlay text (hook, character, goal) in both languages.
            `;
            
            const response = await makeGenerativeApiCall(() => ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: publishingKitSchema,
                }
            }));

            return safeJsonParse(response.text);
        }
    });
};

export const generateReferenceImage = async (failoverParams: FailoverParams, prompt: string, aspectRatio: string): Promise<ThumbnailData> => {
    return executeWithFailover({
        ...failoverParams,
        apiExecutor: async (apiKey) => {
            const ai = getAiInstance(apiKey);
            
            const response: GenerateImagesResponse = await makeGenerativeApiCall(() => ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: prompt,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/png',
                    aspectRatio: aspectRatio as "1:1" | "16:9" | "9:16" | "4:3" | "3:4",
                },
            }));

            if (!response.generatedImages || response.generatedImages.length === 0) {
                throw new Error("AI did not return an image.");
            }
            const image = response.generatedImages[0];
            return {
                base64: image.image.imageBytes,
                mimeType: 'image/png',
            };
        }
    });
};

const developedCharacterSchema = {
    type: Type.OBJECT,
    properties: {
        brand_name: { type: Type.STRING },
        model_name: { type: Type.STRING },
        material: { type: Type.STRING },
        design_language: { type: Type.STRING },
        key_features: { type: Type.ARRAY, items: { type: Type.STRING } },
        consistency_key: { type: Type.STRING },
        character_personality: { type: Type.STRING },
        physical_details: { type: Type.STRING },
        scale_and_size: { type: Type.STRING },
    },
    required: ["brand_name", "model_name", "material", "design_language", "key_features", "consistency_key", "character_personality", "physical_details", "scale_and_size"]
};

export const developCharacter = async (failoverParams: FailoverParams, options: CharacterDevelopmentOptions): Promise<DevelopedCharacterData> => {
     return executeWithFailover({
        ...failoverParams,
        apiExecutor: async (apiKey) => {
            const ai = getAiInstance(apiKey);
            const { idea, referenceFiles } = options;
            
            const parts: any[] = [{ text: `
                You are an expert toy designer and storyteller. Your task is to analyze user-provided information (an idea and optional reference images/videos) about a toy and flesh out its details into a structured character profile.

                User's Idea: "${idea}"

                Based on the user's idea and any provided media, generate a complete character profile as a valid JSON object.
                - **brand_name**: A plausible, fictional brand for the toy (e.g., "Hot Wheels", "Lego Technic", "Bandai").
                - **model_name**: The specific model name of the toy.
                - **material**: The primary material of the toy (e.g., "Die-cast metal", "ABS Plastic").
                - **design_language**: Describe the overall aesthetic (e.g., "Sleek and aerodynamic with sharp angles").
                - **key_features**: A list of 3-5 distinct visual features that make the character recognizable (Visual DNA).
                - **consistency_key**: A unique, memorable token for use in prompts (e.g., "[Rino_RedRacer_v1]").
                - **character_personality**: A brief description of the character's personality.
                - **physical_details**: Nuanced details like scratches, specific colors, decals, etc.
                - **scale_and_size**: The toy's scale and real-world size comparison.

                Strictly adhere to the provided JSON schema.
            ` }];

            if(referenceFiles.length > 0) {
                referenceFiles.forEach(file => {
                    parts.push({
                        inlineData: {
                            data: file.base64,
                            mimeType: file.mimeType
                        }
                    });
                });
            }

            const response: GenerateContentResponse = await makeGenerativeApiCall(() => ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: developedCharacterSchema
                }
            }));
            
            return safeJsonParse(response.text);
        }
    });
};

const actionDnaSchema = {
    type: Type.OBJECT,
    properties: {
        actions: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["actions"]
};

export const generateActionDna = async (failoverParams: FailoverParams, characterData: DevelopedCharacterData): Promise<string[]> => {
    return executeWithFailover({
        ...failoverParams,
        apiExecutor: async (apiKey) => {
            const ai = getAiInstance(apiKey);
            const prompt = `
                Based on the following toy character profile, generate a list of 5-7 dynamic "Action DNA" verbs or short phrases that describe what this character can DO.
                
                Character Profile:
                - Name: ${characterData.brand_name} ${characterData.model_name}
                - Personality: ${characterData.character_personality}
                - Physical Details: ${characterData.physical_details}
                - Key Features: ${characterData.key_features.join(', ')}

                Examples of good Action DNA: "drifts smoothly", "jumps high", "crashes spectacularly", "emits sparks", "transforms quickly".

                Generate a JSON object with a single key "actions" containing an array of strings.
            `;
            const response = await makeGenerativeApiCall(() => ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: actionDnaSchema
                }
            }));
            const result = safeJsonParse(response.text);
            return result.actions;
        }
    });
};

const themeIdeasSchema = {
    type: Type.OBJECT,
    properties: {
        theme_suggestions: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    category_name: { type: Type.STRING },
                    themes: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["category_name", "themes"]
            }
        }
    },
    required: ["theme_suggestions"]
};

export const generateThemeIdeas = async (failoverParams: FailoverParams, options: ThemeIdeaOptions): Promise<ThemeSuggestion[]> => {
    return executeWithFailover({
        ...failoverParams,
        apiExecutor: async (apiKey) => {
            const ai = getAiInstance(apiKey);
            const { contentFormat, characterNames, language } = options;
            const prompt = `
                You are a creative director for a toy-focused YouTube channel.
                
                Content Format: ${contentFormat}
                Main Characters: ${characterNames.join(', ')}

                Task: Brainstorm a list of engaging story themes suitable for the given format and characters.
                - The entire response, including category names and theme descriptions, MUST be in the following language: ${language}.
                - Group the themes into 2-3 logical categories.
                - Provide 3-5 themes per category.
                - Output a valid JSON object with a single key "theme_suggestions", which is an array of objects. Each object must have "category_name" and "themes" (an array of strings), all localized into ${language}.
            `;
            const response = await makeGenerativeApiCall(() => ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: themeIdeasSchema
                }
            }));
            const result = safeJsonParse(response.text);
            return result.theme_suggestions;
        }
    });
};

const storyIdeasSchema = {
    type: Type.OBJECT,
    properties: {
        story_ideas: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title_suggestion: { type: Type.STRING },
                    script_outline: { type: Type.STRING }
                },
                required: ["title_suggestion", "script_outline"]
            }
        }
    },
    required: ["story_ideas"]
};

export const generateStoryIdeas = async (failoverParams: FailoverParams, options: StoryIdeaOptions): Promise<StoryIdea[]> => {
    return executeWithFailover({
        ...failoverParams,
        apiExecutor: async (apiKey) => {
            const ai = getAiInstance(apiKey);
            const { contentFormat, characterNames, theme } = options;
            const prompt = `
                You are a scriptwriter for a popular toy YouTube channel. Your task is to generate 3 creative and engaging story ideas.

                Content Format: ${contentFormat}
                Main Character(s): ${characterNames.join(', ')}
                Story Theme: ${theme}

                Task: Generate a JSON object containing a list of 3 story ideas.
                The JSON object must have one key "story_ideas", which is an array of objects.
                Each object in the array must contain:
                - "title_suggestion": A catchy, SEO-friendly title for the video.
                - "script_outline": A 3-4 sentence summary of the story/script.
            `;
            const response = await makeGenerativeApiCall(() => ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: storyIdeasSchema
                }
            }));
            const result = safeJsonParse(response.text);
            return result.story_ideas;
        }
    });
};

const localizedAssetsSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        tags: { type: Type.ARRAY, items: { type: Type.STRING } },
        ctaTexts: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    hook: { type: Type.STRING },
                    character: { type: Type.STRING },
                    goal: { type: Type.STRING },
                },
                required: ["hook", "character", "goal"]
            }
        }
    },
    required: ["title", "description", "tags", "ctaTexts"]
};

// This is the LocalizedAsset type from PublishingKitView.tsx
export const generateLocalizedPublishingAssets = async (failoverParams: FailoverParams, options: PublishingKitOptions, language: string): Promise<any> => {
     return executeWithFailover({
        ...failoverParams,
        apiExecutor: async (apiKey) => {
            const ai = getAiInstance(apiKey);
            const { storyboard, characters, logline } = options;
            const prompt = `
                You are a multilingual YouTube content strategist. Your task is to localize a publishing kit for a toy video into the target language: ${language}.

                Original Story Logline: ${logline}
                Story Summary: ${storyboard.map(s => s.scene_summary).join(' ')}
                Characters: ${characters.map(c => c.name).join(', ')}

                Task: Generate a JSON object with localized assets for ${language}.
                - **title**: A catchy, SEO-friendly title in ${language}.
                - **description**: A detailed description in ${language}.
                - **tags**: An array of relevant tags/keywords in ${language}.
                - **ctaTexts**: An array of objects for thumbnail text overlays, localized into ${language}. Each object must have "hook", "character", and "goal" keys. Provide text for ONE thumbnail concept.
            `;
            const response = await makeGenerativeApiCall(() => ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: localizedAssetsSchema
                }
            }));
            return safeJsonParse(response.text);
        }
    });
};

export const generateThumbnail = async (failoverParams: FailoverParams, prompt: string, aspectRatio: string): Promise<ThumbnailData> => {
     return executeWithFailover({
        ...failoverParams,
        apiExecutor: async (apiKey) => {
            const ai = getAiInstance(apiKey);
            const response: GenerateImagesResponse = await makeGenerativeApiCall(() => ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: `ultra-realistic, dramatic lighting, 8k, cinematic thumbnail for a youtube video. ${prompt}`,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/png',
                    aspectRatio: aspectRatio as "1:1" | "16:9" | "9:16" | "4:3" | "3:4",
                },
            }));

            if (!response.generatedImages || response.generatedImages.length === 0) {
                throw new Error("AI did not return an image for the thumbnail.");
            }
            const image = response.generatedImages[0];
            return {
                base64: image.image.imageBytes,
                mimeType: 'image/png',
            };
        }
    });
};

export const createImageWithOverlay = async (imageData: ThumbnailData, ctaText: { hook: string; character: string; goal: string }): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context'));
            }

            const aspectRatio = img.width / img.height;
            canvas.width = 1280;
            canvas.height = 1280 / aspectRatio;

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            const FONT_FAMILY = 'Impact, sans-serif';
            
            ctx.strokeStyle = 'black';
            ctx.lineWidth = canvas.width * 0.01;

            const drawText = (text: string, yPos: number, fontSize: number) => {
                ctx.font = `bold ${fontSize}px ${FONT_FAMILY}`;
                ctx.strokeText(text.toUpperCase(), canvas.width / 2, yPos);
                ctx.fillText(text.toUpperCase(), canvas.width / 2, yPos);
            }
            
            const HOOK_FONT_SIZE = canvas.height * 0.15;
            const CHAR_FONT_SIZE = canvas.height * 0.20;
            const GOAL_FONT_SIZE = canvas.height * 0.12;
            
            const PADDING = canvas.height * 0.08;

            drawText(ctaText.hook, PADDING + HOOK_FONT_SIZE, HOOK_FONT_SIZE);
            drawText(ctaText.character, canvas.height / 2 + CHAR_FONT_SIZE / 2, CHAR_FONT_SIZE);
            drawText(ctaText.goal, canvas.height - PADDING, GOAL_FONT_SIZE);

            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => {
            reject(new Error('Failed to load base64 image'));
        };
        img.src = `data:${imageData.mimeType};base64,${imageData.base64}`;
    });
};