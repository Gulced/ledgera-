export type UserRole = 'admin' | 'operations' | 'finance' | 'agent';

export interface AuthSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  linkedAgentId?: string;
}

export interface AuthAccount extends AuthSession {
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserAccountInput {
  role: UserRole;
  name: string;
  email: string;
  password: string;
  linkedAgentId?: string;
}

export interface LoginInput {
  role?: UserRole;
  email: string;
  password: string;
}

export interface ActorContext {
  userId: string;
  name: string;
  role: UserRole;
}

export type TransactionStage =
  | 'agreement'
  | 'earnest_money'
  | 'title_deed'
  | 'completed';

export interface AgentRef {
  id: string;
  name: string;
}

export interface CommissionExplanation {
  code: 'agency_share' | 'single_agent_full_pool' | 'dual_agent_equal_split';
  message: string;
}

export interface CommissionPayout {
  agentId: string;
  agentName: string;
  amount: number;
  reason: 'listing' | 'selling' | 'listing_and_selling';
}

export interface CommissionBreakdown {
  agencyShare: number;
  agentPool: number;
  payouts: CommissionPayout[];
  explanation: CommissionExplanation[];
}

export interface TransactionHistoryItem {
  stage: TransactionStage;
  changedAt: string;
  changedBy: ActorContext;
}

export interface ActivityLogEntry {
  id: string;
  type: 'transaction_created' | 'transaction_updated' | 'stage_transitioned' | 'financials_locked';
  summary: string;
  timestamp: string;
  actorId: string;
  actorRole: UserRole;
  actorName?: string;
  previousValue?: Record<string, string | number | boolean | null>;
  nextValue?: Record<string, string | number | boolean | null>;
}

export interface FinancialIntegrity {
  isLocked: boolean;
  lockedAt?: string;
  lockedBy?: ActorContext;
}

export interface Transaction {
  id: string;
  propertyRef: string;
  totalServiceFee: number;
  currency: 'EUR' | 'USD' | 'TRY' | 'GBP';
  stage: TransactionStage;
  listingAgent: AgentRef;
  sellingAgent: AgentRef;
  commission: CommissionBreakdown;
  history: TransactionHistoryItem[];
  activityLog: ActivityLogEntry[];
  financialIntegrity: FinancialIntegrity;
  createdBy: ActorContext;
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface TransactionListResponse {
  items: Transaction[];
  paginationMeta: PaginationMeta;
}

export interface TransactionSummary {
  totals: {
    transactions: number;
    completedTransactions: number;
    totalServiceFee: number;
    totalAgencyEarnings: number;
    totalAgentEarnings: number;
  };
  stageDistribution: Record<TransactionStage, number>;
  earningsBreakdown: {
    agencyTotal: number;
    agentTotal: number;
  };
  currencyBreakdown: Record<string, number>;
}

export interface CommissionPreview {
  propertyRef: string;
  currency: Transaction['currency'];
  requestedBy: ActorContext;
  commission: CommissionBreakdown;
  message: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: {
    statusCode: number;
    code: string;
    message: string;
    path: string;
  };
  timestamp: string;
}

export interface TransactionFilters {
  search: string;
  stage: '' | TransactionStage;
  currency: '' | Transaction['currency'];
  agentId: string;
  sortBy: 'createdAt' | 'updatedAt' | 'totalServiceFee';
  order: 'asc' | 'desc';
  page: number;
  limit: number;
}

export interface CreateAgentInput {
  name: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
}

export interface UpdateAgentInput extends CreateAgentInput {
  id: string;
}

export interface CreateTransactionInput {
  propertyRef: string;
  totalServiceFee: number;
  currency: Transaction['currency'];
  listingAgentId: string;
  sellingAgentId: string;
}

export interface UpdateTransactionInput extends CreateTransactionInput {
  id: string;
}

export type ListingStatus = 'active' | 'under_offer' | 'closed';

export interface Listing {
  id: string;
  propertyRef: string;
  title: string;
  city: string;
  fullAddress: string;
  askingPrice: number;
  currency: Transaction['currency'];
  status: ListingStatus;
  listingAgent: AgentRef;
  createdBy: ActorContext;
  createdAt: string;
  updatedAt: string;
}

export interface ListingFilters {
  search: string;
  status: '' | ListingStatus;
  agentId: string;
}

export interface CreateListingInput {
  title: string;
  city: string;
  fullAddress: string;
  askingPrice: number;
  currency: Transaction['currency'];
  listingAgentId: string;
}

export interface UpdateListingInput extends CreateListingInput {
  id: string;
}

export type ListingAssistantAction =
  | 'next_step'
  | 'client_message'
  | 'listing_summary'
  | 'risk_review'
  | 'follow_up_tasks';

export interface ListingAssistantResponse {
  listingId: string;
  action: ListingAssistantAction;
  prompt: string;
  response: string;
  requestedBy: ActorContext;
}

export type AssistantPageType =
  | 'dashboard'
  | 'agents'
  | 'listings'
  | 'listing_detail'
  | 'transaction_detail';

export interface AssistantResponse {
  pageType: AssistantPageType;
  prompt: string;
  response: string;
  source: 'gemini' | 'fallback';
  requestedBy: ActorContext;
}

export interface UpdateListingStatusInput {
  id: string;
  status: ListingStatus;
}

export type WorkspaceEntityType = 'listing' | 'transaction';

export interface WorkspaceNote {
  id: string;
  entityType: WorkspaceEntityType;
  entityId: string;
  body: string;
  authorName: string;
  authorRole: UserRole;
  createdAt: string;
}

export interface WorkspaceTask {
  id: string;
  entityType: WorkspaceEntityType;
  entityId: string;
  title: string;
  dueDate: string;
  status: 'open' | 'done';
  assigneeName: string;
  createdAt: string;
}

export interface WorkspaceDocument {
  id: string;
  entityType: WorkspaceEntityType;
  entityId: string;
  name: string;
  type: 'agreement' | 'deed' | 'invoice' | 'commission_sheet' | 'compliance_note';
  status: 'pending' | 'ready';
  createdAt: string;
}

export interface WorkspaceEvent {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  actorName: string;
  entityType?: WorkspaceEntityType;
  entityId?: string;
}

export interface WorkspaceAlert {
  id: string;
  title: string;
  description: string;
  tone: 'warning' | 'info' | 'success';
}
