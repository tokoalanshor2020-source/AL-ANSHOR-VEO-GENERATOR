import { GoogleGenAI, Type, type GenerateContentResponse, type GenerateImagesResponse } from "@google/genai";
import type { Character, DirectingSettings, StoryboardScene, StoryIdea, PublishingKitData } from '../types';
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
    imageBase64: string | null;
    imageType: string | null;
}

export interface DevelopedCharacterData {
    brand_name: string;
    model_name: string;
    material: string;
    design_language: string;
    key_features: string[];
    consistency_key: string;
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
        return JSON.parse(jsonString);
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

            let locationContext = `Lokasi: ${directingSettings.locationSet}.`;
            if (directingSettings.locationSet === 'custom_location') {
                locationContext = `Lokasi: ${directingSettings.customLocation.trim()}.`;
            }

            let narratorLanguage = directingSettings.narratorLanguageSet;
            if (narratorLanguage === 'custom_language') {
                narratorLanguage = directingSettings.customNarratorLanguage.trim() || 'id';
            }
            const narrationContext = narratorLanguage === 'no_narrator'
                ? "Tidak ada narasi dalam cerita ini."
                : `Bahasa Narator: ${narratorLanguage}.`;

            const prompt = `Anda adalah seorang Sutradara AI profesional. Berdasarkan ringkasan cerita dan deskripsi karakter berikut, pecah menjadi ${sceneCount} adegan dalam format JSON.
        
            **PERINTAH UTAMA: Prioritaskan konsistensi karakter di semua adegan. Gunakan "ID Konsistensi" dan "Deskripsi Detail" sebagai sumber kebenaran mutlak untuk penampilan karakter.**
        
            **Konteks Cerita (Character Bible):**
            - Deskripsi Karakter (DNA Digital): ${characterDetails}
            - Ringkasan Cerita: "${scenario}"
            - Judul: "${logline}"
            - Gaya Adegan: ${directingSettings.sceneStyleSet}
            - ${locationContext}
            - Cuaca: ${directingSettings.weatherSet}
            - Gaya Visual: ${directingSettings.cameraStyleSet}
            - ${narrationContext}
        
            **ATURAN PENTING:**
            1.  Untuk 'narration_script', tulis naskah dialog yang akan dibacakan dalam **${narratorLanguage}**. Jika Bahasa Narator adalah 'no_narrator', biarkan string 'narration_script' kosong.
            2.  **GAYA BAHASA NARASI:** Naskah harus meniru gaya pembawa acara yang sangat ceria, antusias, dan kekanakan. Gunakan banyak kata seru dan kalimat pendek. Naskah HANYA boleh berisi dialog bersih.
            3.  **DURASI NARASI:** Pastikan dialog dapat dibacakan dalam **maksimal 4 detik**.
            4.  Buat 'audio_mixing_guide' dalam Bahasa Indonesia, jelaskan kapan harus menggunakan 'audio ducking'.
        
            Untuk SETIAP adegan, buat objek JSON yang detail sesuai skema.`;

            // FIX: Add GenerateContentResponse type to the response variable.
            const response: GenerateContentResponse = await makeGenerativeApiCall(() => ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: storyboardSchema
                }
            }));

            const parsedResult = safeJsonParse(response.text);
            return parsedResult.storyboard || [];
        }
    });
};

export const generateBlueprintPrompt = async (failoverParams: FailoverParams, sceneData: StoryboardScene, characters: Character[], directingSettings: DirectingSettings): Promise<string> => {
    return executeWithFailover({
        ...failoverParams,
        apiExecutor: async (apiKey) => {
            const ai = getAiInstance(apiKey);

            let styleModifier = "[Professional product photography, hyper-realistic, macro, high detail, cinematic lighting]";
            if (directingSettings.sceneStyleSet === 'epic_destruction') {
                styleModifier = "[Cinematic slow motion, professional product photography, hyper-realistic, high destruction detail, dramatic VFX]";
            }

            const characterInScene = characters.find(c => sceneData.character_actions.some(a => a.character_name === c.name));
            const characterDNA = characterInScene 
                ? `The character's immutable identity is defined by this DNA: {ID: "${characterInScene.consistency_key}", Description: "${characterInScene.designLanguage}", Key Features: "${characterInScene.keyFeatures.join(', ')}"}. YOU MUST ADHERE TO THIS DNA.`
                : '';
            
            const prompt = `You are a professional director of photography. Translate a JSON Scene Object into a technical blueprint for a hyper-realistic photo.
        
            **Core Philosophy:** Dynamic Realism. This is NOT animation. The output must describe a cinematic photo of a real physical toy.
            **CHARACTER CONSISTENCY IS PARAMOUNT.** ${characterDNA}
            
            **JSON Scene Object:**
            \`\`\`json
            ${JSON.stringify(sceneData, null, 2)}
            \`\`\`
        
            ---
            **Blueprint Generation Task:**
            Fill out the following parts. All parts MUST be in English for technical precision.
        
            //** 1. VISUAL STYLE & QUALITY **//
            STYLE: ${styleModifier}
        
            //** 2. SUBJECT & DETAILS **//
            SUBJECT: [Based on 'character_actions', provide a VERY DETAILED description of the character, strictly adhering to the Character DNA provided above (ID, Description, Key Features). Emphasize physical evidence like micro-dust, subtle scratches, or authentic dirt.]
        
            //** 3. ENVIRONMENT & BACKGROUND **//
            ENVIRONMENT: [Describe a dynamic environment based on the scene summary and cinematography.]
        
            //** 4. COMPOSITION & PERSPECTIVE **//
            COMPOSITION: [Describe the shot with dynamic language based on 'cinematography'.]
        
            //** 5. LIGHTING & ATMOSPHERE **//
            LIGHTING: [Describe realistic lighting based on the general mood.]
            
            //** 6. NEGATIVE PROMPT **//
            NEGATIVE_PROMPT: [animation, 3d render, cgi, cartoon, illustration, painting, drawing, art, video game, unreal engine, octane render, blender render, digital art, perfect, clean, smooth, glossy, inconsistent character, changing model]`;
            
            // FIX: Add GenerateContentResponse type to the response variable.
            const response: GenerateContentResponse = await makeGenerativeApiCall(() => ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt }));
            return response.text;
        }
    });
};

export const generateCinematicPrompt = async (failoverParams: FailoverParams, sceneData: StoryboardScene, characters: Character[], directingSettings: DirectingSettings): Promise<string> => {
     return executeWithFailover({
        ...failoverParams,
        apiExecutor: async (apiKey) => {
            const ai = getAiInstance(apiKey);

            let narratorLanguage = directingSettings.narratorLanguageSet;
             if (narratorLanguage === 'custom_language') {
                narratorLanguage = directingSettings.customNarratorLanguage.trim() || 'id';
            }
        
            let narrationInstruction = '';
            if (narratorLanguage !== 'no_narrator' && sceneData.sound_design?.narration_script) {
                narrationInstruction = `After the English prompt, add a clear "NARRATION SCRIPT" header and provide the narration script to be spoken in ${narratorLanguage}: "${sceneData.sound_design.narration_script}"`;
            }
            
            const characterInScene = characters.find(c => sceneData.character_actions.some(a => a.character_name === c.name));
            const characterDNA = characterInScene 
                ? `The character's immutable identity is defined by its unique ID "${characterInScene.consistency_key}" and its description: "${characterInScene.designLanguage}, with key features like ${characterInScene.keyFeatures.join(', ')}".`
                : '';
        
            const prompt = `You are an expert prompt synthesizer. Synthesize the following JSON Scene Object into a single, dense, cinematic narrative paragraph in English.
        
            **Rules:**
            1.  **CHARACTER CONSISTENCY IS THE #1 PRIORITY.** ${characterDNA} You must start the prompt by referencing the character's unique ID.
            2.  The output paragraph MUST be in English and a maximum of 1000 characters.
            3.  Proactively add dynamic visual effects (VFX) like smoke, sparks, dust clouds, or small explosions where appropriate.
            4.  ${narrationInstruction}
        
            **JSON Scene Object:**
            \`\`\`json
            ${JSON.stringify(sceneData, null, 2)}
            \`\`\`
            
            Synthesize now.`;
            
            // FIX: Add GenerateContentResponse type to the response variable.
            const response: GenerateContentResponse = await makeGenerativeApiCall(() => ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt }));
            return response.text;
        }
    });
};

export const developCharacter = async (failoverParams: FailoverParams, options: CharacterDevelopmentOptions): Promise<DevelopedCharacterData> => {
    return executeWithFailover({
        ...failoverParams,
        apiExecutor: async (apiKey) => {
            const ai = getAiInstance(apiKey);
            const { idea, imageBase64, imageType } = options;

            const prompt = `You are a Toy Designer. Your main task is to analyze the given toy image and create a detailed "Model Sheet". Use the additional notes to refine the details if provided.
        
            **Your Task:**
            1. Analyze the image as the primary source.
            2. Use the following notes as additional context: "${idea}"
            3. The result MUST be in JSON format.
            4. All descriptive fields (brand_name, model_name, material, design_language, key_features) MUST be in Indonesian.
            5. Create 'consistency_key' in English. It should be a unique and descriptive token (e.g., "red_sports_car_v1", "monster_truck_goro_x").`;
        
            const schema = {
                type: Type.OBJECT,
                properties: {
                    brand_name: { type: Type.STRING },
                    model_name: { type: Type.STRING },
                    material: { type: Type.STRING },
                    design_language: { type: Type.STRING },
                    key_features: { type: Type.ARRAY, items: { type: Type.STRING } },
                    consistency_key: { type: Type.STRING }
                },
                required: ["brand_name", "model_name", "material", "design_language", "key_features", "consistency_key"]
            };
            
            const textPart = { text: prompt };
            const requestParts: any[] = [textPart];
        
            if (imageBase64 && imageType) {
                const imagePart = {
                    inlineData: {
                        mimeType: imageType,
                        data: imageBase64,
                    },
                };
                requestParts.unshift(imagePart);
            }
        
            // FIX: Add GenerateContentResponse type to the response variable.
            const response: GenerateContentResponse = await makeGenerativeApiCall(() => ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: requestParts },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema
                }
            }));
        
            return safeJsonParse(response.text);
        }
    });
};

export const generateActionDna = async (failoverParams: FailoverParams, characterData: DevelopedCharacterData): Promise<string[]> => {
    return executeWithFailover({
        ...failoverParams,
        apiExecutor: async (apiKey) => {
            const ai = getAiInstance(apiKey);
            
            const prompt = `Berikan 5-7 kata kunci "DNA Aksi" untuk mainan ini: ${JSON.stringify(characterData)}. Hasilnya harus dalam format JSON.`;
        
            const schema = {
                type: Type.OBJECT,
                properties: { 
                    action_dna: { type: Type.ARRAY, items: { type: Type.STRING } } 
                },
                required: ["action_dna"]
            };
            
            // FIX: Add GenerateContentResponse type to the response variable.
            const response: GenerateContentResponse = await makeGenerativeApiCall(() => ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema
                }
            }));
            
            const parsed = safeJsonParse(response.text);
            return parsed.action_dna || [];
        }
    });
};

export const generateStoryIdeas = async (failoverParams: FailoverParams, options: StoryIdeaOptions): Promise<StoryIdea[]> => {
    return executeWithFailover({
        ...failoverParams,
        apiExecutor: async (apiKey) => {
            const ai = getAiInstance(apiKey);
            const { contentFormat, characterNames, theme } = options;
        
            const characterPromptPart = (characterNames.length === 0 || (characterNames.length === 1 && characterNames[0] === 'random'))
                ? "Pilihkan Secara Acak"
                : characterNames.join(', ');
            
            const prompt = `Anda adalah penulis naskah YouTube. Berikan 3 ide kerangka naskah unik dalam Bahasa Indonesia.
        
            - Format Konten: "${contentFormat}"
            - Karakter Utama: "${characterPromptPart}"
            - Tema Cerita: "${theme}"
        
            Untuk setiap ide, berikan: 'title_suggestion' dan 'script_outline'.`;
        
            const schema = {
                type: Type.OBJECT,
                properties: {
                    ideas: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title_suggestion: { type: Type.STRING },
                                script_outline: { type: Type.STRING },
                            },
                            required: ["title_suggestion", "script_outline"]
                        }
                    }
                },
                required: ["ideas"]
            };
        
            // FIX: Add GenerateContentResponse type to the response variable.
            const response: GenerateContentResponse = await makeGenerativeApiCall(() => ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema
                }
            }));
        
            const parsedResult = safeJsonParse(response.text);
            return parsedResult.ideas || [];
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
                all_characters_template: { type: Type.STRING }
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
                        properties: {
                            hook: { type: Type.STRING },
                            character: { type: Type.STRING },
                            goal: { type: Type.STRING },
                        },
                        required: ["hook", "character", "goal"],
                    },
                    cta_overlay_text_en: {
                        type: Type.OBJECT,
                        properties: {
                            hook: { type: Type.STRING },
                            character: { type: Type.STRING },
                            goal: { type: Type.STRING },
                        },
                        required: ["hook", "character", "goal"],
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

            const fullStoryNarration = storyboard.map(scene => scene.sound_design.narration_script).filter(Boolean).join('\n\n');
            const characterInfo = characters.length > 0
                ? `Karakter utama dalam cerita ini adalah: ${characters.map(c => `Nama: ${c.name}, ID Konsistensi: ${c.consistency_key}, Deskripsi Detail: ${c.designLanguage}, Fitur Kunci: ${c.keyFeatures.join(', ')}, Material: ${c.material}`).join('; ')}.`
                : "Tidak ada karakter spesifik yang dipilih.";
            const primaryCharacter = characters.length > 0 ? characters[0].name : "mainan ini";
        
            const prompt = `Anda adalah seorang ahli strategi konten YouTube dan pakar SEO viral. Berdasarkan data cerita berikut, buatlah "Kit Siaran Ajaib" yang dioptimalkan secara maksimal untuk kesuksesan algoritma dan skor tertinggi di VidIQ & TubeBuddy.
        
            **Data Sumber:**
            - Naskah Narasi Lengkap: ${fullStoryNarration}
            - Judul Asli Cerita: "${logline}"
            - Karakter Utama: "${primaryCharacter}"
            - Semua Karakter dalam Cerita (DNA Digital): "${characterInfo}"
            
            ---
        
            **TUGAS: Hasilkan Aset YouTube Berikut dalam Format JSON Sesuai Skema yang Diberikan**
        
            **1. Judul YouTube (youtube_title_id & youtube_title_en):**
            - **Kriteria Wajib:**
                - Buat judul yang sangat menarik (clickbait positif), mungkin kontroversial, dan mengandung hook yang kuat untuk memancing klik.
                - Lakukan riset kata kunci untuk memastikan judul sangat SEO-friendly dan akan menempati peringkat tinggi di pencarian YouTube.
                - **WAJIB MAKSIMAL 100 KARAKTER.**
                - Targetkan skor setinggi mungkin di VidIQ dan TubeBuddy.
        
            **2. Deskripsi YouTube (youtube_description_id & youtube_description_en):**
            - **Kriteria Wajib:**
                - Tulis deskripsi yang kaya akan kata kunci SEO yang relevan, menceritakan kembali ringkasan cerita dengan menarik.
                - Sertakan timestamp untuk adegan-adegan penting jika memungkinkan.
                - Tambahkan 3-5 tagar (hashtag) yang sangat relevan dan trending di akhir deskripsi.
                - **WAJIB MAKSIMAL 5000 KARAKTER.**
        
            **3. Tag YouTube (youtube_tags_id & youtube_tags_en):**
            - **Kriteria Wajib:**
                - Hasilkan daftar tag yang sangat relevan, menargetkan kata kunci bervolume tinggi dan rendah persaingan.
                - Sertakan kata kunci long-tail dan short-tail.
                - Dirancang untuk memaksimalkan visibilitas di rekomendasi dan pencarian YouTube.
                - **TOTAL GABUNGAN SEMUA KARAKTER TAG TIDAK BOLEH MELEBIHI 500 KARAKTER.**
        
            **4. Link Afiliasi (affiliate_links):**
            - Buat objek dengan 'primary_character_template' dan 'all_characters_template'. Gunakan placeholder [MASUKKAN LINK ANDA DI SINI].
        
            **5. Konsep Thumbnail (thumbnail_concepts):**
            - Buat array berisi SATU konsep thumbnail yang paling kuat.
            - **Untuk 'image_prompt' (SANGAT PENTING):**
                - Anda adalah seorang "Visual Prompt Engineer" ahli untuk model AI gambar seperti Imagen.
                - Prompt HARUS dalam Bahasa Inggris dan sangat detail.
                - **Sintesiskan SEMUA data yang tersedia:** Judul YouTube yang baru Anda buat, Naskah Narasi Lengkap, dan yang terpenting, DNA Digital Karakter (termasuk 'ID Konsistensi' dan deskripsi visualnya).
                - Prompt harus menggambarkan adegan paling dramatis atau klimaks dari cerita. Jelaskan aksi karakter, ekspresi wajah, lingkungan, pencahayaan sinematik yang dramatis, palet warna yang hidup, dan gaya visual (misalnya, ultra-realistis, 4K, detail tinggi, blur gerakan untuk aksi).
                - **Struktur wajib:** Mulai dengan deskripsi adegan, lalu deskripsi karakter yang SANGAT detail dengan merujuk pada 'ID Konsistensi' mereka, diikuti oleh detail latar belakang dan pencahayaan.
            - Untuk 'cta_overlay_text_id' dan 'cta_overlay_text_en', buat objek JSON dengan tiga field: 'hook', 'character', dan 'goal'.
                - 'hook': Teks pancingan yang sangat menarik, SEMUA HURUF KAPITAL, dan singkat (maksimal 3 kata). Contoh: "BALAS DENDAM EPIK!"
                - 'character': Sebutkan peran atau karakter yang menjadi sorotan (maksimal 5 kata). Contoh: "Si Truk Monster Pemberani"
                - 'goal': Jelaskan tujuan cerita secara singkat (maksimal 7 kata). Contoh: "Merebut kembali mahkota yang dicuri"
            - Untuk field lainnya (\`concept_title\`, \`concept_description\`), buat versi Bahasa Indonesia (\`_id\`) dan Inggris (\`_en\`).`;
            
             // FIX: Add GenerateContentResponse type to the response variable.
             const response: GenerateContentResponse = await makeGenerativeApiCall(() => ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: publishingKitSchema
                }
            }));
        
            return safeJsonParse(response.text);
        }
    });
};

export interface LocalizedAssets {
    title: string;
    description: string;
    tags: string[];
    ctaTexts: {
        hook: string;
        character: string;
        goal: string;
    }[];
}

export const generateLocalizedPublishingAssets = async (failoverParams: FailoverParams, options: PublishingKitOptions, targetLanguageName: string): Promise<LocalizedAssets> => {
    return executeWithFailover({
        ...failoverParams,
        apiExecutor: async (apiKey) => {
            const ai = getAiInstance(apiKey);
            const { storyboard, characters, logline } = options;

            const fullStoryNarration = storyboard.map(scene => scene.sound_design.narration_script).filter(Boolean).join('\n\n');
            const characterInfo = characters.map(c => c.name).join(', ');
            const numConcepts = 1;
        
            const prompt = `You are a world-class YouTube content strategist and a native **${targetLanguageName}** speaker. Your task is to generate a complete, hyper-optimized YouTube publishing kit from scratch in **${targetLanguageName}**, tailored for the algorithm and audience in that region.
        
            **Source Data:**
            - Story Logline: "${logline}"
            - Main Characters: "${characterInfo}"
            - Full Story Narration: ${fullStoryNarration}
            
            ---
        
            **YOUR TASK: Generate the following assets in a single JSON object. ALL text output MUST be in ${targetLanguageName}.**
        
            **1. YouTube Title (key: "title"):**
            - **Criteria:**
                - Must be in **${targetLanguageName}**.
                - Maximum 100 characters.
                - Must contain a powerful, controversial, or intriguing hook to maximize clicks.
                - Must be heavily optimized with SEO keywords relevant to the **${targetLanguageName}**-speaking audience.
                - Aim for the highest possible score on VidIQ and TubeBuddy for that region.
        
            **2. YouTube Description (key: "description"):**
            - **Criteria:**
                - Must be in **${targetLanguageName}**.
                - Maximum 5000 characters.
                - Must be rich with relevant SEO keywords and hashtags (#) that are trending in the target region.
                - Include a compelling summary of the story.
                - Include timestamps for key moments.
        
            **3. YouTube Tags (key: "tags"):**
            - **Criteria:**
                - Must be a JSON array of strings in **${targetLanguageName}**.
                - Total combined character length must not exceed 500 characters.
                - Must include a mix of of high-volume and low-competition long-tail and short-tail keywords for the target region's algorithm.
        
            **4. Thumbnail CTA Texts (key: "ctaTexts"):**
             - **Criteria:**
                - Must be a JSON array of objects. Generate exactly ${numConcepts} object.
                - Each object must have three fields: "hook", "character", and "goal".
                - All field values MUST be in **${targetLanguageName}**.
                - "hook": A short, high-impact, ALL-CAPS call-to-action (max 3 words).
                - "character": A short phrase highlighting the main character (max 5 words).
                - "goal": A short phrase describing the story's objective (max 7 words).
            `;
            
            const schema = {
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
                            required: ["hook", "character", "goal"],
                        }
                    },
                },
                required: ["title", "description", "tags", "ctaTexts"]
            };
        
            // FIX: Add GenerateContentResponse type to the response variable.
            const response: GenerateContentResponse = await makeGenerativeApiCall(() => ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema
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
            
            const fullPrompt = `Create a visually stunning and eye-catching YouTube thumbnail. The image must be vibrant, high-contrast, cinematic, and emotionally engaging, perfectly representing this scene: ${prompt}`;
        
            // FIX: Add GenerateImagesResponse type to the response variable.
            const response: GenerateImagesResponse = await makeGenerativeApiCall(() => ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: fullPrompt,
                config: {
                  numberOfImages: 1,
                  outputMimeType: 'image/png',
                  aspectRatio: aspectRatio as "1:1" | "3:4" | "4:3" | "9:16" | "16:9",
                },
            }));
        
            if (!response.generatedImages || response.generatedImages.length === 0) {
                throw new Error("Image generation failed. The model returned no candidates.");
            }
        
            const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
            
            if (!base64ImageBytes) {
                throw new Error("Image generation succeeded but no image data was returned.");
            }
        
            return {
                base64: base64ImageBytes,
                mimeType: 'image/png',
            };
        }
    });
};

const drawTextWithOutline = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    fontSize: number,
    isAllCaps: boolean
) => {
    const displayText = isAllCaps ? text.toUpperCase() : text;
    const outlineWidth = Math.max(6, 12 * (fontSize / 100)); // Scale outline with font size

    ctx.font = `900 ${fontSize}px sans-serif`;
    
    // Stroked text for outline
    ctx.strokeStyle = 'black';
    ctx.lineWidth = outlineWidth;
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.strokeText(displayText, x, y);

    // Gradient filled text
    const gradient = ctx.createLinearGradient(0, y - fontSize, 0, y);
    gradient.addColorStop(0, '#FFFFFF');
    gradient.addColorStop(1, '#FBBF24'); // Amber-400
    ctx.fillStyle = gradient;
    ctx.fillText(displayText, x, y);
};

const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
};

export const createImageWithOverlay = (imageData: ThumbnailData, textParts: { hook: string; character: string; goal: string; }): Promise<string> => {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error("Could not create canvas context"));

        const img = new Image();
        const blob = base64ToBlob(imageData.base64, imageData.mimeType);
        const objectUrl = URL.createObjectURL(blob);

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0, img.width, img.height);
            
            const baseWidth = 1280; // common thumbnail width
            const scaleFactor = canvas.width / baseWidth;

            // Define font sizes based on scale factor
            const hookFontSize = Math.max(60, 100 * scaleFactor);
            const charFontSize = Math.max(35, 55 * scaleFactor);
            const goalFontSize = Math.max(25, 40 * scaleFactor);

            // Define vertical positions and spacing
            const bottomPadding = Math.max(30, 40 * scaleFactor);
            const lineSpacing = Math.max(10, 15 * scaleFactor);
            
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';

            const goalY = canvas.height - bottomPadding;
            const charY = goalY - goalFontSize - lineSpacing;
            const hookY = charY - charFontSize - lineSpacing;

            // Draw texts from bottom to top
            drawTextWithOutline(ctx, textParts.goal, canvas.width / 2, goalY, goalFontSize, false);
            drawTextWithOutline(ctx, textParts.character, canvas.width / 2, charY, charFontSize, false);
            drawTextWithOutline(ctx, textParts.hook, canvas.width / 2, hookY, hookFontSize, true); // Hook is all caps
            
            URL.revokeObjectURL(objectUrl);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Failed to load image for canvas overlay."));
        };
        img.src = objectUrl;
    });
};