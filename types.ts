export type Tone = "pro" | "fun" | "premium" | "direct";
export type Language = "fr" | "en" | "nl";

export interface GenerateRequestBody {
  description: string;
  audience: string;
  tone: Tone;
  language: Language;
}

export interface ContentKit {
  slogans: string[];
  linkedin_post: string;
  launch_email: string;
}

export interface GenerateResult {
  landing_markdown: string;
  content_kit: ContentKit;
}

export interface ApiErrorResponse {
  error: string;
}
