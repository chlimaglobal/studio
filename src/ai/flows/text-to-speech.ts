
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import wav from 'wav';

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    const bufs: any[] = [];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}

export const textToSpeech = ai.defineFlow(
  {
    name: 'textToSpeechFlow',
    inputSchema: z.string(),
    outputSchema: z.object({ audioUrl: z.string() }),
  },
  async (text) => {
    const result = await ai.generate({
      model: 'googleai/gemini-1.5-flash', // TTS model might be different in this version
      prompt: text,
      config: {
        // @ts-ignore - This is a placeholder for potential TTS-specific config
        responseMimeType: "audio/wav", 
      },
    });

    const media = result.output;
    
    if (!media || typeof media !== 'string') {
      throw new Error('No audio content returned from TTS model.');
    }

    const audioBuffer = Buffer.from(media, 'base64');
    const wavBase64 = await toWav(audioBuffer);

    return {
      audioUrl: 'data:audio/wav;base64,' + wavBase64,
    };
  }
);
