import mongoose from 'mongoose';

const mongoUri = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/ledgera';
const databaseName = process.env.MONGODB_DB ?? 'ledgera';

const transactions = [
  {
    id: 'seed-transaction-001',
    propertyRef: 'TR-IST-SEA-001',
    totalServiceFee: 120000,
    currency: 'EUR',
    stage: 'earnest_money',
    listingAgent: { id: 'agent-1', name: 'Ayse Kaya' },
    sellingAgent: { id: 'agent-2', name: 'Mert Demir' },
    commission: {
      agencyShare: 60000,
      agentPool: 60000,
      payouts: [
        {
          agentId: 'agent-1',
          agentName: 'Ayse Kaya',
          amount: 30000,
          reason: 'listing',
        },
        {
          agentId: 'agent-2',
          agentName: 'Mert Demir',
          amount: 30000,
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
    },
    history: [
      {
        stage: 'agreement',
        changedAt: '2026-04-16T09:00:00.000Z',
        changedBy: { userId: 'u-admin', name: 'Admin User', role: 'admin' },
      },
      {
        stage: 'earnest_money',
        changedAt: '2026-04-16T10:00:00.000Z',
        changedBy: { userId: 'u-ops', name: 'Operations User', role: 'operations' },
      },
    ],
    activityLog: [
      {
        id: 'seed-log-1',
        type: 'transaction_created',
        summary: 'Transaction created and initialized at agreement stage.',
        timestamp: '2026-04-16T09:00:00.000Z',
        actorId: 'u-admin',
        actorRole: 'admin',
        actorName: 'Admin User',
        nextValue: {
          propertyRef: 'TR-IST-SEA-001',
          stage: 'agreement',
        },
      },
      {
        id: 'seed-log-2',
        type: 'stage_transitioned',
        summary: 'Transaction moved from agreement to earnest_money.',
        timestamp: '2026-04-16T10:00:00.000Z',
        actorId: 'u-ops',
        actorRole: 'operations',
        actorName: 'Operations User',
        previousValue: {
          fromStage: 'agreement',
          financialLock: false,
        },
        nextValue: {
          toStage: 'earnest_money',
          financialLock: false,
        },
      },
    ],
    financialIntegrity: {
      isLocked: false,
    },
    createdBy: { userId: 'u-admin', name: 'Admin User', role: 'admin' },
    createdAt: '2026-04-16T09:00:00.000Z',
    updatedAt: '2026-04-16T10:00:00.000Z',
  },
];

const listings = [
  {
    id: 'seed-listing-001',
    propertyRef: 'TR-IST-SEA-001',
    title: 'Sea View Residence in Istanbul',
    city: 'Istanbul',
    fullAddress: 'Bebek Mahallesi, Cevdet Pasa Caddesi No: 18, Besiktas, Istanbul',
    askingPrice: 2400000,
    currency: 'EUR',
    status: 'active',
    listingAgent: { id: 'agent-1', name: 'Ayse Kaya' },
    createdBy: { userId: 'u-admin', name: 'Admin User', role: 'admin' },
    createdAt: '2026-04-16T08:30:00.000Z',
    updatedAt: '2026-04-16T08:30:00.000Z',
  },
];

const agents = [
  {
    id: 'agent-1',
    name: 'Ayse Kaya',
    email: 'ayse@ledgera.com',
    phone: '+90 555 100 1001',
    isActive: true,
    createdAt: '2026-04-16T08:00:00.000Z',
    updatedAt: '2026-04-16T08:00:00.000Z',
  },
  {
    id: 'agent-2',
    name: 'Mert Demir',
    email: 'mert@ledgera.com',
    phone: '+90 555 100 1002',
    isActive: true,
    createdAt: '2026-04-16T08:05:00.000Z',
    updatedAt: '2026-04-16T08:05:00.000Z',
  },
];

const users = [
  {
    id: 'adm_demo01',
    name: 'Aylin Admin',
    email: 'admin@ledgera.app',
    password: 'demo123',
    role: 'admin',
    createdAt: '2026-04-16T08:00:00.000Z',
    updatedAt: '2026-04-16T08:00:00.000Z',
  },
  {
    id: 'ope_demo01',
    name: 'Ozan Ops',
    email: 'operations@ledgera.app',
    password: 'demo123',
    role: 'operations',
    createdAt: '2026-04-16T08:00:00.000Z',
    updatedAt: '2026-04-16T08:00:00.000Z',
  },
  {
    id: 'fin_demo01',
    name: 'Ferah Finance',
    email: 'finance@ledgera.app',
    password: 'demo123',
    role: 'finance',
    createdAt: '2026-04-16T08:00:00.000Z',
    updatedAt: '2026-04-16T08:00:00.000Z',
  },
  {
    id: 'agent-1',
    linkedAgentId: 'agent-1',
    name: 'Ayse Kaya',
    email: 'ayse@ledgera.com',
    password: 'demo123',
    role: 'agent',
    createdAt: '2026-04-16T08:00:00.000Z',
    updatedAt: '2026-04-16T08:00:00.000Z',
  },
];

async function run() {
  await mongoose.connect(mongoUri, { dbName: databaseName });
  const transactionsCollection = mongoose.connection.collection('transactions');
  const listingsCollection = mongoose.connection.collection('listings');
  const agentsCollection = mongoose.connection.collection('agents');
  const usersCollection = mongoose.connection.collection('users');

  await transactionsCollection.deleteMany({ id: { $in: transactions.map((item) => item.id) } });
  await listingsCollection.deleteMany({ id: { $in: listings.map((item) => item.id) } });
  await agentsCollection.deleteMany({ id: { $in: agents.map((item) => item.id) } });
  await usersCollection.deleteMany({
    email: { $in: users.map((item) => item.email) },
  });
  await agentsCollection.insertMany(agents);
  await listingsCollection.insertMany(listings);
  await transactionsCollection.insertMany(transactions);
  await usersCollection.insertMany(users);

  console.log(
    `Seeded ${agents.length} agent(s), ${users.length} user account(s), ${listings.length} listing(s), and ${transactions.length} transaction(s) into ${databaseName}.`,
  );
  await mongoose.disconnect();
}

run().catch(async (error: unknown) => {
  console.error('Seed failed:', error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
