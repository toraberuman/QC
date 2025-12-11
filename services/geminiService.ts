import { GoogleGenAI, Type } from "@google/genai";
import { QCStatus } from '../types';

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key is missing. AI features will be disabled.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

interface AIAnalysisResult {
  suggestedStatus: QCStatus;
  summary: string;
  categoryTag: string;
}

export const analyzeQCNotes = async (notes: string, productName: string): Promise<AIAnalysisResult | null> => {
  const ai = getAiClient();
  if (!ai) return null;

  try {
    const prompt = `
      Analyze the following Quality Control notes for a product.
      Product: ${productName}
      Notes: "${notes}"

      Your task:
      1. Determine the Pass/Fail/Warning status based on the severity of the defect described.
      2. Provide a very short (max 5 words) summary of the defect in Traditional Chinese (繁體中文).
      3. Tag the defect category (e.g., 外觀, 功能, 結構, 缺件) in Traditional Chinese (繁體中文).
      
      Return JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedStatus: {
              type: Type.STRING,
              enum: [QCStatus.PASS, QCStatus.FAIL, QCStatus.WARNING],
              description: "The suggested QC status"
            },
            summary: {
              type: Type.STRING,
              description: "A short summary of the issue in Traditional Chinese"
            },
            categoryTag: {
              type: Type.STRING,
              description: "Category of the issue in Traditional Chinese"
            }
          },
          required: ["suggestedStatus", "summary", "categoryTag"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    
    return JSON.parse(text) as AIAnalysisResult;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return null;
  }
};