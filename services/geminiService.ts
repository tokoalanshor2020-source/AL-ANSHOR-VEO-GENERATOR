import { GoogleGenAI } from "@google/genai";
import type { GeneratorOptions } from '../types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
    
    let operation = await ai.models.generateVideos(requestPayload);

    while (!operation.done) {
        await delay(10000); // Poll every 10 seconds
        operation = await ai.operations.getVideosOperation({ operation });
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