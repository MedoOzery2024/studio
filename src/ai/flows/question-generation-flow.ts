'use server';
/**
 * @fileOverview Flow to generate questions from a given text content.
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
  isInteractive: z.boolean().describe('True for multiple-choice questions, false for direct question-answer pairs.'),
});

// Defines the input schema for the flow
const GenerateQuestionsInputSchema = z.object({
  text: z.string().describe('The source text from which to generate questions.'),
  language: z.string().describe('The language of the source text (e.g., "ar", "en").'),
  numQuestions: z.number().min(1).max(100).describe('The number of questions to generate.'),
  interactive: z.boolean().describe('Whether to generate interactive (multiple-choice) questions or not.'),
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

const prompt = ai.definePrompt({
  name: 'generateQuestionsPrompt',
  input: {schema: GenerateQuestionsInputSchema},
  output: {schema: GenerateQuestionsOutputSchema},
  prompt: `You are an expert in creating educational content. Your task is to generate a list of questions based on the provided text.
The questions should be in the same language as the source text, which is '{{language}}'.

Generate exactly {{numQuestions}} questions.

If 'interactive' is true, generate multiple-choice questions with four options each.
If 'interactive' is false, generate direct questions with their corresponding answers (leave the 'options' array empty).

For every question, you MUST provide:
1.  A clear question ('question').
2.  An array of 4 options if interactive, or an empty array if not ('options').
3.  The single correct answer ('correctAnswer').
4.  A brief explanation of why the answer is correct ('explanation').
5.  A boolean flag 'isInteractive'.

CRITICAL: The output must be a valid JSON object that strictly adheres to the defined output schema. Do not output plain text.

Source Text:
'''
{{{text}}}
'''
`,
});

const generateQuestionsFlow = ai.defineFlow(
  {
    name: 'generateQuestionsFlow',
    inputSchema: GenerateQuestionsInputSchema,
    outputSchema: GenerateQuestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input, { model: 'googleai/gemini-2.5-flash' });
    return output!;
  }
);
