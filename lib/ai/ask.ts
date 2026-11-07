// The only file that talks to the AI (OpenAI). Every answer is checked against a schema, so callers get data, not loose text.
// Callers use the plain AiContent shape below, so moving to another AI provider only changes this file.
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import type { z } from 'zod';
import { OPENAI_MODEL } from '@/lib/config';

export type AiContent = { type: 'text'; text: string } | { type: 'image'; jpegBase64: string };

/** Returns null when the AI gives no usable answer. Throws if the call itself fails, so callers choose what happens next. */
export async function askAi<T extends z.ZodType>(schema: T, instructions: string, content: AiContent[]): Promise<z.infer<T> | null> {
  const response = await new OpenAI().responses.parse({
    model: OPENAI_MODEL,
    instructions,
    input: [
      {
        role: 'user',
        content: content.map((part) =>
          part.type === 'text'
            ? { type: 'input_text' as const, text: part.text }
            : { type: 'input_image' as const, image_url: `data:image/jpeg;base64,${part.jpegBase64}`, detail: 'high' as const },
        ),
      },
    ],
    text: { format: zodTextFormat(schema, 'answer') },
  });
  return (response.output_parsed as z.infer<T> | null | undefined) ?? null;
}
