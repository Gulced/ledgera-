import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import type {
  ActivityAction,
  CommissionReason,
  TransactionStage,
  UserRole,
} from '../dto/transaction.dto';

export type TransactionDocument = HydratedDocument<TransactionRecord>;

@Schema({ _id: false })
export class ActorContextRecord {
  @Prop({ required: true })
  userId: string;

  @Prop()
  name?: string;

  @Prop({ required: true, enum: ['admin', 'operations', 'finance', 'agent'] })
  role: UserRole;
}

const ActorContextSchema = SchemaFactory.createForClass(ActorContextRecord);

@Schema({ _id: false })
export class AgentRefRecord {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  name: string;
}

const AgentRefSchema = SchemaFactory.createForClass(AgentRefRecord);

@Schema({ _id: false })
export class CommissionPayoutRecord {
  @Prop({ required: true })
  agentId: string;

  @Prop({ required: true })
  agentName: string;

  @Prop({ required: true })
  amount: number;

  @Prop({
    required: true,
    enum: ['listing', 'selling', 'listing_and_selling'],
  })
  reason: CommissionReason;
}

const CommissionPayoutSchema =
  SchemaFactory.createForClass(CommissionPayoutRecord);

@Schema({ _id: false })
export class CommissionExplanationRecord {
  @Prop({
    required: true,
    enum: ['agency_share', 'single_agent_full_pool', 'dual_agent_equal_split'],
  })
  code: string;

  @Prop({ required: true })
  message: string;
}

const CommissionExplanationSchema = SchemaFactory.createForClass(
  CommissionExplanationRecord,
);

@Schema({ _id: false })
export class CommissionBreakdownRecord {
  @Prop({ required: true })
  agencyShare: number;

  @Prop({ required: true })
  agentPool: number;

  @Prop({ type: [CommissionPayoutSchema], default: [] })
  payouts: CommissionPayoutRecord[];

  @Prop({ type: [CommissionExplanationSchema], default: [] })
  explanation: CommissionExplanationRecord[];
}

const CommissionBreakdownSchema = SchemaFactory.createForClass(
  CommissionBreakdownRecord,
);

@Schema({ _id: false })
export class TransactionHistoryItemRecord {
  @Prop({
    required: true,
    enum: ['agreement', 'earnest_money', 'title_deed', 'completed'],
  })
  stage: TransactionStage;

  @Prop({ required: true })
  changedAt: string;

  @Prop({ type: ActorContextSchema, required: true })
  changedBy: ActorContextRecord;
}

const TransactionHistoryItemSchema = SchemaFactory.createForClass(
  TransactionHistoryItemRecord,
);

@Schema({ _id: false })
export class ActivityLogEntryRecord {
  @Prop({ required: true })
  id: string;

  @Prop({
    required: true,
    enum: ['transaction_created', 'stage_transitioned', 'financials_locked'],
  })
  type: ActivityAction;

  @Prop({ required: true })
  summary: string;

  @Prop({ required: true })
  timestamp: string;

  @Prop({ required: true })
  actorId: string;

  @Prop({ required: true, enum: ['admin', 'operations', 'finance', 'agent'] })
  actorRole: UserRole;

  @Prop()
  actorName?: string;

  @Prop({ type: Object, default: undefined })
  previousValue?: Record<string, string | number | boolean | null>;

  @Prop({ type: Object, default: undefined })
  nextValue?: Record<string, string | number | boolean | null>;
}

const ActivityLogEntrySchema =
  SchemaFactory.createForClass(ActivityLogEntryRecord);

@Schema({ _id: false })
export class FinancialIntegrityRecord {
  @Prop({ required: true })
  isLocked: boolean;

  @Prop()
  lockedAt?: string;

  @Prop({ type: ActorContextSchema, default: undefined })
  lockedBy?: ActorContextRecord;
}

const FinancialIntegritySchema =
  SchemaFactory.createForClass(FinancialIntegrityRecord);

@Schema({ collection: 'transactions', versionKey: false })
export class TransactionRecord {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true, index: true })
  propertyRef: string;

  @Prop({ required: true })
  totalServiceFee: number;

  @Prop({ required: true, index: true })
  currency: string;

  @Prop({
    required: true,
    enum: ['agreement', 'earnest_money', 'title_deed', 'completed'],
    index: true,
  })
  stage: TransactionStage;

  @Prop({ type: AgentRefSchema, required: true })
  listingAgent: AgentRefRecord;

  @Prop({ type: AgentRefSchema, required: true })
  sellingAgent: AgentRefRecord;

  @Prop({ type: CommissionBreakdownSchema, required: true })
  commission: CommissionBreakdownRecord;

  @Prop({ type: [TransactionHistoryItemSchema], default: [] })
  history: TransactionHistoryItemRecord[];

  @Prop({ type: [ActivityLogEntrySchema], default: [] })
  activityLog: ActivityLogEntryRecord[];

  @Prop({ type: FinancialIntegritySchema, required: true })
  financialIntegrity: FinancialIntegrityRecord;

  @Prop({ type: ActorContextSchema, required: true })
  createdBy: ActorContextRecord;

  @Prop({ required: true })
  createdAt: string;

  @Prop({ required: true, index: true })
  updatedAt: string;
}

export const TransactionSchema =
  SchemaFactory.createForClass(TransactionRecord);
