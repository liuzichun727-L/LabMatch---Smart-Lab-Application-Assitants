
export type Language = 'en' | 'zh';

export interface Professor {
  name: string;
  title: string;
  researchInterests: string[];
  bio: string;
  matchReason?: string;
  matchScore?: number;
  tier?: 1 | 2 | 3;
  email?: string;
  website?: string;
  draftStatus?: 'idle' | 'loading' | 'completed';
  generatedDraft?: EmailDraft;
}

export interface StudentProfile {
  name: string;
  education: string;
  interests: string;
  skills: string;
  cvText: string;
}

export interface MatchResult {
  professors: Professor[];
}

export interface EmailDraft {
  subject: string;
  body: string;
}
