import { GoogleGenAI, Type } from "@google/genai";
import { DatabaseItem } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const searchConstructionItems = async (query: string): Promise<DatabaseItem[]> => {
  try {
    // If no API key, return empty array to fallback to mock data in component
    if (!process.env.API_KEY) {
        console.warn("No API Key found, using mock data only.");
        return [];
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate 3 realistic Brazilian construction items (SINAPI style) for the search query: "${query}". 
      Vary the dates so some are from 2019 and some are from 2024 or 2025.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              code: { type: Type.STRING },
              source: { type: Type.STRING, enum: ["SINAPI", "SICRO"] },
              description: { type: Type.STRING },
              unit: { type: Type.STRING, enum: ["m", "m²", "m³", "un", "kg", "h"] },
              price: { type: Type.NUMBER },
              type: { type: Type.STRING, enum: ["INSUMO", "COMPOSICAO"] },
              date: { type: Type.STRING, description: "ISO date format YYYY-MM-DD" }
            },
            required: ["code", "source", "description", "unit", "price", "type", "date"]
          }
        }
      }
    });

    const items = JSON.parse(response.text || "[]");
    
    // Add IDs
    return items.map((item: any, index: number) => ({
      ...item,
      id: `gen-${Date.now()}-${index}`
    }));

  } catch (error) {
    console.error("Gemini search failed:", error);
    return [];
  }
};