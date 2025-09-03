
import { GoogleGenAI, Type } from "@google/genai";
import type { Question } from "../types";
import { QuestionType } from "../types";

// Use the VITE_ prefix for client-side environment variables and the correct key name.
const API_KEY = import.meta.env.VITE_API_KEY;

let ai: GoogleGenAI | null = null;
if (API_KEY) {
    ai = new GoogleGenAI({ apiKey: API_KEY });
}

export const isGeminiConfigured = (): boolean => {
    return !!API_KEY;
};

const getAi = (): GoogleGenAI => {
    if (!ai) {
        throw new Error("Cannot use AI features. The VITE_API_KEY has not been configured by the application developer.");
    }
    return ai;
};

const questionTypeValues = Object.values(QuestionType);

const formSchema = {
    type: Type.OBJECT,
    properties: {
        questions: {
            type: Type.ARRAY,
            description: "A list of survey questions.",
            items: {
                type: Type.OBJECT,
                properties: {
                    questionText: {
                        type: Type.STRING,
                        description: "The text of the question.",
                    },
                    type: {
                        type: Type.STRING,
                        enum: questionTypeValues,
                        description: "The type of the question.",
                    },
                    options: {
                        type: Type.ARRAY,
                        description: "A list of options for multiple choice, checkbox, or scale questions. For SCALE, provide one number as a string (e.g. '5' or '10').",
                        items: {
                            type: Type.STRING,
                        },
                    },
                    isRequired: {
                        type: Type.BOOLEAN,
                        description: "Whether the question is required.",
                    },
                },
                 required: ["questionText", "type", "isRequired"],
            },
        },
    },
    required: ["questions"],
};

/**
 * Parses potentially dirty JSON from an LLM response.
 * It handles markdown code blocks and trims extraneous text.
 * @param text The raw text from the LLM.
 * @returns The parsed JSON object.
 */
const parseCleanJson = (text: string): any => {
    // The model can sometimes wrap the JSON in markdown code blocks ` ```json ... ``` `
    // or add other text before or after. We'll find the first '{' and the last '}'
    // to extract the valid JSON object.
    const firstBracket = text.indexOf('{');
    const lastBracket = text.lastIndexOf('}');
    
    if (firstBracket === -1 || lastBracket === -1 || lastBracket < firstBracket) {
        console.error("Could not find a valid JSON object in the response string.", text);
        throw new Error("AI response did not contain a valid JSON object.");
    }
    
    const jsonString = text.substring(firstBracket, lastBracket + 1);
    
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("Failed to parse cleaned JSON:", e);
        console.error("Original text was:", text);
        console.error("Attempted to parse:", jsonString);
        throw new Error("AI response was not valid JSON, even after cleaning.");
    }
};


export const generateFormQuestions = async (topic: string): Promise<Question[]> => {
    try {
        const response = await getAi().models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Generate a comprehensive and high-quality list of about 8-10 survey questions for a Google Form about "${topic}". The questions should cover a variety of types (TEXT, PARAGRAPH_TEXT, MULTIPLE_CHOICE, CHECKBOX, SCALE) to gather diverse feedback. Ensure the questions are clear, unbiased, and relevant to the topic.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: formSchema,
            },
        });
        
        const rawText = response.text;
        const parsed = parseCleanJson(rawText);
        
        if (parsed && Array.isArray(parsed.questions)) {
            // Validate that question types are valid enums
            return parsed.questions.filter((q: any) => questionTypeValues.includes(q.type));
        }
        
        throw new Error("Failed to parse questions from AI response.");

    } catch (error) {
        console.error("Error generating form questions:", error);
         if (error instanceof Error && error.message.startsWith("AI response was not valid JSON")) {
             throw error;
        }
        throw new Error("Failed to generate questions from AI. Please check your API key and try again.");
    }
};

export const refineFormQuestions = async (currentQuestions: Question[], prompt: string): Promise<Question[]> => {
    try {
        const fullPrompt = `
            You are an AI assistant helping a user refine a survey.
            Here is the user's refinement request: "${prompt}"

            Here is the current list of questions in JSON format:
            ---
            ${JSON.stringify(currentQuestions, null, 2)}
            ---

            Your task is to modify the provided JSON list of questions based on the user's request.
            - Analyze the user's request and apply the changes to the question list.
            - You can add, remove, or modify questions and their properties (text, type, options, etc.).
            - Return *only* the new, complete list of questions in the exact same JSON format and schema. 
            - Do not add any explanatory text, comments, or markdown formatting before or after the JSON object.
        `;

        const response = await getAi().models.generateContent({
            model: "gemini-2.5-flash",
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: formSchema,
            },
        });
        
        const rawText = response.text;
        const parsed = parseCleanJson(rawText);

        if (parsed && Array.isArray(parsed.questions)) {
            return parsed.questions.filter((q: any) => questionTypeValues.includes(q.type));
        }

        throw new Error("Failed to parse refined questions from AI response.");

    } catch (error) {
        console.error("Error refining form questions:", error);
        if (error instanceof Error && error.message.startsWith("AI response was not valid JSON")) {
             throw error;
        }
        throw new Error("Failed to refine questions with AI. Please try again.");
    }
};


export const analyzeData = async (data: string, userPrompt: string): Promise<string> => {
    try {
        const fullPrompt = `
            You are an expert data analyst. The user has provided survey questions and the corresponding response data.
            Your task is to analyze the responses in the context of the questions and fulfill the user's request.

            **User's Request:** "${userPrompt}"

            **Provided Data:**
            The data below is structured in two parts: first, a list of the survey questions, and second, the response data in Tab-Separated Value (TSV) format. The columns in the TSV data correspond to the questions.
            ---
            ${data}
            ---

            Please provide a clear, concise, and insightful analysis.
            - Directly reference the questions when analyzing the corresponding answers.
            - Structure your response in well-formatted markdown. Include headings, lists, and bold text for readability.
            - If the user asks for recommendations, ensure they are actionable and directly supported by the data provided.
        `;
        
        const response = await getAi().models.generateContent({
            model: "gemini-2.5-flash",
            contents: fullPrompt,
        });

        return response.text;

    } catch (error) {
        console.error("Error analyzing data:", error);
        throw new Error("Failed to analyze data with AI. Please try again.");
    }
};
