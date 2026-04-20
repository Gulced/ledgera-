import { AgentsService } from '../agents/agents.service';
import type { AgentDto } from '../agents/dto/agent.dto';
import { AgentsRepository } from '../agents/agents.repository';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import type { ActorContextDto, TransactionDto } from './dto/transaction.dto';
import { TransactionsRepository } from './transactions.repository';

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

describe('TransactionsService', () => {
  let service: TransactionsService;
  let adminActor: ActorContextDto;
  let operationsActor: ActorContextDto;
  let financeActor: ActorContextDto;
  let listingAgentActor: ActorContextDto;
  let anotherAgentActor: ActorContextDto;

  beforeEach(() => {
    const agentsService = new AgentsService(
      new InMemoryAgentsRepository([
        {
          id: 'a1',
          name: 'Ayse Kaya',
          email: 'ayse@example.com',
          isActive: true,
          createdAt: '2026-04-16T00:00:00.000Z',
          updatedAt: '2026-04-16T00:00:00.000Z',
        },
        {
          id: 'a2',
          name: 'Mert Demir',
          email: 'mert@example.com',
          isActive: true,
          createdAt: '2026-04-16T00:00:00.000Z',
          updatedAt: '2026-04-16T00:00:00.000Z',
        },
        {
          id: 'a3',
          name: 'Ece Yilmaz',
          email: 'ece@example.com',
          isActive: true,
          createdAt: '2026-04-16T00:00:00.000Z',
          updatedAt: '2026-04-16T00:00:00.000Z',
        },
        {
          id: 'a4',
          name: 'Can Arda',
          email: 'can@example.com',
          isActive: true,
          createdAt: '2026-04-16T00:00:00.000Z',
          updatedAt: '2026-04-16T00:00:00.000Z',
        },
        {
          id: 'a5',
          name: 'Melis Yilmaz',
          isActive: true,
          createdAt: '2026-04-16T00:00:00.000Z',
          updatedAt: '2026-04-16T00:00:00.000Z',
        },
        {
          id: 'a6',
          name: 'Kerem Acar',
          isActive: true,
          createdAt: '2026-04-16T00:00:00.000Z',
          updatedAt: '2026-04-16T00:00:00.000Z',
        },
        {
          id: 'a8',
          name: 'Can Arda',
          isActive: true,
          createdAt: '2026-04-16T00:00:00.000Z',
          updatedAt: '2026-04-16T00:00:00.000Z',
        },
        {
          id: 'a9',
          name: 'Ece Yilmaz',
          isActive: true,
          createdAt: '2026-04-16T00:00:00.000Z',
          updatedAt: '2026-04-16T00:00:00.000Z',
        },
      ]),
    );
    service = new TransactionsService(
      new InMemoryTransactionsRepository(),
      agentsService,
    );
    adminActor = { userId: 'u-admin', name: 'Admin User', role: 'admin' };
    operationsActor = {
      userId: 'u-ops',
      name: 'Operations User',
      role: 'operations',
    };
    financeActor = {
      userId: 'u-finance',
      name: 'Finance User',
      role: 'finance',
    };
    listingAgentActor = { userId: 'a1', name: 'Ayse Kaya', role: 'agent' };
    anotherAgentActor = { userId: 'a3', name: 'Ece Yilmaz', role: 'agent' };
  });

  it('gives the full agent pool to one agent when listing and selling agent are the same', async () => {
    const transaction = await service.create(
      {
        propertyRef: 'TR-IST-001',
        totalServiceFee: 100000,
        listingAgent: { id: 'a1', name: 'Ayse Kaya' },
        sellingAgent: { id: 'a1', name: 'Ayse Kaya' },
      },
      adminActor,
    );

    expect(transaction.commission.agencyShare).toBe(50000);
    expect(transaction.commission.agentPool).toBe(50000);
    expect(transaction.commission.payouts).toEqual([
      {
        agentId: 'a1',
        agentName: 'Ayse Kaya',
        amount: 50000,
        reason: 'listing_and_selling',
      },
    ]);
    expect(transaction.commission.explanation).toEqual([
      {
        code: 'agency_share',
        message: 'The agency receives 50% of the total service fee.',
      },
      {
        code: 'single_agent_full_pool',
        message:
          'The same agent handled both listing and selling, so they receive the full agent pool.',
      },
    ]);
  });

  it('splits the agent pool equally when listing and selling agents are different', async () => {
    const transaction = await service.create(
      {
        propertyRef: 'TR-IST-002',
        totalServiceFee: 80000,
        listingAgent: { id: 'a1', name: 'Ayse Kaya' },
        sellingAgent: { id: 'a2', name: 'Mert Demir' },
      },
      adminActor,
    );

    expect(transaction.commission.agencyShare).toBe(40000);
    expect(transaction.commission.agentPool).toBe(40000);
    expect(transaction.commission.payouts).toEqual([
      {
        agentId: 'a1',
        agentName: 'Ayse Kaya',
        amount: 20000,
        reason: 'listing',
      },
      {
        agentId: 'a2',
        agentName: 'Mert Demir',
        amount: 20000,
        reason: 'selling',
      },
    ]);
    expect(transaction.activityLog).toHaveLength(1);
    expect(transaction.activityLog[0]).toMatchObject({
      type: 'transaction_created',
      actorId: 'u-admin',
      actorRole: 'admin',
      nextValue: {
        propertyRef: 'TR-IST-002',
        stage: 'agreement',
      },
    });
  });

  it('allows only forward stage transitions one step at a time', async () => {
    const transaction = await service.create(
      {
        propertyRef: 'TR-IST-003',
        totalServiceFee: 70000,
        listingAgent: { id: 'a1', name: 'Ayse Kaya' },
        sellingAgent: { id: 'a2', name: 'Mert Demir' },
      },
      operationsActor,
    );

    const earnestMoney = await service.transitionStage(
      transaction.id,
      'earnest_money',
      operationsActor,
    );
    const titleDeed = await service.transitionStage(
      transaction.id,
      'title_deed',
      operationsActor,
    );
    const completed = await service.transitionStage(
      transaction.id,
      'completed',
      operationsActor,
    );

    expect(earnestMoney.stage).toBe('earnest_money');
    expect(titleDeed.stage).toBe('title_deed');
    expect(completed.stage).toBe('completed');
    expect(completed.history).toHaveLength(4);
    expect(completed.financialIntegrity.isLocked).toBe(true);
    expect(completed.activityLog.at(-1)?.type).toBe('financials_locked');
    expect(completed.activityLog.at(-1)).toMatchObject({
      actorId: 'u-ops',
      actorRole: 'operations',
      previousValue: {
        isLocked: false,
      },
      nextValue: {
        isLocked: true,
      },
    });
  });

  it('treats repeated stage requests as idempotent no-ops', async () => {
    const transaction = await service.create(
      {
        propertyRef: 'TR-IST-003A',
        totalServiceFee: 70000,
        currency: 'EUR',
        listingAgent: { id: 'a1', name: 'Ayse Kaya' },
        sellingAgent: { id: 'a2', name: 'Mert Demir' },
      },
      operationsActor,
    );

    const transitioned = await service.transitionStage(
      transaction.id,
      'earnest_money',
      operationsActor,
    );
    const repeated = await service.transitionStage(
      transaction.id,
      'earnest_money',
      operationsActor,
    );

    expect(repeated.stage).toBe('earnest_money');
    expect(repeated.updatedAt).toBe(transitioned.updatedAt);
    expect(repeated.history).toHaveLength(2);
    expect(repeated.activityLog).toHaveLength(2);
  });

  it('rejects skipping a stage', async () => {
    const transaction = await service.create(
      {
        propertyRef: 'TR-IST-004',
        totalServiceFee: 70000,
        listingAgent: { id: 'a1', name: 'Ayse Kaya' },
        sellingAgent: { id: 'a2', name: 'Mert Demir' },
      },
      adminActor,
    );

    await expect(
      service.transitionStage(transaction.id, 'title_deed', operationsActor),
    ).rejects.toThrow(BadRequestException);
  });

  it('prevents finance users from creating transactions', () => {
    return expect(
      service.create(
        {
          propertyRef: 'TR-IST-005',
          totalServiceFee: 90000,
          listingAgent: { id: 'a1', name: 'Ayse Kaya' },
          sellingAgent: { id: 'a2', name: 'Mert Demir' },
        },
        financeActor,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects unsupported currencies at the domain layer', async () => {
    try {
      await service.create(
        {
          propertyRef: 'TR-IST-005A',
          totalServiceFee: 90000,
          currency: 'AED' as never,
          listingAgent: { id: 'a1', name: 'Ayse Kaya' },
          sellingAgent: { id: 'a2', name: 'Mert Demir' },
        },
        adminActor,
      );
      fail('Expected create to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        code: 'INVALID_TRANSACTION_PAYLOAD',
      });
    }
  });

  it('rejects missing agent identity fields at the domain layer', async () => {
    await expect(
      service.create(
        {
          propertyRef: 'TR-IST-005B',
          totalServiceFee: 90000,
          currency: 'EUR',
          listingAgent: { id: '', name: 'Ayse Kaya' },
          sellingAgent: { id: 'a2', name: 'Mert Demir' },
        },
        adminActor,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('allows an assigned agent to view only their own transactions', async () => {
    const ownTransaction = await service.create(
      {
        propertyRef: 'TR-IST-006',
        totalServiceFee: 60000,
        listingAgent: { id: 'a1', name: 'Ayse Kaya' },
        sellingAgent: { id: 'a2', name: 'Mert Demir' },
      },
      adminActor,
    );

    await service.create(
      {
        propertyRef: 'TR-IST-007',
        totalServiceFee: 50000,
        listingAgent: { id: 'a9', name: 'Can Arda' },
        sellingAgent: { id: 'a2', name: 'Mert Demir' },
      },
      adminActor,
    );

    expect((await service.findAll(listingAgentActor)).items).toHaveLength(1);
    expect((await service.findById(ownTransaction.id, listingAgentActor)).id).toBe(
      ownTransaction.id,
    );
    await expect(
      service.findById(ownTransaction.id, anotherAgentActor),
    ).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('allows admin users to list and view all transactions', async () => {
    const first = await service.create(
      {
        propertyRef: 'TR-AUTH-001',
        totalServiceFee: 50000,
        currency: 'EUR',
        listingAgent: { id: 'a1', name: 'Ayse Kaya' },
        sellingAgent: { id: 'a2', name: 'Mert Demir' },
      },
      adminActor,
    );
    const second = await service.create(
      {
        propertyRef: 'TR-AUTH-002',
        totalServiceFee: 65000,
        currency: 'USD',
        listingAgent: { id: 'a8', name: 'Can Arda' },
        sellingAgent: { id: 'a9', name: 'Ece Yilmaz' },
      },
      adminActor,
    );

    const listed = await service.findAll(adminActor);

    expect(listed.items).toHaveLength(2);
    expect((await service.findById(first.id, adminActor)).id).toBe(first.id);
    expect((await service.findById(second.id, adminActor)).id).toBe(second.id);
  });

  it('allows operations users to create, view, preview, and summarize transactions', async () => {
    const created = await service.create(
      {
        propertyRef: 'TR-AUTH-003',
        totalServiceFee: 78000,
        currency: 'TRY',
        listingAgent: { id: 'a1', name: 'Ayse Kaya' },
        sellingAgent: { id: 'a2', name: 'Mert Demir' },
      },
      operationsActor,
    );

    const preview = await service.previewCommission(
      {
        propertyRef: 'TR-AUTH-004',
        totalServiceFee: 82000,
        currency: 'EUR',
        listingAgent: { id: 'a1', name: 'Ayse Kaya' },
        sellingAgent: { id: 'a2', name: 'Mert Demir' },
      },
      operationsActor,
    );
    const summary = await service.getSummary(operationsActor);

    expect((await service.findById(created.id, operationsActor)).id).toBe(created.id);
    expect(preview.commission.agencyShare).toBe(41000);
    expect(summary.totals.transactions).toBe(1);
  });

  it('allows finance users to list, view, summarize, and preview but not mutate', async () => {
    const created = await service.create(
      {
        propertyRef: 'TR-AUTH-005',
        totalServiceFee: 88000,
        currency: 'EUR',
        listingAgent: { id: 'a1', name: 'Ayse Kaya' },
        sellingAgent: { id: 'a2', name: 'Mert Demir' },
      },
      adminActor,
    );

    const listed = await service.findAll(financeActor);
    const summary = await service.getSummary(financeActor);
    const preview = await service.previewCommission(
      {
        propertyRef: 'TR-AUTH-006',
        totalServiceFee: 92000,
        currency: 'USD',
        listingAgent: { id: 'a1', name: 'Ayse Kaya' },
        sellingAgent: { id: 'a2', name: 'Mert Demir' },
      },
      financeActor,
    );

    expect(listed.items).toHaveLength(1);
    expect((await service.findById(created.id, financeActor)).id).toBe(created.id);
    expect(summary.totals.transactions).toBe(1);
    expect(preview.commission.agentPool).toBe(46000);
    await expect(
      service.transitionStage(created.id, 'earnest_money', financeActor),
    ).rejects.toThrow(ForbiddenException);
  });

  it('prevents agent users from creating transactions', async () => {
    await expect(
      service.create(
        {
          propertyRef: 'TR-AUTH-007',
          totalServiceFee: 50000,
          currency: 'EUR',
          listingAgent: { id: 'a1', name: 'Ayse Kaya' },
          sellingAgent: { id: 'a2', name: 'Mert Demir' },
        },
        listingAgentActor,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('returns a commission preview before the transaction is created', async () => {
    const preview = await service.previewCommission(
      {
        propertyRef: 'TR-IST-008',
        totalServiceFee: 120000,
        currency: 'USD',
        listingAgent: { id: 'a1', name: 'Ayse Kaya' },
        sellingAgent: { id: 'a2', name: 'Mert Demir' },
      },
      financeActor,
    );

    expect(preview.commission.agencyShare).toBe(60000);
    expect(preview.commission.explanation[1]?.code).toBe('dual_agent_equal_split');
    expect(preview.currency).toBe('USD');
  });

  it('does not persist transactions or audit records when generating a preview', async () => {
    const beforeList = await service.findAll(adminActor);
    const preview = await service.previewCommission(
      {
        propertyRef: 'TR-PREVIEW-001',
        totalServiceFee: 123000,
        currency: 'EUR',
        listingAgent: { id: 'a1', name: 'Ayse Kaya' },
        sellingAgent: { id: 'a2', name: 'Mert Demir' },
      },
      adminActor,
    );
    const afterList = await service.findAll(adminActor);

    expect(preview.commission.agencyShare).toBe(61500);
    expect(beforeList.paginationMeta.totalItems).toBe(0);
    expect(afterList.paginationMeta.totalItems).toBe(0);
    expect(afterList.items).toEqual([]);
  });

  it('does not change an existing transaction when preview is requested', async () => {
    const created = await service.create(
      {
        propertyRef: 'TR-PREVIEW-002',
        totalServiceFee: 88000,
        currency: 'EUR',
        listingAgent: { id: 'a1', name: 'Ayse Kaya' },
        sellingAgent: { id: 'a2', name: 'Mert Demir' },
      },
      adminActor,
    );

    await service.previewCommission(
      {
        propertyRef: 'TR-PREVIEW-003',
        totalServiceFee: 91000,
        currency: 'USD',
        listingAgent: { id: 'a3', name: 'Ece Yilmaz' },
        sellingAgent: { id: 'a4', name: 'Can Arda' },
      },
      adminActor,
    );

    const reloaded = await service.findById(created.id, adminActor);
    expect(reloaded.history).toEqual(created.history);
    expect(reloaded.activityLog).toEqual(created.activityLog);
    expect(reloaded.commission).toEqual(created.commission);
    expect(reloaded.financialIntegrity).toEqual(created.financialIntegrity);
    expect(reloaded.updatedAt).toBe(created.updatedAt);
  });

  it('prevents agent users from previewing commissions', async () => {
    try {
      await service.previewCommission(
        {
          propertyRef: 'TR-IST-008A',
          totalServiceFee: 120000,
          currency: 'USD',
          listingAgent: { id: 'a1', name: 'Ayse Kaya' },
          sellingAgent: { id: 'a2', name: 'Mert Demir' },
        },
        listingAgentActor,
      );
      fail('Expected previewCommission to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toMatchObject({
        code: 'UNAUTHORIZED_TRANSACTION_ACCESS',
      });
    }
  });

  it('supports search, filtering and pagination for transaction lists', async () => {
    await service.create(
      {
        propertyRef: 'TR-ANK-009',
        totalServiceFee: 50000,
        currency: 'EUR',
        listingAgent: { id: 'a1', name: 'Ayse Kaya' },
        sellingAgent: { id: 'a2', name: 'Mert Demir' },
      },
      adminActor,
    );
    const istanbulSale = await service.create(
      {
        propertyRef: 'TR-IST-010',
        totalServiceFee: 75000,
        currency: 'USD',
        listingAgent: { id: 'a3', name: 'Ece Yilmaz' },
        sellingAgent: { id: 'a2', name: 'Mert Demir' },
      },
      adminActor,
    );
    await service.transitionStage(
      istanbulSale.id,
      'earnest_money',
      operationsActor,
    );

    const filtered = await service.findAll(adminActor, {
      search: 'IST',
      stage: 'earnest_money',
      page: 1,
      limit: 1,
    });

    expect(filtered.items).toHaveLength(1);
    expect(filtered.items[0]?.propertyRef).toBe('TR-IST-010');
    expect(filtered.paginationMeta.totalItems).toBe(1);
    expect(filtered.paginationMeta.totalPages).toBe(1);
    expect(filtered.paginationMeta.hasNextPage).toBe(false);
    expect(filtered.paginationMeta.hasPrevPage).toBe(false);
  });

  it('supports sorting transactions by totalServiceFee ascending', async () => {
    await service.create(
      {
        propertyRef: 'TR-IST-S1',
        totalServiceFee: 95000,
        currency: 'EUR',
        listingAgent: { id: 'a1', name: 'Ayse Kaya' },
        sellingAgent: { id: 'a2', name: 'Mert Demir' },
      },
      adminActor,
    );
    await service.create(
      {
        propertyRef: 'TR-IST-S2',
        totalServiceFee: 45000,
        currency: 'EUR',
        listingAgent: { id: 'a3', name: 'Ece Yilmaz' },
        sellingAgent: { id: 'a4', name: 'Can Arda' },
      },
      adminActor,
    );

    const sorted = await service.findAll(adminActor, {
      sortBy: 'totalServiceFee',
      order: 'asc',
    });

    expect(sorted.items[0]?.propertyRef).toBe('TR-IST-S2');
    expect(sorted.items[1]?.propertyRef).toBe('TR-IST-S1');
    expect(sorted.paginationMeta.totalItems).toBe(2);
  });

  it('supports sorting transactions by createdAt ascending', async () => {
    await service.create(
      {
        propertyRef: 'TR-IST-S3',
        totalServiceFee: 70000,
        currency: 'USD',
        listingAgent: { id: 'a1', name: 'Ayse Kaya' },
        sellingAgent: { id: 'a2', name: 'Mert Demir' },
      },
      adminActor,
    );
    await service.create(
      {
        propertyRef: 'TR-IST-S4',
        totalServiceFee: 80000,
        currency: 'USD',
        listingAgent: { id: 'a5', name: 'Melis Yilmaz' },
        sellingAgent: { id: 'a6', name: 'Kerem Acar' },
      },
      adminActor,
    );

    const sorted = await service.findAll(adminActor, {
      sortBy: 'createdAt',
      order: 'asc',
    });

    expect(sorted.items[0]?.propertyRef).toBe('TR-IST-S3');
    expect(sorted.items[1]?.propertyRef).toBe('TR-IST-S4');
  });

  it('prevents an agent from querying another agent transaction list', async () => {
    await service.create(
      {
        propertyRef: 'TR-IST-010A',
        totalServiceFee: 55000,
        currency: 'EUR',
        listingAgent: { id: 'a1', name: 'Ayse Kaya' },
        sellingAgent: { id: 'a2', name: 'Mert Demir' },
      },
      adminActor,
    );

    await expect(
      service.findAll(listingAgentActor, {
        agentId: 'a2',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('prevents finance users from transitioning stages', async () => {
    const transaction = await service.create(
      {
        propertyRef: 'TR-IST-010B',
        totalServiceFee: 73000,
        currency: 'EUR',
        listingAgent: { id: 'a1', name: 'Ayse Kaya' },
        sellingAgent: { id: 'a2', name: 'Mert Demir' },
      },
      adminActor,
    );

    await expect(
      service.transitionStage(transaction.id, 'earnest_money', financeActor),
    ).rejects.toThrow(ForbiddenException);
  });

  it('returns dashboard summary metrics for visible transactions', async () => {
    const first = await service.create(
      {
        propertyRef: 'TR-IST-012',
        totalServiceFee: 100000,
        currency: 'EUR',
        listingAgent: { id: 'a1', name: 'Ayse Kaya' },
        sellingAgent: { id: 'a2', name: 'Mert Demir' },
      },
      adminActor,
    );
    const second = await service.create(
      {
        propertyRef: 'TR-ANK-013',
        totalServiceFee: 80000,
        currency: 'USD',
        listingAgent: { id: 'a3', name: 'Ece Yilmaz' },
        sellingAgent: { id: 'a2', name: 'Mert Demir' },
      },
      adminActor,
    );

    await service.transitionStage(first.id, 'earnest_money', operationsActor);
    await service.transitionStage(first.id, 'title_deed', operationsActor);
    await service.transitionStage(first.id, 'completed', operationsActor);
    await service.transitionStage(second.id, 'earnest_money', operationsActor);

    const summary = await service.getSummary(adminActor);

    expect(summary.totals.transactions).toBe(2);
    expect(summary.totals.completedTransactions).toBe(1);
    expect(summary.totals.totalServiceFee).toBe(180000);
    expect(summary.totals.totalAgencyEarnings).toBe(90000);
    expect(summary.totals.totalAgentEarnings).toBe(90000);
    expect(summary.earningsBreakdown.agencyTotal).toBe(90000);
    expect(summary.earningsBreakdown.agentTotal).toBe(90000);
    expect(summary.stageDistribution.completed).toBe(1);
    expect(summary.stageDistribution.earnest_money).toBe(1);
    expect(summary.currencyBreakdown.EUR).toBe(1);
    expect(summary.currencyBreakdown.USD).toBe(1);
  });

  it('limits summary metrics to an agent ownership scope', async () => {
    await service.create(
      {
        propertyRef: 'TR-IST-014',
        totalServiceFee: 90000,
        currency: 'EUR',
        listingAgent: { id: 'a1', name: 'Ayse Kaya' },
        sellingAgent: { id: 'a2', name: 'Mert Demir' },
      },
      adminActor,
    );
    await service.create(
      {
        propertyRef: 'TR-BOD-015',
        totalServiceFee: 70000,
        currency: 'EUR',
        listingAgent: { id: 'a8', name: 'Can Arda' },
        sellingAgent: { id: 'a9', name: 'Ece Yilmaz' },
      },
      adminActor,
    );

    const summary = await service.getSummary(listingAgentActor);

    expect(summary.totals.transactions).toBe(1);
    expect(summary.totals.totalServiceFee).toBe(90000);
    expect(summary.earningsBreakdown.agencyTotal).toBe(45000);
    expect(summary.earningsBreakdown.agentTotal).toBe(45000);
    expect(summary.stageDistribution.agreement).toBe(1);
  });

  it('blocks further transaction changes after financial lock', async () => {
    const transaction = await service.create(
      {
        propertyRef: 'TR-IST-011',
        totalServiceFee: 95000,
        listingAgent: { id: 'a1', name: 'Ayse Kaya' },
        sellingAgent: { id: 'a2', name: 'Mert Demir' },
      },
      operationsActor,
    );

    await service.transitionStage(
      transaction.id,
      'earnest_money',
      operationsActor,
    );
    await service.transitionStage(
      transaction.id,
      'title_deed',
      operationsActor,
    );
    const completed = await service.transitionStage(
      transaction.id,
      'completed',
      operationsActor,
    );

    await expect(
      service.transitionStage(transaction.id, 'earnest_money', operationsActor),
    ).rejects.toThrow(BadRequestException);

    const reloaded = await service.findById(transaction.id, operationsActor);
    expect(reloaded.stage).toBe('completed');
    expect(reloaded.commission).toEqual(completed.commission);
    expect(reloaded.financialIntegrity).toEqual(completed.financialIntegrity);
    expect(reloaded.history).toHaveLength(4);
  });

  it('returns semantic code for financial lock violations', async () => {
    const transaction = await service.create(
      {
        propertyRef: 'TR-IST-017',
        totalServiceFee: 95000,
        currency: 'EUR',
        listingAgent: { id: 'a1', name: 'Ayse Kaya' },
        sellingAgent: { id: 'a2', name: 'Mert Demir' },
      },
      operationsActor,
    );

    await service.transitionStage(transaction.id, 'earnest_money', operationsActor);
    await service.transitionStage(transaction.id, 'title_deed', operationsActor);
    await service.transitionStage(transaction.id, 'completed', operationsActor);

    await expect(
      service.transitionStage(transaction.id, 'earnest_money', operationsActor),
    ).rejects.toMatchObject({
      response: {
        code: 'FINANCIAL_LOCK_VIOLATION',
      },
    });
  });

  it('does not create duplicate lock events when completed is requested twice', async () => {
    const transaction = await service.create(
      {
        propertyRef: 'TR-IST-017A',
        totalServiceFee: 95000,
        currency: 'EUR',
        listingAgent: { id: 'a1', name: 'Ayse Kaya' },
        sellingAgent: { id: 'a2', name: 'Mert Demir' },
      },
      operationsActor,
    );

    await service.transitionStage(transaction.id, 'earnest_money', operationsActor);
    await service.transitionStage(transaction.id, 'title_deed', operationsActor);
    const completed = await service.transitionStage(
      transaction.id,
      'completed',
      operationsActor,
    );
    const repeatedCompleted = await service.transitionStage(
      transaction.id,
      'completed',
      operationsActor,
    );

    expect(repeatedCompleted.updatedAt).toBe(completed.updatedAt);
    expect(repeatedCompleted.history).toHaveLength(4);
    expect(
      repeatedCompleted.activityLog.filter((entry) => entry.type === 'financials_locked'),
    ).toHaveLength(1);
  });

  it('preserves commission snapshot and financial integrity after rejected post-completion mutation', async () => {
    const transaction = await service.create(
      {
        propertyRef: 'TR-IST-017B',
        totalServiceFee: 99000,
        currency: 'EUR',
        listingAgent: { id: 'a1', name: 'Ayse Kaya' },
        sellingAgent: { id: 'a2', name: 'Mert Demir' },
      },
      operationsActor,
    );

    await service.transitionStage(transaction.id, 'earnest_money', operationsActor);
    await service.transitionStage(transaction.id, 'title_deed', operationsActor);
    const completed = await service.transitionStage(
      transaction.id,
      'completed',
      operationsActor,
    );

    await expect(
      service.transitionStage(transaction.id, 'agreement', operationsActor),
    ).rejects.toMatchObject({
      response: {
        code: 'FINANCIAL_LOCK_VIOLATION',
      },
    });

    const reloaded = await service.findById(transaction.id, operationsActor);
    expect(reloaded.commission).toEqual(completed.commission);
    expect(reloaded.financialIntegrity).toEqual(completed.financialIntegrity);
    expect(reloaded.activityLog).toEqual(completed.activityLog);
    expect(reloaded.updatedAt).toBe(completed.updatedAt);
  });

  it('records previous and next values for stage transition audit logs', async () => {
    const transaction = await service.create(
      {
        propertyRef: 'TR-IST-018',
        totalServiceFee: 85000,
        currency: 'EUR',
        listingAgent: { id: 'a1', name: 'Ayse Kaya' },
        sellingAgent: { id: 'a2', name: 'Mert Demir' },
      },
      operationsActor,
    );

    const updated = await service.transitionStage(
      transaction.id,
      'earnest_money',
      operationsActor,
    );

    expect(updated.activityLog.at(-1)).toMatchObject({
      type: 'stage_transitioned',
      actorId: 'u-ops',
      actorRole: 'operations',
      previousValue: {
        fromStage: 'agreement',
      },
      nextValue: {
        toStage: 'earnest_money',
      },
    });
  });

  it('refuses completion when transaction financial data is incomplete', async () => {
    const transaction = await service.create(
      {
        propertyRef: 'TR-IST-016',
        totalServiceFee: 100000,
        currency: 'EUR',
        listingAgent: { id: 'a1', name: 'Ayse Kaya' },
        sellingAgent: { id: 'a2', name: 'Mert Demir' },
      },
      adminActor,
    );

    const brokenTransaction = {
      ...transaction,
      commission: {
        ...transaction.commission,
        payouts: [],
      },
    };

    const repository = service['transactionsRepository'];
    await repository.update(transaction.id, brokenTransaction);

    await service.transitionStage(
      transaction.id,
      'earnest_money',
      operationsActor,
    );
    await service.transitionStage(
      transaction.id,
      'title_deed',
      operationsActor,
    );

    await expect(
      service.transitionStage(transaction.id, 'completed', operationsActor),
    ).rejects.toThrow(BadRequestException);
  });
});
