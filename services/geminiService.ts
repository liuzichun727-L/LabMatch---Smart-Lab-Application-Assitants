
import { GoogleGenAI, Type } from "@google/genai";
import { Professor, StudentProfile, EmailDraft, Language } from "../types";

/**
 * Robustly extracts JSON from a string.
 * Specifically handles cases where Google Search Grounding inserts citations like [1] or [1, 2]
 * and filters out markdown formatting or conversational noise.
 */
const extractJson = (text: string | undefined) => {
  if (!text) return null;

  // 1. Clean citations that break JSON structure, e.g., "name": "Prof [1]" or [1,2] or [1-3]
  let cleaned = text.replace(/\[\d+(?:[-,\s]+\d+)*\]/g, "");

  // 2. Remove markdown code blocks if present
  cleaned = cleaned.replace(/```json/g, "").replace(/```/g, "").trim();

  // 3. Attempt direct parse
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // 4. Fallback: Find the most likely JSON block (starts with [ or { and ends with ] or })
    const firstBracket = cleaned.indexOf('[');
    const firstBrace = cleaned.indexOf('{');
    let start = -1;
    if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) start = firstBracket;
    else if (firstBrace !== -1) start = firstBrace;

    if (start !== -1) {
      const lastBracket = cleaned.lastIndexOf(']');
      const lastBrace = cleaned.lastIndexOf('}');
      let end = -1;
      if (lastBracket !== -1 && (lastBrace === -1 || lastBracket > lastBrace)) end = lastBracket;
      else if (lastBrace !== -1) end = lastBrace;

      if (end !== -1 && end > start) {
        const potentialJson = cleaned.substring(start, end + 1);
        try {
          return JSON.parse(potentialJson);
        } catch (e2) {
          console.error("Advanced JSON extraction failed. Raw text snippet:", cleaned.substring(0, 200));
        }
      }
    }
  }
  return null;
};

/**
 * Parses CV content to implement autofill features.
 */
export const parseCV = async (text: string): Promise<{ name: string; education: string; skills: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Extract profile information from this student's CV text. 
  Return a JSON object with strictly these keys: "name", "education" (university and degree), and "skills" (technical skills, comma separated).
  
  CV Text:
  ${text.substring(0, 8000)}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            education: { type: Type.STRING },
            skills: { type: Type.STRING }
          },
          required: ["name", "education", "skills"]
        }
      }
    });

    return extractJson(response.text) || { name: "", education: "", skills: "" };
  } catch (e) {
    console.error("parseCV failed:", e);
    return { name: "", education: "", skills: "" };
  }
};

/**
 * Searches for professor info using Google Search grounding.
 * Upgraded to gemini-3-pro-preview for better stability with grounding tools.
 */
export const findProfessors = async (university: string, department: string): Promise<{ professors: Professor[], sources: { title?: string, uri?: string }[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Search for a list of at least 15 active faculty members (professors) in the ${department} department at ${university}.
  ONLY provide information from official ${university} (.edu) websites.
  For each faculty member, include:
  - "name": full name
  - "title": academic rank (e.g., Assistant Professor)
  - "researchInterests": string array of topics
  - "bio": a 2-sentence summary of their research focus or lab mission

  Output the list as a valid JSON array of objects.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are an academic research assistant. Always respond with a valid JSON array of professor objects. Ground every detail in Google Search results from official university domains. Do not include any text other than the JSON."
      }
    });

    const professors = extractJson(response.text || "[]");
    
    // Extract grounding sources as required by Gemini API guidelines
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources = groundingChunks?.map((chunk: any) => chunk.web).filter(Boolean) || [];
    
    return { 
      professors: Array.isArray(professors) ? professors : [], 
      sources 
    };
  } catch (e) {
    console.error("findProfessors critical failure:", e);
    throw e;
  }
};

/**
 * Ranks professors based on student profile alignment.
 */
export const matchStudentWithProfessors = async (profile: StudentProfile, professors: Professor[]): Promise<Professor[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Limit the list to ensure prompt fits within context window
  const profList = professors.slice(0, 25);

  const prompt = `Analyze research alignment between this student and the provided faculty members.
  
  Student Data:
  - Education: ${profile.education}
  - Skills: ${profile.skills}
  - Interests: ${profile.interests}
  
  Professors:
  ${JSON.stringify(profList)}

  Return a JSON array of objects with keys: "name", "matchScore" (0-100), "tier" (1, 2, or 3), and "matchReason" (why they fit).`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              matchScore: { type: Type.NUMBER },
              tier: { type: Type.NUMBER },
              matchReason: { type: Type.STRING }
            },
            required: ["name", "matchScore", "tier", "matchReason"]
          }
        }
      }
    });

    const matchingData = extractJson(response.text || "[]");
    
    if (Array.isArray(matchingData)) {
      return matchingData.map(match => {
        const original = professors.find(p => p.name === match.name) || professors[0];
        return { ...original, ...match };
      }).sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    }
    
    return professors.map(p => ({ ...p, matchScore: 50, tier: 2 }));
  } catch (e) {
    console.error("matchStudentWithProfessors error:", e);
    return professors.map(p => ({ ...p, matchScore: 50, tier: 2 }));
  }
};

/**
 * Generates tailored application emails.
 */
export const generateDraftEmail = async (profile: StudentProfile, professor: Professor, lang: Language): Promise<EmailDraft> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const langPrompt = lang === 'zh' ? "Chinese" : "English";
  
  const prompt = `Write a professional lab inquiry email in ${langPrompt}.
  Student: ${profile.name} (${profile.education}), Skills: ${profile.skills}
  Recipient: Prof. ${professor.name} (Research: ${professor.bio})
  
  Tone: Professional, direct, and research-focused.
  Format: JSON with 'subject' and 'body'.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            body: { type: Type.STRING }
          },
          required: ["subject", "body"]
        }
      }
    });

    return extractJson(response.text) || { subject: "Research Inquiry", body: "Draft failed to generate." };
  } catch (e) {
    console.error("generateDraftEmail failed:", e);
    return { subject: "Inquiry", body: "Could not generate email draft at this time." };
  }
};
