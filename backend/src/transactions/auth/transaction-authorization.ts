import type {
  ActorContextDto,
  TransactionListQueryDto,
  TransactionDto,
  UserRole,
} from '../dto/transaction.dto';
import {
  AppForbiddenException,
  AppUnauthorizedException,
} from '../../common/errors/app-error';

const CREATE_ROLES: UserRole[] = ['admin', 'operations'];
const TRANSITION_ROLES: UserRole[] = ['admin', 'operations'];
const READ_ALL_ROLES: UserRole[] = ['admin', 'operations', 'finance'];
const PREVIEW_ROLES: UserRole[] = ['admin', 'operations', 'finance'];
const USER_ROLES: UserRole[] = ['admin', 'operations', 'finance', 'agent'];

export function buildAuthorizedActorContext(
  userId?: string,
  name?: string,
  role?: string,
): ActorContextDto {
  if (!userId || !role) {
    throw new AppUnauthorizedException(
      'UNAUTHORIZED_ACTOR_CONTEXT',
      'x-user-id and x-user-role headers are required.',
    );
  }

  if (!USER_ROLES.includes(role as UserRole)) {
    throw new AppUnauthorizedException(
      'UNSUPPORTED_USER_ROLE',
      `Unsupported user role: ${role}.`,
    );
  }

  return {
    userId,
    name: name ?? 'Unknown User',
    role: role as UserRole,
  };
}

export function assertCanCreateTransaction(actor: ActorContextDto) {
  if (!CREATE_ROLES.includes(actor.role)) {
    throw new AppForbiddenException(
      'UNAUTHORIZED_TRANSACTION_ACCESS',
      `${actor.role} role cannot create transactions.`,
    );
  }
}

export function assertCanTransitionTransaction(actor: ActorContextDto) {
  if (!TRANSITION_ROLES.includes(actor.role)) {
    throw new AppForbiddenException(
      'UNAUTHORIZED_TRANSACTION_ACCESS',
      `${actor.role} role cannot transition transaction stages.`,
    );
  }
}

export function canReadAllTransactions(actor: ActorContextDto) {
  return READ_ALL_ROLES.includes(actor.role);
}

export function assertCanListTransactions(
  actor: ActorContextDto,
  query: TransactionListQueryDto,
) {
  if (canReadAllTransactions(actor)) {
    return;
  }

  if (actor.role !== 'agent') {
    throw new AppForbiddenException(
      'UNAUTHORIZED_TRANSACTION_ACCESS',
      `${actor.role} role cannot access the transaction list.`,
    );
  }

  if (query.agentId && query.agentId !== actor.userId) {
    throw new AppForbiddenException(
      'UNAUTHORIZED_TRANSACTION_ACCESS',
      'Agent users can only query transaction lists for themselves.',
    );
  }
}

export function assertCanViewTransaction(
  actor: ActorContextDto,
  transaction: TransactionDto,
) {
  if (canReadAllTransactions(actor)) {
    return;
  }

  const isAssignedAgent =
    transaction.listingAgent.id === actor.userId ||
    transaction.sellingAgent.id === actor.userId;

  if (actor.role === 'agent' && isAssignedAgent) {
    return;
  }

  throw new AppForbiddenException(
    'UNAUTHORIZED_TRANSACTION_ACCESS',
    `${actor.role} role cannot access transaction ${transaction.id}.`,
  );
}

export function assertCanPreviewCommission(actor: ActorContextDto) {
  if (!PREVIEW_ROLES.includes(actor.role)) {
    throw new AppForbiddenException(
      'UNAUTHORIZED_TRANSACTION_ACCESS',
      `${actor.role} role cannot preview commissions.`,
    );
  }
}
