import { Inject, Injectable } from '@nestjs/common';
import { AgentsService } from '../agents/agents.service';
import {
  AppBadRequestException,
  AppNotFoundException,
} from '../common/errors/app-error';
import type {
  ActorContextDto,
  ActivityLogEntryDto,
  AgentRefDto,
  CommissionPreviewDto,
  CommissionBreakdownDto,
  CreateTransactionDto,
  PaginatedResultDto,
  SortOrder,
  SupportedCurrency,
  TransactionDto,
  TransactionListQueryDto,
  TransactionSortBy,
  TransactionStage,
  TransactionSummaryDto,
} from './dto/transaction.dto';
import {
  assertCanListTransactions,
  assertCanPreviewCommission,
  assertCanCreateTransaction,
  assertCanTransitionTransaction,
  assertCanViewTransaction,
  canReadAllTransactions,
} from './auth/transaction-authorization';
import { TransactionsRepository } from './transactions.repository';

const STAGE_ORDER: TransactionStage[] = [
  'agreement',
  'earnest_money',
  'title_deed',
  'completed',
];
const SUPPORTED_CURRENCIES: SupportedCurrency[] = ['EUR', 'USD', 'TRY', 'GBP'];

@Injectable()
export class TransactionsService {
  constructor(
    @Inject(TransactionsRepository)
    private readonly transactionsRepository: TransactionsRepository,
    private readonly agentsService: AgentsService,
  ) {}

  findAll(
    actor: ActorContextDto,
    query: TransactionListQueryDto = {},
  ): Promise<PaginatedResultDto<TransactionDto>> {
    return this.findAllInternal(actor, query);
  }

  async getSummary(
    actor: ActorContextDto,
    query: Omit<TransactionListQueryDto, 'page' | 'limit'> = {},
  ): Promise<TransactionSummaryDto> {
    const transactions = await this.getFilteredTransactions(actor, query);

    return {
      totals: {
        transactions: transactions.length,
        completedTransactions: transactions.filter(
          (transaction) => transaction.stage === 'completed',
        ).length,
        totalServiceFee: transactions.reduce(
          (sum, transaction) => sum + transaction.totalServiceFee,
          0,
        ),
        totalAgencyEarnings: transactions.reduce(
          (sum, transaction) => sum + transaction.commission.agencyShare,
          0,
        ),
        totalAgentEarnings: transactions.reduce(
          (sum, transaction) => sum + transaction.commission.agentPool,
          0,
        ),
      },
      stageDistribution: transactions.reduce(
        (distribution, transaction) => {
          distribution[transaction.stage] += 1;
          return distribution;
        },
        {
          agreement: 0,
          earnest_money: 0,
          title_deed: 0,
          completed: 0,
        } satisfies Record<TransactionStage, number>,
      ),
      earningsBreakdown: {
        agencyTotal: transactions.reduce(
          (sum, transaction) => sum + transaction.commission.agencyShare,
          0,
        ),
        agentTotal: transactions.reduce(
          (sum, transaction) => sum + transaction.commission.agentPool,
          0,
        ),
      },
      currencyBreakdown: transactions.reduce(
        (breakdown, transaction) => {
          breakdown[transaction.currency] =
            (breakdown[transaction.currency] ?? 0) + 1;
          return breakdown;
        },
        {} as Record<string, number>,
      ),
    };
  }

  private async findAllInternal(
    actor: ActorContextDto,
    query: TransactionListQueryDto,
  ): Promise<PaginatedResultDto<TransactionDto>> {
    const filteredTransactions = await this.getFilteredTransactions(actor, query);

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit =
      query.limit && query.limit > 0 ? Math.min(query.limit, 50) : 10;
    const totalItems = filteredTransactions.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const offset = (page - 1) * limit;

    return {
      items: filteredTransactions.slice(offset, offset + limit),
      paginationMeta: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  private async getFilteredTransactions(
    actor: ActorContextDto,
    query: Omit<TransactionListQueryDto, 'page' | 'limit'>,
  ) {
    assertCanListTransactions(actor, query);

    const transactions = await this.transactionsRepository.findAll();
    const visibleTransactions = canReadAllTransactions(actor)
      ? transactions
      : transactions.filter(
          (transaction) =>
            transaction.listingAgent.id === actor.userId ||
            transaction.sellingAgent.id === actor.userId,
        );

    return visibleTransactions
      .filter((transaction) =>
        query.stage ? transaction.stage === query.stage : true,
      )
      .filter((transaction) =>
        query.currency ? transaction.currency === query.currency : true,
      )
      .filter((transaction) =>
        query.agentId
          ? transaction.listingAgent.id === query.agentId ||
            transaction.sellingAgent.id === query.agentId
          : true,
      )
      .filter((transaction) =>
        query.search
          ? this.matchesSearch(transaction, query.search)
          : true,
      )
      .sort((left, right) => this.compareTransactions(left, right, query));
  }

  async findById(id: string, actor: ActorContextDto): Promise<TransactionDto> {
    const transaction = await this.transactionsRepository.findById(id);

    if (!transaction) {
      throw new AppNotFoundException(
        'TRANSACTION_NOT_FOUND',
        `Transaction ${id} not found.`,
      );
    }

    assertCanViewTransaction(actor, transaction);

    return transaction;
  }

  async create(
    payload: CreateTransactionDto,
    actor: ActorContextDto,
  ): Promise<TransactionDto> {
    assertCanCreateTransaction(actor);
    this.validateTransactionPayload(payload, 'create');
    const [listingAgent, sellingAgent] = await Promise.all([
      this.agentsService.findActiveById(payload.listingAgent.id),
      this.agentsService.findActiveById(payload.sellingAgent.id),
    ]);
    const normalizedPayload = {
      ...payload,
      listingAgent: this.toAgentRef(listingAgent),
      sellingAgent: this.toAgentRef(sellingAgent),
    };

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const commission = this.calculateCommission(normalizedPayload);
    const creationLog = this.buildActivityLog(
      'transaction_created',
      'Transaction created and initialized at agreement stage.',
      actor,
      createdAt,
      undefined,
      {
        propertyRef: payload.propertyRef,
        stage: 'agreement',
      },
    );

    const transaction: TransactionDto = {
      id,
      propertyRef: payload.propertyRef,
      totalServiceFee: payload.totalServiceFee,
      currency: payload.currency ?? 'EUR',
      stage: 'agreement',
      listingAgent: normalizedPayload.listingAgent,
      sellingAgent: normalizedPayload.sellingAgent,
      commission,
      history: [
        {
          stage: 'agreement',
          changedAt: createdAt,
          changedBy: actor,
        },
      ],
      activityLog: [creationLog],
      financialIntegrity: {
        isLocked: false,
      },
      createdBy: actor,
      createdAt,
      updatedAt: createdAt,
    };

    return this.transactionsRepository.create(transaction);
  }

  previewCommission(
    payload: CreateTransactionDto,
    actor: ActorContextDto,
  ): Promise<CommissionPreviewDto> {
    assertCanPreviewCommission(actor);
    this.validateTransactionPayload(payload, 'preview');

    return this.buildPreviewResponse(payload, actor);
  }

  async transitionStage(
    id: string,
    nextStage: TransactionStage,
    actor: ActorContextDto,
  ): Promise<TransactionDto> {
    assertCanTransitionTransaction(actor);
    const transaction = await this.findById(id, actor);

    if (transaction.stage === nextStage) {
      return transaction;
    }

    this.ensureFinancialsAreMutable(transaction);
    this.ensureValidTransition(transaction.stage, nextStage);
    this.ensureCompletionReadiness(transaction, nextStage);

    const updatedAt = new Date().toISOString();
    const stageLog = this.buildActivityLog(
      'stage_transitioned',
      `Transaction moved from ${transaction.stage} to ${nextStage}.`,
      actor,
      updatedAt,
      {
        fromStage: transaction.stage,
        financialLock: transaction.financialIntegrity.isLocked,
      },
      {
        toStage: nextStage,
        financialLock: transaction.financialIntegrity.isLocked,
      },
    );
    const updated: TransactionDto = {
      ...transaction,
      stage: nextStage,
      updatedAt,
      history: [
        ...transaction.history,
        {
          stage: nextStage,
          changedAt: updatedAt,
          changedBy: actor,
        },
      ],
      activityLog: [...transaction.activityLog, stageLog],
    };

    if (nextStage === 'completed') {
      updated.financialIntegrity = {
        isLocked: true,
        lockedAt: updatedAt,
        lockedBy: actor,
      };
      updated.activityLog = [
        ...updated.activityLog,
        this.buildActivityLog(
          'financials_locked',
          'Financial snapshot locked after transaction completion.',
          actor,
          updatedAt,
          {
            isLocked: false,
            lockedAt: null,
            lockedBy: null,
          },
          {
            isLocked: true,
            lockedAt: updatedAt,
            lockedBy: actor.userId,
            stage: nextStage,
            agencyShare: updated.commission.agencyShare,
          },
        ),
      ];
    }

    return this.transactionsRepository.update(id, updated);
  }

  calculateCommission(
    payload: CreateTransactionDto,
  ): CommissionBreakdownDto {
    const agencyShare = payload.totalServiceFee * 0.5;
    const agentPool = payload.totalServiceFee * 0.5;

    if (payload.listingAgent.id === payload.sellingAgent.id) {
      return {
        agencyShare,
        agentPool,
        payouts: [
          {
            agentId: payload.listingAgent.id,
            agentName: payload.listingAgent.name,
            amount: agentPool,
            reason: 'listing_and_selling',
          },
        ],
        explanation: [
          {
            code: 'agency_share',
            message: 'The agency receives 50% of the total service fee.',
          },
          {
            code: 'single_agent_full_pool',
            message:
              'The same agent handled both listing and selling, so they receive the full agent pool.',
          },
        ],
      };
    }

    return {
      agencyShare,
      agentPool,
      payouts: [
        {
          agentId: payload.listingAgent.id,
          agentName: payload.listingAgent.name,
          amount: agentPool / 2,
          reason: 'listing',
        },
        {
          agentId: payload.sellingAgent.id,
          agentName: payload.sellingAgent.name,
          amount: agentPool / 2,
          reason: 'selling',
        },
      ],
      explanation: [
        {
          code: 'agency_share',
          message: 'The agency receives 50% of the total service fee.',
        },
        {
          code: 'dual_agent_equal_split',
          message:
            'Different listing and selling agents split the agent pool equally.',
        },
      ],
    };
  }

  private ensureValidTransition(
    currentStage: TransactionStage,
    nextStage: TransactionStage,
  ) {
    const currentIndex = STAGE_ORDER.indexOf(currentStage);
    const nextIndex = STAGE_ORDER.indexOf(nextStage);

    if (currentIndex === -1 || nextIndex === -1) {
      throw new AppBadRequestException(
        'INVALID_STAGE_TRANSITION',
        'Unknown transaction stage.',
      );
    }

    if (nextIndex !== currentIndex + 1) {
      throw new AppBadRequestException(
        'INVALID_STAGE_TRANSITION',
        `Invalid stage transition from ${currentStage} to ${nextStage}.`,
      );
    }
  }

  private validateFee(totalServiceFee: number) {
    if (!Number.isFinite(totalServiceFee) || totalServiceFee <= 0) {
      throw new AppBadRequestException(
        'INVALID_TRANSACTION_PAYLOAD',
        'totalServiceFee must be greater than 0.',
      );
    }
  }

  private validateTransactionPayload(
    payload: CreateTransactionDto,
    context: 'create' | 'preview',
  ) {
    this.validateFee(payload.totalServiceFee);
    this.validateCurrency(payload.currency ?? 'EUR', context);
    this.validateAgentRef(payload.listingAgent, 'listingAgent', context);
    this.validateAgentRef(payload.sellingAgent, 'sellingAgent', context);
  }

  private validateCurrency(currency: string, context: 'create' | 'preview' | 'transition') {
    if (!SUPPORTED_CURRENCIES.includes(currency as SupportedCurrency)) {
      throw new AppBadRequestException(
        context === 'preview'
          ? 'INVALID_PREVIEW_PAYLOAD'
          : 'INVALID_TRANSACTION_PAYLOAD',
        `currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}.`,
      );
    }
  }

  private validateAgentRef(
    agent: AgentRefDto,
    fieldName: string,
    context: 'create' | 'preview' | 'transition',
  ) {
    if (!agent?.id?.trim()) {
      throw new AppBadRequestException(
        context === 'preview'
          ? 'INVALID_PREVIEW_PAYLOAD'
          : 'INVALID_TRANSACTION_PAYLOAD',
        `${fieldName}.id is required.`,
      );
    }

    if (!agent?.name?.trim()) {
      throw new AppBadRequestException(
        context === 'preview'
          ? 'INVALID_PREVIEW_PAYLOAD'
          : 'INVALID_TRANSACTION_PAYLOAD',
        `${fieldName}.name is required.`,
      );
    }
  }

  private matchesSearch(transaction: TransactionDto, search: string) {
    const normalizedSearch = search.trim().toLowerCase();

    return [
      transaction.propertyRef,
      transaction.listingAgent.name,
      transaction.sellingAgent.name,
      transaction.currency,
      transaction.stage,
    ].some((value) => value.toLowerCase().includes(normalizedSearch));
  }

  private compareTransactions(
    left: TransactionDto,
    right: TransactionDto,
    query: Pick<TransactionListQueryDto, 'sortBy' | 'order'>,
  ) {
    const sortBy: TransactionSortBy = query.sortBy ?? 'updatedAt';
    const order: SortOrder = query.order ?? 'desc';

    const leftValue =
      sortBy === 'totalServiceFee' ? left.totalServiceFee : left[sortBy];
    const rightValue =
      sortBy === 'totalServiceFee' ? right.totalServiceFee : right[sortBy];

    const comparison =
      typeof leftValue === 'number' && typeof rightValue === 'number'
        ? leftValue - rightValue
        : String(leftValue).localeCompare(String(rightValue));

    return order === 'asc' ? comparison : comparison * -1;
  }

  private async buildPreviewResponse(
    payload: CreateTransactionDto,
    actor: ActorContextDto,
  ): Promise<CommissionPreviewDto> {
    const [listingAgent, sellingAgent] = await Promise.all([
      this.agentsService.findActiveById(payload.listingAgent.id),
      this.agentsService.findActiveById(payload.sellingAgent.id),
    ]);
    const normalizedPayload = {
      ...payload,
      listingAgent: this.toAgentRef(listingAgent),
      sellingAgent: this.toAgentRef(sellingAgent),
    };

    return {
      propertyRef: payload.propertyRef,
      currency: payload.currency ?? 'EUR',
      requestedBy: actor,
      commission: this.calculateCommission(normalizedPayload),
      message:
        'This is a preview only. Final payout snapshot is locked when the transaction reaches completed stage.',
    };
  }

  private toAgentRef(agent: { id: string; name: string }) {
    return {
      id: agent.id,
      name: agent.name,
    };
  }

  private ensureFinancialsAreMutable(transaction: TransactionDto) {
    if (transaction.financialIntegrity.isLocked) {
      throw new AppBadRequestException(
        'FINANCIAL_LOCK_VIOLATION',
        `Transaction ${transaction.id} is financially locked and cannot be modified.`,
      );
    }
  }

  private ensureCompletionReadiness(
    transaction: TransactionDto,
    nextStage: TransactionStage,
  ) {
    if (nextStage !== 'completed') {
      return;
    }

    this.validateFee(transaction.totalServiceFee);
    this.validateCurrency(transaction.currency, 'transition');
    this.validateAgentRef(transaction.listingAgent, 'listingAgent', 'transition');
    this.validateAgentRef(transaction.sellingAgent, 'sellingAgent', 'transition');

    if (transaction.history.length < 3 || transaction.stage !== 'title_deed') {
      throw new AppBadRequestException(
        'INVALID_STAGE_TRANSITION',
        'Transaction must reach title_deed with complete history before completion.',
      );
    }

    if (
      !transaction.commission ||
      transaction.commission.agencyShare <= 0 ||
      transaction.commission.agentPool <= 0 ||
      transaction.commission.payouts.length === 0 ||
      transaction.commission.explanation.length === 0
    ) {
      throw new AppBadRequestException(
        'INVALID_TRANSACTION_PAYLOAD',
        'Transaction financial breakdown must be complete before completion.',
      );
    }
  }

  private buildActivityLog(
    type: ActivityLogEntryDto['type'],
    summary: string,
    actor: ActorContextDto,
    timestamp: string,
    previousValue?: Record<string, string | number | boolean | null>,
    nextValue?: Record<string, string | number | boolean | null>,
  ): ActivityLogEntryDto {
    return {
      id: crypto.randomUUID(),
      type,
      summary,
      timestamp,
      actorId: actor.userId,
      actorRole: actor.role,
      actorName: actor.name,
      previousValue,
      nextValue,
    };
  }
}
