// services/storyCreatorService.ts

import { GoogleGenAI, Type, type GenerateContentResponse, type GenerateImagesResponse } from "@google/genai";
import type { Character, DirectingSettings, StoryboardScene, StoryIdea, PublishingKitData, ThemeSuggestion, ThemeIdeaOptions, StoryIdeaOptions as RealStoryIdeaOptions } from '../../types';
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

// FIX: This interface was incorrectly duplicated in types.ts. Using the correct one.
// type StoryIdeaOptions = RealStoryIdeaOptions;


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
                PENTING: Untuk setiap adegan, 'narration_script' harus sangat singkat, idealnya tidak lebih dari 15-20 kata, agar cocok untuk klip video berdurasi sekitar 8 detik.
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

            // FIX: The type of 'response' is not being correctly inferred. Cast to GenerateContentResponse to access the 'text' property.
            const result = safeJsonParse((response as GenerateContentResponse).text);
            return result.storyboard;
        }
    });
};

export const generateBlueprintPrompt = async (failoverParams: FailoverParams, scene: StoryboardScene, characters: Character[], directingSettings: DirectingSettings): Promise<string> => {
    return executeWithFailover({
        ...failoverParams,
        apiExecutor: async (apiKey) => {
            const ai = getAiInstance(apiKey);

            const characterDNA = characters.map(c => 
                `Character: ${c.name} (${c.consistency_key})\n` +
                `  - DNA: A ${c.material} ${c.modelName}. Design Language: ${c.designLanguage}.\n` +
                `  - Key Visuals: ${c.keyFeatures.join(', ')}.\n` +
                `  - Details: ${c.physical_details}.\n` +
                `  - Size: ${c.scale_and_size}.\n` +
                `  - Personality: ${c.character_personality}.`
            ).join('\n\n');

            const narrationScript = scene.sound_design?.narration_script || "";

            const prompt = `
                You are an expert prompt engineer and visual director for a toy cinematic universe. Your task is to translate a scene from a storyboard into an extremely detailed, multi-part prompt suitable for a high-end AI image generator. The goal is to create a single, perfect keyframe that captures the essence of the scene.

                **Input Data:**

                1.  **Scene Information:**
                    *   Title: ${scene.scene_title}
                    *   Summary: ${scene.scene_summary}
                    *   Actions: ${scene.character_actions.map(a => `${a.character_name} (${a.consistency_key}) ${a.action_description}`).join('. ')}
                    *   Cinematography: ${scene.cinematography.shot_type}, ${scene.cinematography.camera_angle}, ${scene.cinematography.camera_movement}.

                2.  **Character DNA (Crucial for visual consistency):**
                    ${characterDNA}

                3.  **Directing Style:**
                    *   Art Style/Visual Mood: ${directingSettings.artStyle}
                    *   Weather/Atmosphere: ${directingSettings.weatherSet === 'custom_weather' ? directingSettings.customWeather : directingSettings.weatherSet}
                    *   Time of Day: ${directingSettings.timeOfDay}
                    *   Location: ${directingSettings.locationSet === 'custom_location' ? directingSettings.customLocation : directingSettings.locationSet}
                    *   Pacing: ${directingSettings.pacing}

                **Your Task:**
                Generate a single block of text. Your output MUST strictly follow the format below. Do not add any other text, explanations, or markdown. Fill in each section by synthesizing all the provided input data.

                //** 1. VISUAL STYLE & QUALITY **//
                STYLE: [Based on the Art Style, create a comma-separated list of keywords. e.g., "Professional product photography, hyper-realistic, macro, high detail, cinematic lighting"]

                //** 2. SUBJECT & DETAILS **//
                SUBJECT: [This is the most critical section. Describe the character(s) in immense detail. Use the provided 'Character DNA' to flesh out their appearance, material, pose, and expression. Mention the character's 'consistency_key' directly in the description. Describe any objects they are interacting with. Detail the 'Physical Evidence' to make the scene look like a real-world photograph of a high-quality toy, including micro-scratches, dust, and realistic textures on props.]
                *   **Physical Evidence:** [Describe micro-details that prove this is a physical object, like subtle dust, scratches on metal parts, realistic texture on clothing or props.]

                //** 3. ENVIRONMENT & BACKGROUND **//
                ENVIRONMENT: [Describe the setting in rich detail based on the Location, Weather, and Time of Day. Create a believable and atmospheric background that supports the narrative of the scene.]

                //** 4. COMPOSITION & PERSPECTIVE **//
                COMPOSITION: [Translate the 'Cinematography' notes into a detailed description of the camera shot, angle, lens, and overall composition. Describe how the subject is framed and what the focus of the shot is.]

                //** 5. LIGHTING & ATMOSPHERE **//
                LIGHTING: [Describe the lighting in extreme detail, based on the Time of Day and Weather. Mention key light, fill light, and rim light. Explain how the light interacts with the subject and the environment to create a specific mood.]

                //** 6. NEGATIVE PROMPT **//
                NEGATIVE_PROMPT: animation, 3d render, cgi, cartoon, illustration, painting, drawing, art, video game, unreal engine, octane render, blender render, digital art, perfect, clean, smooth, glossy, inconsistent character, changing model
                ${narrationScript ? `\n//** 7. NARRATION SCRIPT **//\n${narrationScript}` : ''}
            `;
            
            const response = await makeGenerativeApiCall(() => ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            }));
            
            // FIX: The type of 'response' is not being correctly inferred. Cast to GenerateContentResponse to access the 'text' property.
            return (response as GenerateContentResponse).text.trim();
        }
    });
};

export const generateCinematicPrompt = async (failoverParams: FailoverParams, scene: StoryboardScene, characters: Character[], directingSettings: DirectingSettings): Promise<string> => {
    return executeWithFailover({
        ...failoverParams,
        apiExecutor: async (apiKey) => {
            const ai = getAiInstance(apiKey);
            const characterDetails = characters.map(c => `[Character DNA for ${c.consistency_key}: A ${c.material} ${c.modelName}. Design Language: ${c.designLanguage}. Key Visual Features: ${c.keyFeatures.join(', ')}. Details: ${c.physical_details}. Size: ${c.scale_and_size}. Personality: ${c.character_personality}]`).join('\n');
            const narrationScript = scene.sound_design?.narration_script || "";

            const prompt = `
                You are a prompt engineer for a text-to-video AI model. Your task is to convert a storyboard scene into a two-part cinematic prompt.

                **Storyboard Scene Information:**
                - Scene: ${scene.scene_number} - ${scene.scene_title}
                - Summary: ${scene.scene_summary}
                - Character Actions: ${scene.character_actions.map(a => `${a.character_name} (${a.consistency_key}) performs: ${a.action_description}`).join('; ')}
                - Cinematography: ${scene.cinematography.shot_type}, ${scene.cinematography.camera_angle}, movement is ${scene.cinematography.camera_movement}.
                - Narration Script: "${narrationScript}"
                
                **Overall Directing Style:**
                - Art Style: ${directingSettings.artStyle}
                - Location: ${directingSettings.locationSet === 'custom_location' ? directingSettings.customLocation : directingSettings.locationSet}
                - Weather: ${directingSettings.weatherSet === 'custom_weather' ? directingSettings.customWeather : directingSettings.weatherSet}
                - Time of Day: ${directingSettings.timeOfDay}
                - Camera Style: ${directingSettings.cameraStyleSet === 'custom_camera' ? directingSettings.customCameraStyle : directingSettings.cameraStyleSet}
                - Pacing: ${directingSettings.pacing}

                **Character Visual DNA (Crucial for consistency):**
                ${characterDetails}

                **Your Task:**
                Generate a response in two distinct parts, exactly as follows, without any extra text or markdown.

                1.  **Visual Description Paragraph:** Synthesize ALL the information above (except the narration script itself) into a single, comprehensive, and vivid paragraph. This paragraph is the main visual prompt. Describe the setting, atmosphere, and character actions in extreme detail. Incorporate all cinematography and directing style notes. Use the Character DNA to ensure the character is described accurately, including their \`consistency_key\`. Be evocative and use powerful, descriptive language.

                2.  **Narration Script Section:** After the visual description paragraph, add two newlines, then add the line "NARRATION SCRIPT", followed by another newline, and then the narration script. CRUCIAL: The narration script must be edited to be very concise, suitable for an 8-second video clip (around 15-20 words). If the original script is too long, you MUST shorten it while preserving the core meaning.

                If the original narration script is empty, you MUST omit the "NARRATION SCRIPT" section entirely.
            `;

            const response = await makeGenerativeApiCall(() => ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            }));
            // FIX: The type of 'response' is not being correctly inferred. Cast to GenerateContentResponse to access the 'text' property.
            return (response as GenerateContentResponse).text.trim();
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
                    concept_caption_id: { type: Type.STRING },
                    concept_caption_en: { type: Type.STRING },
                },
                required: ["concept_title_id", "concept_title_en", "concept_description_id", "concept_description_en", "image_prompt", "concept_caption_id", "concept_caption_en"]
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
                You are a world-class YouTube content strategist and SEO expert, specializing in the toy niche for channels similar to "Hot Wheels" or "Blippi Toys". Your analysis must be on par with premium tools like VidIQ and TubeBuddy.

                **Input Data:**
                - Story Logline: ${logline}
                - Story Summary: ${storyboard.map(s => s.scene_summary).join(' ')}
                - Main Characters: ${characters.map(c => c.name).join(', ')}

                **Your Task:**
                Generate a complete, professional publishing kit as a single JSON object that strictly adheres to the provided schema. The output must be optimized for maximum reach, engagement, and search ranking on YouTube. Generate content for both Bahasa Indonesia (id) and English (en).

                **CRITICAL REQUIREMENTS:**

                1.  **YouTube Titles (youtube_title_id, youtube_title_en):**
                    *   **Hook First:** Start with a powerful, attention-grabbing hook.
                    *   **High-Value Keywords:** Seamlessly integrate high search volume keywords relevant to the story (e.g., "toy car race", "monster truck rescue", "epic crash").
                    *   **Clarity & Intrigue:** Clearly state the video's content while creating curiosity.
                    *   **Length:** MUST NOT exceed 100 characters.

                2.  **YouTube Descriptions (youtube_description_id, youtube_description_en):**
                    *   **Compelling Summary:** Write an engaging summary of the story that expands on the title.
                    *   **SEO Integration:** Naturally weave in primary and secondary keywords throughout the text.
                    *   **Structure:** Structure the description for readability (short paragraphs).
                    *   **Hashtags:** Conclude with 3-5 highly relevant, broad hashtags (e.g., #hotwheels #toycars #diecast).
                    *   **Length:** MUST NOT exceed 5000 characters.

                3.  **YouTube Tags (youtube_tags_id, youtube_tags_en):**
                    *   **VidIQ/TubeBuddy Strategy:** Generate a list of tags that would achieve a high score in these tools. Use a mix of:
                        *   Specific, long-tail keywords (e.g., "red race car vs blue monster truck").
                        *   Broader, high-volume keywords (e.g., "toy cars", "diecast racing").
                        *   Character names and branding keywords.
                    *   **Algorithm-Friendly:** The tags must be highly relevant to the title, description, and video content.
                    *   **Length:** The total character count of all tags combined MUST NOT exceed 500 characters.

                4.  **Thumbnail Concept (thumbnail_concepts - generate ONLY ONE):**
                    *   **Visual Storytelling:** The concept must depict the most dramatic, action-packed, or intriguing moment of the story.
                    *   **Detailed Image Prompt (image_prompt):**
                        *   Write a "masterpiece" level prompt for an AI image generator like Imagen 4.0.
                        *   It must be extremely detailed, covering subject, environment, lighting, composition, and mood to create a photorealistic, cinematic thumbnail.
                        *   **Include the designed caption text within this prompt**, formatted like this for the artist's reference: // OVERLAY TEXT: "CAPTION LINE 1" \\n "CAPTION LINE 2" //
                    *   **Engaging Caption (concept_caption_id, concept_caption_en):**
                        *   Design a compelling, multi-line caption to be overlaid on the thumbnail.
                        *   Use 2-3 short, powerful lines separated by a newline character (\\n).
                        *   The text should be bold, exciting, and create a strong sense of urgency or curiosity. AVOID simple, boring text. Example: "EPIC JUMP!\\nWILL HE MAKE IT?!".
                
                - Create affiliate link templates. Use "[LINK]" as a placeholder.
            `;
            
            const response = await makeGenerativeApiCall(() => ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: publishingKitSchema,
                }
            }));

            // FIX: The type of 'response' is not being correctly inferred. Cast to GenerateContentResponse to access the 'text' property.
            return safeJsonParse((response as GenerateContentResponse).text);
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
            
            // FIX: The type of 'response' is not being correctly inferred. Cast to GenerateContentResponse to access the 'text' property.
            return safeJsonParse((response as GenerateContentResponse).text);
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
            // FIX: The type of 'response' is not being correctly inferred. Cast to GenerateContentResponse to access the 'text' property.
            const result = safeJsonParse((response as GenerateContentResponse).text);
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

export const generateStoryIdeas = async (failoverParams: FailoverParams, options: RealStoryIdeaOptions): Promise<StoryIdea[]> => {
    return executeWithFailover({
        ...failoverParams,
        apiExecutor: async (apiKey) => {
            const ai = getAiInstance(apiKey);
            const { contentFormat, characterNames, theme, language } = options;
            const prompt = `
                You are a scriptwriter for a popular toy YouTube channel. Your task is to generate 3 creative and engaging story ideas.

                Content Format: ${contentFormat}
                Main Character(s): ${characterNames.join(', ')}
                Story Theme: ${theme}
                Target Language for Output: ${language}

                Task: Generate a JSON object containing a list of 3 story ideas.
                The JSON object must have one key "story_ideas", which is an array of objects.
                Each object in the array must contain:
                - "title_suggestion": A catchy, SEO-friendly title for the video. This MUST be in ${language}.
                - "script_outline": A 3-4 sentence summary of the story/script. This MUST be in ${language}.
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

const regeneratedLocalizedAssetsSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        tags: { type: Type.ARRAY, items: { type: Type.STRING } },
        thumbnail_concept: {
            type: Type.OBJECT,
            properties: {
                concept_title: { type: Type.STRING },
                concept_description: { type: Type.STRING },
                image_prompt: { type: Type.STRING },
                concept_caption: { type: Type.STRING },
            },
            required: ["concept_title", "concept_description", "image_prompt", "concept_caption"]
        }
    },
    required: ["title", "description", "tags", "thumbnail_concept"]
};

export const generateLocalizedPublishingAssets = async (failoverParams: FailoverParams, options: PublishingKitOptions & { originalImagePrompt: string }, language: string): Promise<any> => {
     return executeWithFailover({
        ...failoverParams,
        apiExecutor: async (apiKey) => {
            const ai = getAiInstance(apiKey);
            const { storyboard, characters, logline, originalImagePrompt } = options;
            const prompt = `
                You are a world-class YouTube content strategist and SEO expert (equivalent to VidIQ/TubeBuddy Pro), specializing in creating viral content for toy channels.
                Your task is to regenerate a complete, high-quality publishing kit NATIVELY for the target language: ${language}. This is not a translation; it is a full recreation optimized for the target audience.

                **Input Data:**
                - Story Logline: ${logline}
                - Story Summary: ${storyboard.map(s => s.scene_summary).join(' ')}
                - Main Characters: ${characters.map(c => c.name).join(', ')}
                - Original English Image Prompt for creative reference: ${originalImagePrompt}

                **Your Task:**
                Generate a single JSON object with regenerated assets for the "${language}" language, strictly following these rules:

                1.  **title**: A catchy, SEO-friendly title in ${language}. It must be under 100 characters and start with a strong hook relevant to ${language}-speaking audiences.
                2.  **description**: A detailed, engaging video description in ${language}. It must include relevant keywords for that language's search trends and end with 3-5 appropriate hashtags.
                3.  **tags**: An array of high-value YouTube tags in ${language}. Create a mix of specific long-tail and broad high-volume tags, not exceeding a total of 500 characters.
                4.  **thumbnail_concept**: A regenerated thumbnail concept containing:
                    - **concept_title**: A new, engaging title for the thumbnail idea, written in ${language}.
                    - **concept_description**: A new, brief description of the thumbnail scene, written in ${language}.
                    - **concept_caption**: A new, compelling, multi-line thumbnail caption in ${language}. Use '\\n' for line breaks. Example for Spanish: "¡SALTO ÉPICO!\\n¿LO LOGRARÁ?".
                    - **image_prompt**: A masterpiece-level image prompt written **in English**. This prompt should be a revised, potentially improved version of the original reference prompt. CRUCIALLY, it MUST incorporate the new \`concept_caption\` (in its original ${language}) inside a comment for the artist, formatted exactly like this: // OVERLAY TEXT: "CAPTION LINE 1" \\n "CAPTION LINE 2" //.
            `;
            const response = await makeGenerativeApiCall(() => ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: regeneratedLocalizedAssetsSchema
                }
            }));

            return safeJsonParse((response as GenerateContentResponse).text);
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

export const createImageWithOverlay = async (imageData: ThumbnailData, caption: string): Promise<string> => {
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
            
            const lines = caption.split('\n').map(line => line.trim()).filter(Boolean);
            if (lines.length === 0) {
                resolve(canvas.toDataURL('image/png'));
                return;
            }
            
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            const FONT_FAMILY = 'Impact, sans-serif';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = canvas.width * 0.01;

            const drawText = (text: string, yPos: number, fontSize: number) => {
                ctx.font = `bold ${fontSize}px ${FONT_FAMILY}`;
                ctx.strokeText(text.toUpperCase(), canvas.width / 2, yPos);
                ctx.fillText(text.toUpperCase(), canvas.width / 2, yPos);
            };
            
            const PADDING = canvas.height * 0.08;

            if (lines.length === 1) {
                ctx.textBaseline = 'middle';
                const fontSize = canvas.height * 0.20;
                drawText(lines[0], canvas.height / 2, fontSize);
            } else if (lines.length === 2) {
                ctx.textBaseline = 'bottom';
                const topFontSize = canvas.height * 0.18;
                drawText(lines[0], PADDING + topFontSize, topFontSize);
                
                const bottomFontSize = canvas.height * 0.15;
                drawText(lines[1], canvas.height - PADDING, bottomFontSize);
            } else { // 3 or more lines
                ctx.textBaseline = 'bottom';
                const topFontSize = canvas.height * 0.15;
                drawText(lines[0], PADDING + topFontSize, topFontSize);
                
                ctx.textBaseline = 'middle';
                const middleFontSize = canvas.height * 0.20;
                // Minor offset for better visual centering
                drawText(lines[1], canvas.height / 2 + middleFontSize / 10, middleFontSize);

                ctx.textBaseline = 'bottom';
                const bottomFontSize = canvas.height * 0.12;
                drawText(lines[2], canvas.height - PADDING, bottomFontSize);
            }

            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => {
            reject(new Error('Failed to load base64 image'));
        };
        img.src = `data:${imageData.mimeType};base64,${imageData.base64}`;
    });
};