import { GoogleGenAI } from "@google/genai";
import type { GeneratorOptions } from '../types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const makeApiCallWithRetry = async <T>(apiCall: () => Promise<T>, maxRetries = 3): Promise<T> => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await apiCall();
        } catch (error) {
            if (error instanceof Error && (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED'))) {
                if (attempt === maxRetries - 1) {
                    // Last attempt failed, throw a user-friendly error
                    throw new Error('errorRateLimit');
                }
                const delayTime = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
                console.warn(`Rate limit hit. Retrying in ${delayTime.toFixed(0)}ms... (Attempt ${attempt + 1}/${maxRetries})`);
                await delay(delayTime);
            } else {
                // Not a rate limit error, fail immediately
                throw error;
            }
        }
    }
    // This part should be unreachable, but typescript needs a return path.
    throw new Error('errorRateLimit');
};


export const generateVideo = async (apiKey: string, options: GeneratorOptions): Promise<string> => {
    if (!apiKey) {
        throw new Error("API Key is missing. Please add a valid API key.");
    }

    const ai = new GoogleGenAI({ apiKey });

    const augmentedPrompt = `
      ${options.prompt}

      ---
      Video generation parameters:
      - Aspect Ratio: ${options.aspectRatio}
      - Resolution: ${options.resolution}
      - Sound: ${options.enableSound ? 'enabled' : 'disabled'}
    `;

    const requestPayload: any = {
        model: 'veo-2.0-generate-001',
        prompt: augmentedPrompt,
        config: {
            numberOfVideos: 1,
        }
    };

    if (options.image) {
        requestPayload.image = {
            imageBytes: options.image.base64,
            mimeType: options.image.mimeType,
        };
    }
    
    let operation = await makeApiCallWithRetry(() => ai.models.generateVideos(requestPayload));

    while (!operation.done) {
        await delay(10000); // Poll every 10 seconds
        operation = await makeApiCallWithRetry(() => ai.operations.getVideosOperation({ operation }), 5);
    }

    if (operation.error) {
        throw new Error(`Video generation failed: ${operation.error.message}`);
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

    if (!downloadLink) {
        throw new Error("Video generation completed, but no download link was found.");
    }
    
    const videoResponse = await fetch(`${downloadLink}&key=${apiKey}`);
    if (!videoResponse.ok) {
        const errorBody = await videoResponse.text();
        throw new Error(`Failed to fetch video from URI. Status: ${videoResponse.statusText}. Body: ${errorBody}`);
    }

    const videoBlob = await videoResponse.blob();
    
    return URL.createObjectURL(videoBlob);
};