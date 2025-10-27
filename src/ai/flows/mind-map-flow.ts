'use server';
/**
 * @fileOverview Flow to generate a mind map from text or a file (image/pdf).
 *
 * - generateMindMap - A function that handles the mind map generation.
 * - GenerateMindMapInput - The input type for the function.
 * - GenerateMindMapOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MindMapNodeSchema = z.object({
  id: z.string().describe('A unique identifier for the node.'),
  text: z.string().describe('The text content of the node.'),
  children: z.lazy(() => MindMapNodeSchema.array()).optional().describe('Child nodes.'),
});

const GenerateMindMapInputSchema = z.object({
  context: z.string().describe("The text context to generate the mind map from."),
  file: z.object({
    url: z.string().describe("A data URI of the file. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  }).optional().describe('An optional file (image, pdf) to use as context.'),
});
export type GenerateMindMapInput = z.infer<typeof GenerateMindMapInputSchema>;

const GenerateMindMapOutputSchema = z.object({
  title: z.string().describe("The central title of the mind map."),
  mainIdeas: z.array(
    z.object({
      id: z.string(),
      text: z.string().describe("A main idea or top-level node."),
      subPoints: z.array(
        z.object({
          id: z.string(),
          text: z.string().describe("A sub-point related to the main idea."),
        })
      ).describe("A list of sub-points for the main idea."),
    })
  ).describe("An array of main ideas, each with its sub-points."),
});

export type GenerateMindMapOutput = z.infer<typeof GenerateMindMapOutputSchema>;

export async function generateMindMap(
  input: GenerateMindMapInput
): Promise<GenerateMindMapOutput> {
  return mindMapFlow(input);
}


const prompt = ai.definePrompt({
    name: 'mindMapPrompt',
    input: { schema: GenerateMindMapInputSchema },
    output: { schema: GenerateMindMapOutputSchema },
    prompt: `You are an expert in structuring information and creating mind maps.
Based on the provided context (text and/or a file), generate a mind map.

The mind map should have a central title, several main ideas branching from the title,
and several sub-points for each main idea.

Identify the core subject to use as the 'title'.
Extract the most important high-level concepts to use as 'mainIdeas'.
For each main idea, extract key details or related points to use as 'subPoints'.

Ensure the output is a valid JSON object that strictly adheres to the defined output schema.

Context: {{{context}}}
{{#if file}}
File Content:
{{media url=file.url}}
{{/if}}
`,
});


const mindMapFlow = ai.defineFlow(
  {
    name: 'mindMapFlow',
    inputSchema: GenerateMindMapInputSchema,
    outputSchema: GenerateMindMapOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
