'use server';
/**
 * @fileOverview Flow to correct a user's essay answer.
 *
 * - correctEssay - A function that handles the correction process.
 * - CorrectEssayInput - The input type for the function.
 * - CorrectEssayOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const CorrectEssayInputSchema = z.object({
  question: z.string().describe('The original essay question.'),
  idealAnswer: z.string().describe('The ideal, correct answer for the question.'),
  userAnswer: z.string().describe("The user's submitted answer."),
});
export type CorrectEssayInput = z.infer<typeof CorrectEssayInputSchema>;

const CorrectEssayOutputSchema = z.object({
  isCorrect: z.boolean().describe('Whether the user\'s answer is considered correct or satisfactory.'),
  feedback: z.string().describe('Constructive feedback for the user, explaining what was good and what could be improved.'),
});
export type CorrectEssayOutput = z.infer<typeof CorrectEssayOutputSchema>;

export async function correctEssay(
  input: CorrectEssayInput
): Promise<CorrectEssayOutput> {
  return correctEssayFlow(input);
}

const prompt = ai.definePrompt({
  name: 'correctEssayPrompt',
  input: { schema: CorrectEssayInputSchema },
  output: { schema: CorrectEssayOutputSchema },
  prompt: `You are an expert AI teacher. Your task is to evaluate a user's answer to an essay question.

**Instructions:**
1.  **Compare Answers:** Carefully compare the User's Answer to the Ideal Answer for the given Question.
2.  **Determine Correctness:** Decide if the user's answer is substantially correct. It doesn't have to be a perfect match, but it should capture the main points of the ideal answer. Set 'isCorrect' to true or false accordingly.
3.  **Provide Feedback:** Write clear, constructive feedback for the user in the same language as the question.
    *   If the answer is correct, praise the user and briefly mention why it's a good answer.
    *   If the answer is incorrect or incomplete, gently point out the missing or wrong parts and guide the user toward the ideal answer without being discouraging.
4.  **Strictly follow the JSON output schema.**

**Language:** The user is interacting in Arabic. All of your feedback MUST be in ARABIC.

---
**Question:**
{{{question}}}

**Ideal Answer:**
{{{idealAnswer}}}

**User's Answer to Evaluate:**
{{{userAnswer}}}
---
`,
});

const correctEssayFlow = ai.defineFlow(
  {
    name: 'correctEssayFlow',
    inputSchema: CorrectEssayInputSchema,
    outputSchema: CorrectEssayOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
