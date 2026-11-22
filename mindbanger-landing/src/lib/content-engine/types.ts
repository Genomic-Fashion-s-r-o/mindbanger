export type ContentStatus = 'draft' | 'generated' | 'published';
export type SupportedLanguage = 'en' | 'sk' | 'cs';

export interface DailySignal {
  id: number;
  date: string; // YYYY-MM-DD
  language: SupportedLanguage;
  theme: string;
  focus: string;
  affirmation: string;
  script?: string;
  audio_url?: string;
  status: ContentStatus;
  audio_duration?: number;
  generation_metadata?: Record<string, any>;
  created_at: string;
}

export interface GenerationRequest {
  date: string;
  language: SupportedLanguage;
  forceRegenerate?: boolean;
}
