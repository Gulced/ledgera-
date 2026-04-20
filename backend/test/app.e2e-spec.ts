import { AgentsService } from './../src/agents/agents.service';
import type { AgentDto } from './../src/agents/dto/agent.dto';
import { AgentsRepository } from './../src/agents/agents.repository';
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { HealthController } from './../src/health.controller';
import { buildAuthorizedActorContext } from './../src/transactions/auth/transaction-authorization';
import { TransactionsController } from './../src/transactions/transactions.controller';
import {
  CreateTransactionDto,
  TransactionListQueryDto,
  TransitionTransactionDto,
} from './../src/transactions/dto/transaction.dto';
import { TransactionsRepository } from './../src/transactions/transactions.repository';
import { TransactionsService } from './../src/transactions/transactions.service';
import type { TransactionDto } from './../src/transactions/dto/transaction.dto';

class InMemoryTransactionsRepository implements TransactionsRepository {
  private readonly transactions = new Map<string, TransactionDto>();

  async findAll(): Promise<TransactionDto[]> {
    return [...this.transactions.values()];
  }

  async findById(id: string): Promise<TransactionDto | null> {
    return this.transactions.get(id) ?? null;
  }

  async create(transaction: TransactionDto): Promise<TransactionDto> {
    this.transactions.set(transaction.id, transaction);

    return transaction;
  }

  async update(id: string, transaction: TransactionDto): Promise<TransactionDto> {
    this.transactions.set(id, transaction);

    return transaction;
  }
}

class InMemoryAgentsRepository implements AgentsRepository {
  private readonly agents = new Map<string, AgentDto>();

  constructor(initialAgents: AgentDto[]) {
    initialAgents.forEach((agent) => this.agents.set(agent.id, agent));
  }

  async findAll(): Promise<AgentDto[]> {
    return [...this.agents.values()];
  }

  async findById(id: string): Promise<AgentDto | null> {
    return this.agents.get(id) ?? null;
  }

  async create(agent: AgentDto): Promise<AgentDto> {
    this.agents.set(agent.id, agent);
    return agent;
  }
}

describe('Ledgera Backend Integration', () => {
  let healthController: HealthController;
  let transactionsController: TransactionsController;
  let validationPipe: ValidationPipe;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HealthController, TransactionsController],
      providers: [
        TransactionsService,
        {
          provide: AgentsRepository,
          useValue: new InMemoryAgentsRepository([
            {
              id: 'agent-1',
              name: 'Ayse Kaya',
              email: 'ayse@example.com',
              isActive: true,
              createdAt: '2026-04-16T00:00:00.000Z',
              updatedAt: '2026-04-16T00:00:00.000Z',
            },
            {
              id: 'agent-2',
              name: 'Mert Demir',
              email: 'mert@example.com',
              isActive: true,
              createdAt: '2026-04-16T00:00:00.000Z',
              updatedAt: '2026-04-16T00:00:00.000Z',
            },
            {
              id: 'agent-3',
              name: 'Ece Yilmaz',
              isActive: true,
              createdAt: '2026-04-16T00:00:00.000Z',
              updatedAt: '2026-04-16T00:00:00.000Z',
            },
            {
              id: 'agent-4',
              name: 'Can Arda',
              isActive: true,
              createdAt: '2026-04-16T00:00:00.000Z',
              updatedAt: '2026-04-16T00:00:00.000Z',
            },
            {
              id: 'agent-7',
              name: 'Can Arda',
              isActive: true,
              createdAt: '2026-04-16T00:00:00.000Z',
              updatedAt: '2026-04-16T00:00:00.000Z',
            },
            {
              id: 'agent-8',
              name: 'Ece Yilmaz',
              isActive: true,
              createdAt: '2026-04-16T00:00:00.000Z',
              updatedAt: '2026-04-16T00:00:00.000Z',
            },
          ]),
        },
        AgentsService,
        {
          provide: TransactionsRepository,
          useClass: InMemoryTransactionsRepository,
        },
      ],
    }).compile();

    healthController = moduleFixture.get(HealthController);
    transactionsController = moduleFixture.get(TransactionsController);
    validationPipe = new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    });
  });

  it('returns backend health payload', () => {
    expect(healthController.getHealth()).toEqual({
      name: 'ledgera-backend',
      status: 'ok',
    });
  });

  it('creates a transaction from a validated dto payload', async () => {
    const payload = await validationPipe.transform(
      plainToInstance(CreateTransactionDto, {
        propertyRef: 'TR-IST-101',
        totalServiceFee: 100000,
        currency: 'EUR',
        listingAgent: { id: 'agent-1', name: 'Ayse Kaya' },
        sellingAgent: { id: 'agent-2', name: 'Mert Demir' },
      }),
      {
        type: 'body',
        metatype: CreateTransactionDto,
      },
    );

    const transaction = await transactionsController.create(
      payload,
      'u-admin',
      'Admin User',
      'admin',
    );

    expect(transaction.propertyRef).toBe('TR-IST-101');
    expect(transaction.commission.agencyShare).toBe(50000);
  });

  it('rejects unsupported currency values in validated dto payloads', async () => {
    await expect(
      validationPipe.transform(
        plainToInstance(CreateTransactionDto, {
          propertyRef: 'TR-IST-102',
          totalServiceFee: 100000,
          currency: 'AED',
          listingAgent: { id: 'agent-1', name: 'Ayse Kaya' },
          sellingAgent: { id: 'agent-2', name: 'Mert Demir' },
        }),
        {
          type: 'body',
          metatype: CreateTransactionDto,
        },
      ),
    ).rejects.toThrow();
  });

  it('supports transaction listing with filters and pagination', async () => {
    const firstPayload = plainToInstance(CreateTransactionDto, {
      propertyRef: 'TR-IST-201',
      totalServiceFee: 85000,
      currency: 'USD',
      listingAgent: { id: 'agent-1', name: 'Ayse Kaya' },
      sellingAgent: { id: 'agent-3', name: 'Can Arda' },
    });
    const secondPayload = plainToInstance(CreateTransactionDto, {
      propertyRef: 'TR-ANK-202',
      totalServiceFee: 65000,
      currency: 'EUR',
      listingAgent: { id: 'agent-2', name: 'Mert Demir' },
      sellingAgent: { id: 'agent-4', name: 'Ece Yilmaz' },
    });

    await transactionsController.create(firstPayload, 'u-admin', 'Admin User', 'admin');
    await transactionsController.create(secondPayload, 'u-admin', 'Admin User', 'admin');

    const filtered = await transactionsController.findAll(
      'u-finance',
      'Finance User',
      'finance',
      plainToInstance(TransactionListQueryDto, {
        search: 'IST',
        page: 1,
        limit: 5,
      }),
    );

    expect(filtered.items).toHaveLength(1);
    expect(filtered.items[0]?.propertyRef).toBe('TR-IST-201');
    expect(filtered.paginationMeta.totalItems).toBe(1);
    expect(filtered.paginationMeta.hasNextPage).toBe(false);
    expect(filtered.paginationMeta.hasPrevPage).toBe(false);
  });

  it('supports sorting in transaction list queries', async () => {
    await transactionsController.create(
      plainToInstance(CreateTransactionDto, {
        propertyRef: 'TR-SORT-001',
        totalServiceFee: 99000,
        currency: 'EUR',
        listingAgent: { id: 'agent-1', name: 'Ayse Kaya' },
        sellingAgent: { id: 'agent-2', name: 'Mert Demir' },
      }),
      'u-admin',
      'Admin User',
      'admin',
    );
    await transactionsController.create(
      plainToInstance(CreateTransactionDto, {
        propertyRef: 'TR-SORT-002',
        totalServiceFee: 31000,
        currency: 'EUR',
        listingAgent: { id: 'agent-3', name: 'Ece Yilmaz' },
        sellingAgent: { id: 'agent-4', name: 'Can Arda' },
      }),
      'u-admin',
      'Admin User',
      'admin',
    );

    const sorted = await transactionsController.findAll(
      'u-finance',
      'Finance User',
      'finance',
      plainToInstance(TransactionListQueryDto, {
        sortBy: 'totalServiceFee',
        order: 'asc',
      }),
    );

    expect(sorted.items[0]?.propertyRef).toBe('TR-SORT-002');
    expect(sorted.items[1]?.propertyRef).toBe('TR-SORT-001');
  });

  it('keeps preview requests non-persistent at controller level', async () => {
    const before = await transactionsController.findAll(
      'u-admin',
      'Admin User',
      'admin',
      plainToInstance(TransactionListQueryDto, {}),
    );

    const preview = await transactionsController.previewCommission(
      plainToInstance(CreateTransactionDto, {
        propertyRef: 'TR-PREVIEW-C1',
        totalServiceFee: 110000,
        currency: 'EUR',
        listingAgent: { id: 'agent-1', name: 'Ayse Kaya' },
        sellingAgent: { id: 'agent-2', name: 'Mert Demir' },
      }),
      'u-admin',
      'Admin User',
      'admin',
    );

    const after = await transactionsController.findAll(
      'u-admin',
      'Admin User',
      'admin',
      plainToInstance(TransactionListQueryDto, {}),
    );

    expect(preview.commission.agentPool).toBe(55000);
    expect(before.paginationMeta.totalItems).toBe(0);
    expect(after.paginationMeta.totalItems).toBe(0);
  });

  it('does not mutate existing transaction state when preview is requested', async () => {
    const created = await transactionsController.create(
      plainToInstance(CreateTransactionDto, {
        propertyRef: 'TR-PREVIEW-C2',
        totalServiceFee: 78000,
        currency: 'EUR',
        listingAgent: { id: 'agent-1', name: 'Ayse Kaya' },
        sellingAgent: { id: 'agent-2', name: 'Mert Demir' },
      }),
      'u-admin',
      'Admin User',
      'admin',
    );

    await transactionsController.previewCommission(
      plainToInstance(CreateTransactionDto, {
        propertyRef: 'TR-PREVIEW-C3',
        totalServiceFee: 84000,
        currency: 'USD',
        listingAgent: { id: 'agent-3', name: 'Ece Yilmaz' },
        sellingAgent: { id: 'agent-4', name: 'Can Arda' },
      }),
      'u-admin',
      'Admin User',
      'admin',
    );

    const reloaded = await transactionsController.findOne(
      created.id,
      'u-admin',
      'Admin User',
      'admin',
    );

    expect(reloaded.history).toEqual(created.history);
    expect(reloaded.activityLog).toEqual(created.activityLog);
    expect(reloaded.commission).toEqual(created.commission);
    expect(reloaded.updatedAt).toBe(created.updatedAt);
  });

  it('returns summary metrics for dashboard cards', async () => {
    const created = await transactionsController.create(
      plainToInstance(CreateTransactionDto, {
        propertyRef: 'TR-IST-401',
        totalServiceFee: 120000,
        currency: 'EUR',
        listingAgent: { id: 'agent-1', name: 'Ayse Kaya' },
        sellingAgent: { id: 'agent-2', name: 'Mert Demir' },
      }),
      'u-admin',
      'Admin User',
      'admin',
    );

    await transactionsController.transitionStage(
      created.id,
      plainToInstance(TransitionTransactionDto, {
        stage: 'earnest_money',
      }),
      'u-ops',
      'Operations User',
      'operations',
    );

    const summary = await transactionsController.getSummary(
      'u-finance',
      'Finance User',
      'finance',
      plainToInstance(TransactionListQueryDto, {}),
    );

    expect(summary.totals.transactions).toBe(1);
    expect(summary.totals.totalAgencyEarnings).toBe(60000);
    expect(summary.earningsBreakdown.agencyTotal).toBe(60000);
    expect(summary.earningsBreakdown.agentTotal).toBe(60000);
    expect(summary.stageDistribution.earnest_money).toBe(1);
  });

  it('allows admin to access any transaction and finance to read but not mutate', async () => {
    const created = await transactionsController.create(
      plainToInstance(CreateTransactionDto, {
        propertyRef: 'TR-AUTH-C1',
        totalServiceFee: 65000,
        currency: 'EUR',
        listingAgent: { id: 'agent-1', name: 'Ayse Kaya' },
        sellingAgent: { id: 'agent-2', name: 'Mert Demir' },
      }),
      'u-admin',
      'Admin User',
      'admin',
    );

    const adminView = await transactionsController.findOne(
      created.id,
      'u-admin',
      'Admin User',
      'admin',
    );
    const financeView = await transactionsController.findOne(
      created.id,
      'u-finance',
      'Finance User',
      'finance',
    );

    expect(adminView.id).toBe(created.id);
    expect(financeView.id).toBe(created.id);
    await expect(
      transactionsController.transitionStage(
        created.id,
        plainToInstance(TransitionTransactionDto, {
          stage: 'earnest_money',
        }),
        'u-finance',
        'Finance User',
        'finance',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('restricts agent visibility to owned transactions only', async () => {
    const owned = await transactionsController.create(
      plainToInstance(CreateTransactionDto, {
        propertyRef: 'TR-AUTH-C2',
        totalServiceFee: 70000,
        currency: 'EUR',
        listingAgent: { id: 'agent-1', name: 'Ayse Kaya' },
        sellingAgent: { id: 'agent-2', name: 'Mert Demir' },
      }),
      'u-admin',
      'Admin User',
      'admin',
    );
    await transactionsController.create(
      plainToInstance(CreateTransactionDto, {
        propertyRef: 'TR-AUTH-C3',
        totalServiceFee: 71000,
        currency: 'EUR',
        listingAgent: { id: 'agent-7', name: 'Can Arda' },
        sellingAgent: { id: 'agent-8', name: 'Ece Yilmaz' },
      }),
      'u-admin',
      'Admin User',
      'admin',
    );

    const listed = await transactionsController.findAll(
      'agent-1',
      'Ayse Kaya',
      'agent',
      plainToInstance(TransactionListQueryDto, {}),
    );

    expect(listed.items).toHaveLength(1);
    expect(listed.items[0]?.id).toBe(owned.id);
    await expect(
      transactionsController.findOne(owned.id, 'agent-9', 'Other Agent', 'agent'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('transitions a transaction stage through validated input', async () => {
    const created = await transactionsController.create(
      plainToInstance(CreateTransactionDto, {
        propertyRef: 'TR-IZM-301',
        totalServiceFee: 91000,
        currency: 'EUR',
        listingAgent: { id: 'agent-1', name: 'Ayse Kaya' },
        sellingAgent: { id: 'agent-2', name: 'Mert Demir' },
      }),
      'u-ops',
      'Operations User',
      'operations',
    );

    const transitionPayload = await validationPipe.transform(
      plainToInstance(TransitionTransactionDto, {
        stage: 'earnest_money',
      }),
      {
        type: 'body',
        metatype: TransitionTransactionDto,
      },
    );

    const transitioned = await transactionsController.transitionStage(
      created.id,
      transitionPayload,
      'u-ops',
      'Operations User',
      'operations',
    );

    expect(transitioned.stage).toBe('earnest_money');
    expect(transitioned.history).toHaveLength(2);
  });

  it('keeps repeated stage transition requests idempotent', async () => {
    const created = await transactionsController.create(
      plainToInstance(CreateTransactionDto, {
        propertyRef: 'TR-IDEMP-001',
        totalServiceFee: 91000,
        currency: 'EUR',
        listingAgent: { id: 'agent-1', name: 'Ayse Kaya' },
        sellingAgent: { id: 'agent-2', name: 'Mert Demir' },
      }),
      'u-ops',
      'Operations User',
      'operations',
    );

    const payload = plainToInstance(TransitionTransactionDto, {
      stage: 'earnest_money',
    });

    const first = await transactionsController.transitionStage(
      created.id,
      payload,
      'u-ops',
      'Operations User',
      'operations',
    );
    const repeated = await transactionsController.transitionStage(
      created.id,
      payload,
      'u-ops',
      'Operations User',
      'operations',
    );

    expect(repeated.updatedAt).toBe(first.updatedAt);
    expect(repeated.history).toHaveLength(2);
    expect(repeated.activityLog).toHaveLength(2);
  });

  it('preserves financial integrity after rejected post-completion mutation attempts', async () => {
    const created = await transactionsController.create(
      plainToInstance(CreateTransactionDto, {
        propertyRef: 'TR-IMMUT-001',
        totalServiceFee: 101000,
        currency: 'EUR',
        listingAgent: { id: 'agent-1', name: 'Ayse Kaya' },
        sellingAgent: { id: 'agent-2', name: 'Mert Demir' },
      }),
      'u-ops',
      'Operations User',
      'operations',
    );

    await transactionsController.transitionStage(
      created.id,
      plainToInstance(TransitionTransactionDto, { stage: 'earnest_money' }),
      'u-ops',
      'Operations User',
      'operations',
    );
    await transactionsController.transitionStage(
      created.id,
      plainToInstance(TransitionTransactionDto, { stage: 'title_deed' }),
      'u-ops',
      'Operations User',
      'operations',
    );
    const completed = await transactionsController.transitionStage(
      created.id,
      plainToInstance(TransitionTransactionDto, { stage: 'completed' }),
      'u-ops',
      'Operations User',
      'operations',
    );

    await expect(
      transactionsController.transitionStage(
        created.id,
        plainToInstance(TransitionTransactionDto, { stage: 'agreement' }),
        'u-ops',
        'Operations User',
        'operations',
      ),
    ).rejects.toThrow(BadRequestException);

    const reloaded = await transactionsController.findOne(
      created.id,
      'u-ops',
      'Operations User',
      'operations',
    );

    expect(reloaded.stage).toBe('completed');
    expect(reloaded.commission).toEqual(completed.commission);
    expect(reloaded.financialIntegrity).toEqual(completed.financialIntegrity);
    expect(reloaded.updatedAt).toBe(completed.updatedAt);
  });

  it('rejects missing actor headers when building context', () => {
    expect(() => buildAuthorizedActorContext(undefined, 'Admin User', 'admin')).toThrow(
      UnauthorizedException,
    );
    expect(() => buildAuthorizedActorContext('u-admin', 'Admin User', undefined)).toThrow(
      UnauthorizedException,
    );
  });

  it('exposes semantic error codes on authorization failures', async () => {
    try {
      await transactionsController.previewCommission(
        plainToInstance(CreateTransactionDto, {
          propertyRef: 'TR-IST-999',
          totalServiceFee: 100000,
          currency: 'EUR',
          listingAgent: { id: 'agent-1', name: 'Ayse Kaya' },
          sellingAgent: { id: 'agent-2', name: 'Mert Demir' },
        }),
        'agent-1',
        'Ayse Kaya',
        'agent',
      );
      fail('Expected previewCommission to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toMatchObject({
        code: 'UNAUTHORIZED_TRANSACTION_ACCESS',
      });
    }
  });

  it('exposes semantic error codes on invalid payload failures', async () => {
    try {
      await transactionsController.create(
        plainToInstance(CreateTransactionDto, {
          propertyRef: 'TR-IST-998',
          totalServiceFee: 100000,
          currency: 'AED',
          listingAgent: { id: 'agent-1', name: 'Ayse Kaya' },
          sellingAgent: { id: 'agent-2', name: 'Mert Demir' },
        }),
        'u-admin',
        'Admin User',
        'admin',
      );
      fail('Expected create to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        code: 'INVALID_TRANSACTION_PAYLOAD',
      });
    }
  });
});
