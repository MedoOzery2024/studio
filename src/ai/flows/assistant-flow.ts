'use server';
/**
 * @fileOverview A conversational AI assistant flow.
 *
 * - assistantFlow - A function that handles the conversation process.
 * - AssistantInput - The input type for the assistantFlow function.
 * - AssistantOutput - The return type for the assistantFlow function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.array(z.object({text: z.string()})),
});

const AssistantInputSchema = z.object({
  prompt: z.string().describe('The user\'s latest message.'),
   file: z.object({
    url: z.string().describe("A data URI of the file. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  }).optional().describe('An optional file (image, pdf) to include with the prompt.'),
});
export type AssistantInput = z.infer<typeof AssistantInputSchema>;

const AssistantOutputSchema = z.object({
  response: z.string().describe('The AI\'s response.'),
});
export type AssistantOutput = z.infer<typeof AssistantOutputSchema>;

export async function askAssistant(
  input: AssistantInput
): Promise<AssistantOutput> {
  return assistantFlow(input);
}

const assistantFlow = ai.defineFlow(
  {
    name: 'assistantFlow',
    inputSchema: AssistantInputSchema,
    outputSchema: AssistantOutputSchema,
  },
  async input => {
    const {prompt, file} = input;

    const systemPrompt = `You are Medo.Ai, a helpful and versatile AI assistant.
Your capabilities include:
- Explaining the content of images and PDF documents.
- Solving complex questions in accounting, mathematics, and other sciences.
- Correcting and refactoring code, providing explanations.
- Answering questions based on the content of provided files.
- Generating new questions (easy, medium, hard) from documents.

Engage in a friendly and helpful conversation. Your responses should be in Arabic.`;

    const model = ai.model('gemini-pro');

    const fullPrompt: any[] = [
        {text: systemPrompt} // Add system context
    ];
    if (file) {
      fullPrompt.push({ media: { url: file.url } });
    }
    fullPrompt.push({ text: prompt });
    
    const {text} = await ai.generate({
      model,
      prompt: fullPrompt,
    });

    return {response: text};
  }
);
