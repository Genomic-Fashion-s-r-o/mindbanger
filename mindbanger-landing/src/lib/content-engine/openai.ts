import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { buildDailyContext, formatContextForPrompt } from './context';
import { generateThemePrompt, translatePrompt, translateMindsetPrompt, enhanceTextWithSSMLPrompt } from './prompts';
import { MASTER_SYSTEM_PROMPT } from './master-prompt';
import { DailyContentSchema, DailyContent, MasterContentSchema, MasterContent, MindsetTranslationSchema, MindsetTranslation } from './schemas';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key_for_build', // Fallback for build time
});

/**
 * Generates TRILINGUAL master content (EN, SK, CS) using the Master System Prompt.
 * @param dateStr Format: YYYY-MM-DD
 * @param themeHint Optional theme hint (e.g. "Focus on gratitude")
 * @returns Promise<MasterContent>
 */
export async function generateMasterContent(dateStr: string, themeHint?: string | null): Promise<MasterContent> {
  // 1. Build context
  const context = buildDailyContext(dateStr);
  const contextString = formatContextForPrompt(context);

  // 2. Prepare user prompt (System prompt is static)
  let userPrompt = `Generate content for date: ${dateStr}.\n${contextString}`;
  if (themeHint) {
    userPrompt += `\n\nREQUIRED THEME: Focus solely on this topic and ignore other astrological suggestions if they conflict: "${themeHint}"`;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: MASTER_SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      response_format: zodResponseFormat(MasterContentSchema, "master_content"),
      temperature: 0.7, // Creativity balance
    });

    const content = completion.choices[0].message.content;
    
    if (!content) {
      throw new Error("No content generated from OpenAI");
    }

    return JSON.parse(content) as MasterContent; 
    
  } catch (error) {
    console.error("Error generating master content:", error);
    throw error;
  }
}

/**
 * Generates daily content using OpenAI GPT-4o (LEGACY / Single Lang)
 * @param dateStr Format: YYYY-MM-DD
 * @param language 'en', 'sk', 'cs'
 * @param themeHint Optional hint to guide theme generation
 * @returns Promise<DailyContent>
 */
export async function generateDailyContent(
  dateStr: string,
  language: string = 'en',
  themeHint?: string
): Promise<DailyContent> {
  // 1. Build context
  const context = buildDailyContext(dateStr);
  const contextString = formatContextForPrompt(context);

  // 2. Prepare prompt
  const systemPrompt = generateThemePrompt.system.replace('{language}', language === 'sk' ? 'Slovak' : language === 'cs' ? 'Czech' : 'English');
  const userPrompt = generateThemePrompt.user(dateStr, contextString, themeHint);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // Or "gpt-4-turbo"
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: zodResponseFormat(DailyContentSchema, "daily_content"),
      temperature: 0.7, // Creativity balance
    });

    const content = completion.choices[0].message.content;
    
    if (!content) {
      throw new Error("No content generated from OpenAI");
    }

    // Parse the JSON result
    // The structured output guarantees the schema, but we can double check or just parse default.
    return JSON.parse(content) as DailyContent; 
    
  } catch (error) {
    console.error("Error generating daily content:", error);
    throw error;
  }
}

/**
 * Translates existing content to another language while preserving the tone.
 * Optimized to assume the input is valid DailyContent.
 */
export async function translateDailyContent(
  content: DailyContent,
  targetLang: string
): Promise<DailyContent> {
  const prompt = translatePrompt(targetLang) + JSON.stringify(content, null, 2);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a translator." }, // Simple system prompt, main instruction is in user prompt from `translatePrompt`
        { role: "user", content: prompt }
      ],
      response_format: zodResponseFormat(DailyContentSchema, "daily_content_translated"),
      temperature: 0.3, // Lower temperature for translation accuracy
    });

    const translated = completion.choices[0].message.content;
    if (!translated) throw new Error("No translation generated");

    return JSON.parse(translated) as DailyContent;
  } catch (error) {
    console.error(`Error translating content to ${targetLang}:`, error);
    throw error;
  }
}

export async function translateMindset(content: Record<string, any>, targetLang: string): Promise<MindsetTranslation> {
  const prompt = translateMindsetPrompt(targetLang) + JSON.stringify(content, null, 2);
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are an incredibly accurate and succinct professional translator.' },
        { role: 'user', content: prompt }
      ],
      response_format: zodResponseFormat(MindsetTranslationSchema, 'mindset_translation'),
      temperature: 0.2, // lower temperature for translation fidelity
    });
    const translated = completion.choices[0].message.content;
    if (!translated) throw new Error('No translation generated');
    return JSON.parse(translated) as MindsetTranslation;
  } catch (error) {
    throw error;
  }
}

export async function enhanceTextWithSSML(text: string): Promise<string> {
  const prompt = enhanceTextWithSSMLPrompt + "\n\n" + text;
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.2, // precise
    });
    
    let enhanced = completion.choices[0].message.content || '';
    
    // Cleanup if model prepended <speak> by mistake
    if (enhanced.startsWith('<speak>')) {
      enhanced = enhanced.replace(/^<speak>/, '').replace(/<\/speak>$/, '');
    }
    
    return enhanced.trim();
  } catch (error) {
    console.error('Error enhancing SSML:', error);
    throw error;
  }
}
