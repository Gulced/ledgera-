import { defineStore } from 'pinia';
import type {
  ActorContext,
  AuthAccount,
  AuthSession,
  CreateUserAccountInput,
  LoginInput,
} from '~/types/api';

const SESSION_COOKIE = 'ledgera-session';

function parseSession(value: string | null | undefined): AuthSession | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as AuthSession;
  } catch {
    return null;
  }
}

function buildActor(session: AuthSession | null): ActorContext | null {
  if (!session) {
    return null;
  }

  return {
    userId: session.role === 'agent' ? session.linkedAgentId ?? session.id : session.id,
    name: session.name,
    role: session.role,
  };
}

export const useAuthStore = defineStore('auth', () => {
  const api = useLedgeraApi();
  const sessionCookie = useCookie<string | null>(SESSION_COOKIE, {
    sameSite: 'lax',
    path: '/',
  });

  const currentUser = ref<AuthSession | null>(parseSession(sessionCookie.value));
  const accounts = ref<AuthAccount[]>([]);

  function persistSession(session: AuthSession | null) {
    currentUser.value = session;
    sessionCookie.value = session ? JSON.stringify(session) : null;
  }

  async function loadAccounts() {
    const actor = buildActor(currentUser.value);

    if (!actor) {
      accounts.value = [];
      return [];
    }

    try {
      accounts.value = await api.getUsers(actor);
    } catch {
      accounts.value = [];
    }

    return accounts.value;
  }

  async function createAccount(input: CreateUserAccountInput) {
    const actor = buildActor(currentUser.value);

    if (!actor) {
      throw createError({
        statusCode: 401,
        statusMessage: 'You must be signed in before creating accounts.',
      });
    }

    const account = await api.createUserAccount(actor, input);
    accounts.value = [...accounts.value, account].sort((left, right) => left.name.localeCompare(right.name));

    return account;
  }

  async function login(input: LoginInput) {
    const account = await api.loginUser(input);

    persistSession({
      id: account.id,
      name: account.name,
      email: account.email,
      role: account.role,
      linkedAgentId: account.linkedAgentId,
    });

    await loadAccounts();

    return account;
  }

  function logout() {
    persistSession(null);
    accounts.value = [];
  }

  return {
    accounts,
    currentUser,
    loadAccounts,
    createAccount,
    login,
    logout,
  };
});
