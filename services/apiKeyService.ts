import { GoogleGenAI } from "@google/genai";

export const validateApiKey = async (apiKey: string): Promise<boolean> => {
  if (!apiKey || !apiKey.trim()) {
    return false;
  }
  try {
    const ai = new GoogleGenAI({ apiKey });
    // Use a lightweight, low-cost model method to validate the key.
    // generateContent with a tiny prompt and disabled thinking is a good option.
    await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'test',
        config: { 
            maxOutputTokens: 1,
            thinkingConfig: { thinkingBudget: 0 } 
        }
    });
    return true;
  } catch (error) {
    console.error("API Key validation failed:", error);
    return false;
  }
};
