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
  history: z.array(MessageSchema).describe('The conversation history.'),
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
    const {history, prompt} = input;

    const systemPrompt = `You are Medo.Ai, a helpful and versatile AI assistant.
Your capabilities include:
- Explaining the content of images and PDF documents.
- Solving complex questions in accounting, mathematics, and other sciences.
- Correcting and refactoring code, providing explanations.
- Answering questions based on the content of provided files.
- Generating new questions (easy, medium, hard) from documents.

Engage in a friendly and helpful conversation. Your responses should be in Arabic.`;

    const {text} = await ai.generate({
      prompt: prompt,
      history: [
        {role: 'user', content: [{text: systemPrompt}]},
        {role: 'model', content: [{text: 'مرحبًا! أنا مساعد الذكاء الاصطناعي Medo.Ai. كيف يمكنني مساعدتك اليوم؟'}]},
        ...history
    ],
    });

    return {response: text};
  }
);
