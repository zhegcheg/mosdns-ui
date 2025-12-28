
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

const MODEL_NAME = "gemini-3-flash-preview";

export const analyzeConfig = async (yaml: string) => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Analyze this MosDNS YAML configuration and provide 3 key optimizations or security improvements. Focus on performance, privacy, and best practices.

Config:
${yaml}

Return your response as a clear, concise bulleted list in markdown.`,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Failed to analyze configuration. Please check your connection and API key.";
  }
};

export const explainRule = async (ruleText: string) => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Explain what this MosDNS rule or plugin configuration does in simple terms:
      
      ${ruleText}`,
    });
    return response.text;
  } catch (error) {
    return "Explanation unavailable.";
  }
};

export const askAiWithContext = async (question: string, contextData: any) => {
  try {
    const contextString = JSON.stringify(contextData, null, 2);
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `You are an expert MosDNS administrator assistant. 
      
      Here is the current system status and recent logs (in JSON format):
      ${contextString}
      
      User Question: "${question}"
      
      Answer the user's question based on the provided data. 
      If the data shows errors (SERVFAIL, NXDOMAIN) or high latency, point them out.
      Keep the answer helpful, concise, and friendly. Use Markdown for formatting.`,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "I'm sorry, I couldn't process your request right now. Please check your API key.";
  }
};
