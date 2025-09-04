import { GoogleGenAI, Type } from "@google/genai";
import type { Character, DirectingSettings, StoryboardScene, StoryIdea } from '../types';

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
    characterName: string;
    theme: string;
}


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


export const generateStoryboard = async (apiKey: string, options: StoryboardOptions): Promise<StoryboardScene[]> => {
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

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: storyboardSchema
        }
    });

    const parsedResult = safeJsonParse(response.text);
    return parsedResult.storyboard || [];
};

export const generateBlueprintPrompt = async (apiKey: string, sceneData: StoryboardScene, characters: Character[], directingSettings: DirectingSettings): Promise<string> => {
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
    
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text;
};

export const generateCinematicPrompt = async (apiKey: string, sceneData: StoryboardScene, characters: Character[], directingSettings: DirectingSettings): Promise<string> => {
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
    
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text;
};

export const developCharacter = async (apiKey: string, options: CharacterDevelopmentOptions): Promise<DevelopedCharacterData> => {
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

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: requestParts },
        config: {
            responseMimeType: "application/json",
            responseSchema: schema
        }
    });

    return safeJsonParse(response.text);
};

export const generateActionDna = async (apiKey: string, characterData: DevelopedCharacterData): Promise<string[]> => {
    const ai = getAiInstance(apiKey);
    
    const prompt = `Berikan 5-7 kata kunci "DNA Aksi" untuk mainan ini: ${JSON.stringify(characterData)}. Hasilnya harus dalam format JSON.`;

    const schema = {
        type: Type.OBJECT,
        properties: { 
            action_dna: { type: Type.ARRAY, items: { type: Type.STRING } } 
        },
        required: ["action_dna"]
    };
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: schema
        }
    });
    
    const parsed = safeJsonParse(response.text);
    return parsed.action_dna || [];
};

export const generateStoryIdeas = async (apiKey: string, options: StoryIdeaOptions): Promise<StoryIdea[]> => {
    const ai = getAiInstance(apiKey);
    const { contentFormat, characterName, theme } = options;
    
    const prompt = `Anda adalah penulis naskah YouTube. Berikan 3 ide kerangka naskah unik dalam Bahasa Indonesia.

    - Format Konten: "${contentFormat}"
    - Karakter Utama: "${characterName}"
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

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: schema
        }
    });

    const parsedResult = safeJsonParse(response.text);
    return parsedResult.ideas || [];
};