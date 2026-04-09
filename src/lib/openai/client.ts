import OpenAI from 'openai';

export function getOpenAI(apiKey?: string) {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OpenAI API Key fehlt');
  }
  return new OpenAI({ apiKey: key });
}

export const MODEL = 'gpt-4o-mini';
export const MODEL_SMART = 'gpt-4o';
