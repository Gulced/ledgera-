import type { Agent, Listing, Transaction } from '~/types/api';

export function useAgentAssistantContext() {
  const selectedAgent = useState<Agent | null>('agent-assistant:selected-agent', () => null);
  const selectedListings = useState<Listing[]>('agent-assistant:selected-listings', () => []);
  const selectedTransactions = useState<Transaction[]>(
    'agent-assistant:selected-transactions',
    () => [],
  );
  const selectedMetrics = useState<{
    listingCount: number;
    transactionCount: number;
    linkedAccountCount: number;
  }>('agent-assistant:selected-metrics', () => ({
    listingCount: 0,
    transactionCount: 0,
    linkedAccountCount: 0,
  }));
  const totalVisibleAgents = useState<number>('agent-assistant:total-visible-agents', () => 0);

  function clearAgentAssistantContext() {
    selectedAgent.value = null;
    selectedListings.value = [];
    selectedTransactions.value = [];
    selectedMetrics.value = {
      listingCount: 0,
      transactionCount: 0,
      linkedAccountCount: 0,
    };
    totalVisibleAgents.value = 0;
  }

  return {
    selectedAgent,
    selectedListings,
    selectedTransactions,
    selectedMetrics,
    totalVisibleAgents,
    clearAgentAssistantContext,
  };
}
