'use server';
/**
 * @fileOverview Flow to generate questions from a given text content or file.
 *
 * - generateQuestions - A function that handles the question generation process.
 * - GenerateQuestionsInput - The input type for the generateQuestions function.
 * - GenerateQuestionsOutput - The return type for the generateQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Defines the structure for a single question
const QuestionSchema = z.object({
  question: z.string().describe('The question text.'),
  options: z.array(z.string()).describe('An array of possible answers for multiple-choice questions. Empty for non-interactive questions.'),
  correctAnswer: z.string().describe('The correct answer.'),
  explanation: z.string().describe('An explanation for why the answer is correct.'),
});

// Defines the input schema for the flow
const GenerateQuestionsInputSchema = z.object({
  text: z.string().optional().describe('The source text from which to generate questions.'),
  image: z.string().optional().describe("An optional image/PDF file (as a data URI) to analyze for question generation."),
  language: z.string().describe('The language of the source text (e.g., "ar", "en").'),
  numQuestions: z.number().min(1).max(100).describe('The number of questions to generate.'),
  interactive: z.boolean().describe('Whether to generate interactive (multiple-choice) questions or not.'),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe('The difficulty level of the questions.'),
});
export type GenerateQuestionsInput = z.infer<typeof GenerateQuestionsInputSchema>;

// Defines the output schema for the flow
// Note: The flow itself will return a string, which the client will parse.
const GenerateQuestionsOutputSchema = z.object({
  questions: z.array(QuestionSchema),
});
export type GenerateQuestionsOutput = z.infer<typeof GenerateQuestionsOutputSchema>;
export type Question = z.infer<typeof QuestionSchema>;


export async function generateQuestions(input: GenerateQuestionsInput): Promise<string> {
  return generateQuestionsFlow(input);
}

const generateQuestionsFlow = ai.defineFlow(
  {
    name: 'generateQuestionsFlow',
    inputSchema: GenerateQuestionsInputSchema,
    outputSchema: z.string(), // The flow now returns a raw string
  },
  async input => {
    const { text, image, language, numQuestions, interactive, difficulty } = input;

    const promptParts: any[] = [];
    
    if (!text && !image) {
        throw new Error("Either text or an image must be provided to generate questions.");
    }
    
    // Add image/pdf first if it exists
    if (image) {
        promptParts.push({ media: { url: image } });
    }
    
    // Construct the text prompt
    const fullPromptText = `You are an expert in creating educational content. Your task is to generate a list of questions based on the provided context (text or file).
The questions should be in the same language as the source text, which is '${language}'.
The questions should be of '${difficulty}' difficulty.

Generate exactly ${numQuestions} questions.

If 'interactive' is true, you MUST generate multiple-choice questions with four options each.
If 'interactive' is false, generate direct questions with their corresponding answers and an empty 'options' array.

For every question, you MUST provide:
1.  A clear question ('question').
2.  An array of 4 options if interactive, or an empty array if not ('options').
3.  The single correct answer ('correctAnswer').
4.  A brief explanation of why the answer is correct ('explanation').

CRITICAL: The output MUST be a valid JSON object string that adheres to the defined schema. Do not add any text before or after the JSON object. Do not use markdown backticks like \`\`\`json. Your entire response should be only the JSON object.

${text ? `\nSource Text:\n\'\'\'\n${text}\n\'\'\'` : ''}
`;

    promptParts.push({ text: fullPromptText });

    const llmResponse = await ai.generate({
      model: 'googleai/gemini-2.5-flash', // Using a more robust model
      prompt: promptParts,
      config: {
        temperature: 0.3,
      }
    });
    
    const responseText = llmResponse.text;
    
    if (!responseText) {
      throw new Error("Failed to get a response from the AI model.");
    }

    // Return the raw text. The client will handle parsing.
    return responseText;
  }
);
