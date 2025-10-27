'use server';
/**
 * @fileOverview Flow to generate questions from text or a file (image/pdf).
 *
 * - generateQuestions - A function that handles the question generation.
 * - GenerateQuestionsInput - The input type for the function.
 * - GenerateQuestionsOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const QuestionSchema = z.object({
  question: z.string().describe('The question text.'),
  options: z.array(z.string()).optional().describe('A list of multiple-choice options. Required for multiple-choice questions.'),
  correctAnswer: z.string().describe('The correct answer. For multiple-choice, this is one of the options. For essay questions, this is the ideal answer.'),
  explanation: z.string().describe('A brief explanation of why the correct answer is right.'),
});

export type Question = z.infer<typeof QuestionSchema>;

const GenerateQuestionsInputSchema = z.object({
  context: z.string().optional().describe("The text context to generate questions from."),
  file: z.object({
    url: z.string().describe("A data URI of the file. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  }).optional().describe('An optional file (image, pdf) to use as context.'),
  count: z.number().min(1).describe('The number of questions to generate.'),
  questionType: z.enum(['multiple-choice', 'essay']).describe('The type of questions to generate.'),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe('The difficulty level of the questions.'),
});

const GenerateQuestionsOutputSchema = z.object({
  questions: z.array(QuestionSchema.extend({
    questionType: z.enum(['multiple-choice', 'essay']).describe('The type of question.'),
  })),
});


export type GenerateQuestionsInput = z.infer<typeof GenerateQuestionsInputSchema>;
export type GenerateQuestionsOutput = z.infer<typeof GenerateQuestionsOutputSchema>;


export async function generateQuestions(
  input: GenerateQuestionsInput
): Promise<GenerateQuestionsOutput> {
  return generateQuestionsFlow(input);
}

const prompt = ai.definePrompt({
    name: 'generateQuestionsPrompt',
    input: { schema: GenerateQuestionsInputSchema },
    output: { schema: GenerateQuestionsOutputSchema },
    prompt: `You are an expert educator and exam creator. Your task is to generate a set of questions based on the provided context (text and/or file content).

**Instructions:**
1.  **Analyze the Context:** Carefully analyze the provided text and/or file content.
2.  **Detect Language:** Automatically detect the language of the input context.
3.  **Generate in Same Language:** Generate all questions, options, answers, and explanations in the **same language** as the detected context.
4.  **Adhere to Request:** Generate exactly {{count}} questions of the type '{{questionType}}' at a '{{difficulty}}' difficulty level.
5.  **For 'multiple-choice' questions:**
    *   Set 'questionType' to 'multiple-choice'.
    *   Create a clear and concise question.
    *   Provide exactly 4 distinct options.
    *   One option must be the correct answer.
    *   Provide a brief but thorough explanation for why the answer is correct.
6.  **For 'essay' questions:**
    *   Set 'questionType' to 'essay'.
    *   Create a thought-provoking question that requires a detailed answer.
    *   Provide a comprehensive and ideal 'correctAnswer' for the essay question.
    *   Provide a brief 'explanation' outlining the key points the ideal answer should cover.
7.  **Strictly follow the JSON output schema.**

**Context:**
{{#if context}}
Text: {{{context}}}
{{/if}}
{{#if file}}
File Content:
{{media url=file.url}}
{{/if}}
`,
});


const generateQuestionsFlow = ai.defineFlow(
  {
    name: 'generateQuestionsFlow',
    inputSchema: GenerateQuestionsInputSchema,
    outputSchema: GenerateQuestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
