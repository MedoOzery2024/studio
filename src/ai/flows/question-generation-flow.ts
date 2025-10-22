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
const GenerateQuestionsOutputSchema = z.object({
  questions: z.array(QuestionSchema),
});
export type GenerateQuestionsOutput = z.infer<typeof GenerateQuestionsOutputSchema>;
export type Question = z.infer<typeof QuestionSchema>;


export async function generateQuestions(input: GenerateQuestionsInput): Promise<GenerateQuestionsOutput> {
  return generateQuestionsFlow(input);
}

const generateQuestionsFlow = ai.defineFlow(
  {
    name: 'generateQuestionsFlow',
    inputSchema: GenerateQuestionsInputSchema,
    outputSchema: GenerateQuestionsOutputSchema,
  },
  async input => {
    const { text, image, language, numQuestions, interactive, difficulty } = input;

    const promptParts: any[] = [];

    // Add image/pdf first if it exists
    if (image) {
        promptParts.push({ media: { url: image } });
    } else if (!text) {
        throw new Error("Either text or an image must be provided to generate questions.");
    }
    
    // Construct the text prompt
    const textPrompt = `You are an expert in creating educational content. Your task is to generate a list of questions based on the provided context (text or file).
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

CRITICAL: The output MUST be a valid JSON object string that adheres to the defined schema. Do not add any text before or after the JSON object. Do not use markdown backticks like \`\`\`json.

${text ? `\nSource Text:\n\'\'\'\n${text}\n\'\'\'` : ''}
`;

    promptParts.push({ text: textPrompt });

    // Use a more robust model and remove the output format constraint
    const llmResponse = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: promptParts,
      config: {
        temperature: 0.5,
      }
    });
    
    let responseText = llmResponse.text;
    
    if (!responseText) {
      throw new Error("Failed to get a response from the AI model.");
    }
    
    // Clean the response to ensure it's a valid JSON string
    // This is a robust way to handle responses wrapped in markdown
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      responseText = jsonMatch[0];
    } else {
        console.error("No valid JSON object found in the response:", responseText);
        throw new Error("Response did not contain a valid JSON object.");
    }

    try {
      const output = JSON.parse(responseText) as GenerateQuestionsOutput;
      // Further validation with Zod if necessary
      GenerateQuestionsOutputSchema.parse(output);
      return output;
    } catch (e) {
        console.error("Failed to parse JSON response from LLM:", responseText, e);
        throw new Error("Failed to get a valid structured response from the AI model.");
    }
  }
);
