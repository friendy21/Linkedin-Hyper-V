/**
 * WorkerClient — thin HTTP client for the self-hosted Playwright worker API.
 * Replaces the former UnipileClient. All methods talk to WORKER_API_URL.
 *
 * Phase 1: stubs that throw WorkerNotImplementedError.
 * Phase 2: replace each stub body with a real fetch() call.
 */

export class WorkerError extends Error {
  public status: number;
  public code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'WorkerError';
    this.status = status;
    this.code = code;
  }
}

export class WorkerNotImplementedError extends WorkerError {
  constructor(method: string) {
    super(
      `WorkerClient.${method} is not yet implemented. ` +
      'Deploy the Playwright worker and complete Phase 2.',
      501,
      'NOT_IMPLEMENTED'
    );
    this.name = 'WorkerNotImplementedError';
  }
}

// ---------------------------------------------------------------------------
// Shared types (previously in types/unipile.ts)
// ---------------------------------------------------------------------------

export interface WorkerAccount {
  id: string;           // internal accountId used by the worker (= cookie key)
  name: string;
  status: 'active' | 'expired' | 'error';
  sessionAge?: number;  // seconds since cookies were last saved
}

export interface WorkerParticipant {
  id: string;
  name: string;
  headline?: string;
  avatarUrl?: string;
  profileUrl?: string;
}

export interface WorkerMessage {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: string;
  isRead: boolean;
}

export interface WorkerChat {
  id: string;
  accountId: string;
  participants: WorkerParticipant[];
  unreadCount: number;
  lastMessage?: WorkerMessage;
  createdAt: string;
}

export interface WorkerProfile {
  id: string;
  name: string;
  headline?: string;
  location?: string;
  about?: string;
  avatarUrl?: string;
  profileUrl?: string;
  company?: string;
}

export interface Paginated<T> {
  items: T[];
  cursor: string | null;
  hasMore: boolean;
}

export type PaginatedChats    = Paginated<WorkerChat>;
export type PaginatedMessages = Paginated<WorkerMessage>;

// ---------------------------------------------------------------------------
// WorkerClient
// ---------------------------------------------------------------------------

export class WorkerClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = (baseUrl ?? process.env.WORKER_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');
    this.apiKey  = apiKey  ?? process.env.WORKER_API_KEY ?? '';

    if (!this.apiKey) {
      throw new WorkerError(
        'WorkerClient: WORKER_API_KEY must be set in environment variables.',
        500,
        'MISSING_CONFIG'
      );
    }
  }

  // ── Account management ──────────────────────────────────────────────────

  /**
   * Returns the URL the user should open to import cookies for a new account.
   * Phase 2: POST /accounts/:name/session/start → returns { importUrl }
   */
  async generateAuthLink(_params: {
    name: string;
    successRedirectUrl: string;
    failureRedirectUrl: string;
  }): Promise<{ url: string }> {
    throw new WorkerNotImplementedError('generateAuthLink');
  }

  /** Phase 2: DELETE /accounts/:workerAccountId */
  async deleteAccount(_workerAccountId: string): Promise<void> {
    throw new WorkerNotImplementedError('deleteAccount');
  }

  // ── Conversations ────────────────────────────────────────────────────────

  /** Phase 2: GET /messages/read → queues inbox fetch job, returns chats */
  async listChats(_workerAccountId: string, _cursor?: string): Promise<PaginatedChats> {
    throw new WorkerNotImplementedError('listChats');
  }

  /** Phase 2: GET /messages/read?chatId=… */
  async getMessages(_chatId: string, _cursor?: string): Promise<PaginatedMessages> {
    throw new WorkerNotImplementedError('getMessages');
  }

  /** Phase 2: POST /chats/:chatId/read */
  async markChatRead(_chatId: string): Promise<void> {
    throw new WorkerNotImplementedError('markChatRead');
  }

  // ── Messaging ────────────────────────────────────────────────────────────

  /** Phase 2: POST /messages/send { accountId, chatId, text } */
  async sendMessage(_chatId: string, _text: string): Promise<WorkerMessage> {
    throw new WorkerNotImplementedError('sendMessage');
  }

  /**
   * Phase 2: POST /messages/send { accountId, recipientProfileUrl, text }
   * Navigates to profile and sends via the Message button.
   */
  async sendMessageToProfile(
    _workerAccountId: string,
    _profileUrl: string,
    _text: string
  ): Promise<WorkerMessage> {
    throw new WorkerNotImplementedError('sendMessageToProfile');
  }

  // ── Connections ──────────────────────────────────────────────────────────

  /** Phase 2: POST /connections/send { accountId, userId, note } */
  async sendConnectionRequest(
    _workerAccountId: string,
    _userId: string,
    _note?: string
  ): Promise<void> {
    throw new WorkerNotImplementedError('sendConnectionRequest');
  }

  // ── People search ────────────────────────────────────────────────────────

  /** Phase 2: POST /profiles/scrape { accountId, query } */
  async searchPeople(_workerAccountId: string, _query: string): Promise<WorkerProfile[]> {
    throw new WorkerNotImplementedError('searchPeople');
  }
}

// ---------------------------------------------------------------------------
// Singleton helpers
// ---------------------------------------------------------------------------

let _worker: WorkerClient | null = null;

export function getWorkerClient(): WorkerClient {
  if (!_worker) {
    _worker = new WorkerClient();
  }
  return _worker;
}

export const workerClient = new Proxy({} as WorkerClient, {
  get(_target, prop) {
    return (getWorkerClient() as unknown  as Record<string | symbol, unknown>)[prop];
  },
});
