'use server';
/**
 * @fileOverview Flow to transcribe audio content to text.
 *
 * - transcribeAudio - A function that handles the audio transcription process.
 * - TranscribeAudioInput - The input type for the transcribeAudio function.
 * - TranscribeAudioOutput - The return type for the transcribeAudio function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Defines the input schema for the flow
const TranscribeAudioInputSchema = z.object({
  audio: z.object({
    url: z.string().describe("A data URI of the audio to transcribe. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  }),
});
export type TranscribeAudioInput = z.infer<typeof TranscribeAudioInputSchema>;

// Defines the output schema for the flow
const TranscribeAudioOutputSchema = z.object({
  text: z.string().describe('The transcribed text.'),
});
export type TranscribeAudioOutput = z.infer<typeof TranscribeAudioOutputSchema>;


export async function transcribeAudio(input: TranscribeAudioInput): Promise<TranscribeAudioOutput> {
  return transcribeAudioFlow(input);
}

const transcribeAudioFlow = ai.defineFlow(
  {
    name: 'transcribeAudioFlow',
    inputSchema: TranscribeAudioInputSchema,
    outputSchema: TranscribeAudioOutputSchema,
  },
  async (input) => {
    const { text } = await ai.generate({
      prompt: [
        { media: input.audio },
        { text: 'Transcribe this audio file.' },
      ],
      model: "googleai/gemini-2.5-flash"
    });
    
    return { text };
  }
);
