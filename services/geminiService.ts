import { GoogleGenAI, type Operation } from "@google/genai";
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

const isApiKeyInvalidError = (error: any): boolean => {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        // Look for common API key error messages from Google AI SDK
        return message.includes('api key not valid') ||
               message.includes('permission denied') ||
               message.includes('api_key_invalid') ||
               // Also check for generic 400/403 which are often auth related
               (message.includes('[400') || message.includes('[403'));
    }
    return false;
};

export const executeWithFailover = async <T>({
    allKeys,
    activeKey,
    onKeyUpdate,
    apiExecutor,
}: {
    allKeys: string[];
    activeKey: string | null;
    onKeyUpdate: (newKey: string) => void;
    apiExecutor: (apiKey: string) => Promise<T>;
}): Promise<T> => {
    if (!activeKey || allKeys.length === 0) {
        throw new Error("No active API key available to make a request.");
    }

    const orderedKeys = [
        activeKey,
        ...allKeys.filter(k => k !== activeKey && k.trim() !== '')
    ];

    let lastError: Error | null = null;

    for (const key of orderedKeys) {
        try {
            const result = await apiExecutor(key);
            // Success! If we used a fallback key, update the active key in the app state.
            if (key !== activeKey) {
                console.log(`Successfully used fallback key starting with ${key.substring(0, 4)}. Updating active key.`);
                onKeyUpdate(key);
            }
            return result;
        } catch (error) {
            if (isApiKeyInvalidError(error)) {
                console.warn(`API key starting with ${key.substring(0, 4)}... failed, trying next.`);
                lastError = error as Error;
                // Continue to the next key in the loop
            } else {
                // It's a different kind of error (e.g., rate limit, bad prompt, server error),
                // so we shouldn't try other keys. Re-throw it.
                throw error;
            }
        }
    }

    // If the loop completes, all keys have failed.
    throw new Error(`All available API keys failed. Last error: ${lastError?.message || 'Unknown error'}`);
};

export interface FailoverParams {
    allKeys: string[];
    activeKey: string | null;
    onKeyUpdate: (newKey: string) => void;
}

export const generateVideo = async ({ allKeys, activeKey, onKeyUpdate, options }: FailoverParams & { options: GeneratorOptions }): Promise<string> => {
     return executeWithFailover({
        allKeys,
        activeKey,
        onKeyUpdate,
        apiExecutor: async (apiKey) => {
            const ai = new GoogleGenAI({ apiKey });

             const videoParams = [
                `- Resolution: ${options.resolution}`,
                `- Sound: ${options.enableSound ? 'enabled' : 'disabled'}`
            ];

            // Only add aspect ratio if there is no reference image
            if (!options.image) {
                videoParams.unshift(`- Aspect Ratio: ${options.aspectRatio}`);
            }

            const augmentedPrompt = `
              ${options.prompt}
        
              ---
              Video generation parameters:
              ${videoParams.join('\n')}
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
            
            // FIX: Use the Operation type for the operation variable, as LroOperation and VideosOperation are not exported.
            // FIX: The Operation type is generic. Since the response type for videos is not exported, we use `any` as the type argument.
            let operation: Operation<any> = await makeApiCallWithRetry(() => ai.models.generateVideos(requestPayload));
        
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
        }
    });
};