/**
 * Core types for the LinkedIn Hyper-V worker
 */

export interface Account {
  id: string;
  displayName: string;
  email: string;
  linkedinUrl?: string;
  status: 'inactive' | 'active' | 'quarantined' | 'banned' | 'warming';
  trustScore: number;
  proxyId?: string;
  fingerprint: FingerprintProfile;
  credentials?: EncryptedCredentials;
  createdAt: Date;
  lastActive?: Date;
  dailyLimits: DailyLimits;
}

export interface FingerprintProfile {
  canvasSeed: number;
  webglProfileIndex: number;
  viewport: ViewportDimensions;
  timezone: string;
  locale: string;
  acceptLanguage: string;
  userAgent: string;
  fonts: string[];
}

export interface ViewportDimensions {
  width: number;
  height: number;
  deviceScaleFactor: number;
}

export interface EncryptedCredentials {
  encryptedEmail: string;
  encryptedPassword: string;
  iv: string;
  authTag: string;
}

export interface DailyLimits {
  maxMessages: number;
  maxConnections: number;
  maxProfileViews: number;
}

export interface Proxy {
  id: string;
  host: string;
  port: number;
  username: string;
  password: string;
  country: string;
  stickySession: boolean;
}

export interface Conversation {
  id: string;
  accountId: string;
  participantName: string;
  participantProfile: string;
  participantHeadline?: string;
  lastMessageAt?: Date;
  lastMessageText?: string;
  lastMessageSentBy: 'me' | 'them';
  unreadCount: number;
  tags: string[];
  createdAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  accountId: string;
  sender: string;
  senderProfileUrl?: string;
  body: string;
  sentAt: Date;
  scrapedAt: Date;
  isFromMe: boolean;
}

export interface ConnectionRequest {
  id: string;
  accountId: string;
  targetProfileUrl: string;
  targetName?: string;
  targetHeadline?: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn';
  sentAt?: Date;
  createdAt: Date;
}

export interface Sequence {
  id: string;
  name: string;
  accountId: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  steps: SequenceStep[];
  createdAt: Date;
  updatedAt: Date;
}

export type SequenceStep = 
  | ConnectionRequestStep 
  | MessageStep 
  | WaitStep 
  | ConditionStep;

export interface ConnectionRequestStep {
  type: 'connection_request';
  id: string;
  note?: string;
}

export interface MessageStep {
  type: 'message';
  id: string;
  content: string;
  useAI?: boolean;
  aiPrompt?: string;
}

export interface WaitStep {
  type: 'wait';
  id: string;
  durationDays: number;
}

export interface ConditionStep {
  type: 'condition';
  id: string;
  condition: 'connection_accepted' | 'message_replied' | 'profile_viewed';
  trueStepId?: string;
  falseStepId?: string;
}

export interface SequenceEnrollment {
  id: string;
  sequenceId: string;
  accountId: string;
  contactProfileUrl: string;
  contactName?: string;
  currentStepIndex: number;
  status: 'active' | 'paused' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  lastActionAt?: Date;
}

export interface JobData {
  accountId: string;
  action: JobAction;
  payload: unknown;
  priority?: number;
}

export type JobAction = 
  | 'send_message'
  | 'send_connection'
  | 'scrape_inbox'
  | 'scrape_profile'
  | 'execute_sequence_step'
  | 'warmup_browse';

export interface BrowserSession {
  accountId: string;
  contextId: string;
  display: number;
  proxy?: Proxy;
  launchedAt: Date;
  lastActivityAt: Date;
}

export interface SessionStatus {
  state: 'active' | 'expired' | 'no_credentials' | 'captcha' | 'twofa' | 'error';
  message?: string;
  captchaUrl?: string;
}

export interface RateLimitStatus {
  canProceed: boolean;
  remainingMessages: number;
  remainingConnections: number;
  resetTime: Date;
}

export interface ActivityLog {
  id: string;
  accountId: string;
  action: string;
  target?: string;
  status: 'success' | 'failure' | 'retry';
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface TrustScoreFactors {
  successfulLoginStreak: number;
  captchaEncounters: number;
  errorRate: number;
  replyRate: number;
  accountAgeDays: number;
}
