import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { users, campaigns, leads, actions, webhookEvents } from './schema';

export type User = InferSelectModel<typeof users>;
export type Campaign = InferSelectModel<typeof campaigns>;
export type Lead = InferSelectModel<typeof leads>;
export type Action = InferSelectModel<typeof actions>;
export type WebhookEvent = InferSelectModel<typeof webhookEvents>;

export type NewUser = InferInsertModel<typeof users>;
export type NewCampaign = InferInsertModel<typeof campaigns>;
export type NewLead = InferInsertModel<typeof leads>;
export type NewAction = InferInsertModel<typeof actions>;
export type NewWebhookEvent = InferInsertModel<typeof webhookEvents>;
