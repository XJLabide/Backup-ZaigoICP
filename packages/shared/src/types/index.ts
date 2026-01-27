// Enum types (matching database enums)
export type Tone = 'professional' | 'friendly' | 'direct';
export type Cta = 'book_call' | 'reply' | 'visit_site';
export type LeadStatus = 'new' | 'qualified' | 'messaged' | 'connected' | 'replied' | 'skipped';
export type ActionStatus = 'pending' | 'approved' | 'rejected' | 'sent' | 'failed';
export type LeadSource = 'profile_viewer';

// Placeholder types - will be expanded when Drizzle schema is added
export interface User {
  id: string;
  email: string;
  name: string | null;
}

export interface Campaign {
  id: string;
  userId: string;
  name: string;
  tone: Tone;
  cta: Cta;
}

export interface Lead {
  id: string;
  userId: string;
  linkedInId: string;
  fullName: string;
  status: LeadStatus;
}
