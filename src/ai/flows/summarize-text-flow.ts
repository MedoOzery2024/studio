'use server';
/**
 * @fileOverview Flow to summarize a given text content.
 *
 * - summarizeText - A function that handles the text summarization process.
 * - SummarizeTextInput - The input type for the summarizeText function.
 * - SummarizeTextOutput - The return type for the summarizeText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Defines the input schema for the flow
const SummarizeTextInputSchema = z.object({
  text: z.string().describe('The source text to summarize.'),
  language: z.string().describe('The language of the source text (e.g., "ar", "en").'),
});
export type SummarizeTextInput = z.infer<typeof SummarizeTextInputSchema>;

// Defines the output schema for the flow
const SummarizeTextOutputSchema = z.object({
  summary: z.string().describe('The summarized text.'),
});
export type SummarizeTextOutput = z.infer<typeof SummarizeTextOutputSchema>;


export async function summarizeText(input: SummarizeTextInput): Promise<SummarizeTextOutput> {
  return summarizeTextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeTextPrompt',
  input: {schema: SummarizeTextInputSchema},
  output: {schema: SummarizeTextOutputSchema},
  prompt: `You are an expert in text summarization. Your task is to provide a concise summary of the provided text.
The summary should be in the same language as the source text, which is '{{language}}'.

The output should be a JSON object that strictly follows the defined output schema.

Source Text:
'''
{{{text}}}
'''
`,
});

const summarizeTextFlow = ai.defineFlow(
  {
    name: 'summarizeTextFlow',
    inputSchema: SummarizeTextInputSchema,
    outputSchema: SummarizeTextOutputSchema,
  },
  async input => {
    const {output} = await prompt(input, { model: 'googleai/gemini-2.5-flash' });
    return output!;
  }
);
