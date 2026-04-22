import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppBadRequestException } from '../common/errors/app-error';
import type { ActorContextDto } from '../transactions/dto/transaction.dto';
import type {
  AssistantHistoryQueryDto,
  AssistantMessageDto,
  AssistantProposedActionDto,
  AssistantPageType,
  AssistantResponseDto,
} from './dto/assistant.dto';
import {
  AssistantMessageRecord,
  type AssistantMessageDocument,
} from './schemas/assistant-message.schema';

@Injectable()
export class AssistantService {
  constructor(
    private readonly configService: ConfigService,
    @InjectModel(AssistantMessageRecord.name)
    private readonly assistantMessageModel: Model<AssistantMessageDocument>,
  ) {}

  async listHistory(
    actor: ActorContextDto,
    query: AssistantHistoryQueryDto,
  ): Promise<AssistantMessageDto[]> {
    const records = await this.assistantMessageModel
      .find({
        actorId: actor.userId,
        pageType: query.pageType,
        ...(query.entityId ? { entityId: query.entityId } : { entityId: { $exists: false } }),
      })
      .sort({ createdAt: 1 })
      .limit(40)
      .lean()
      .exec();

    return records.map((record) => this.toMessageDto(record));
  }

  async chat(input: {
    actor: ActorContextDto;
    pageType: AssistantPageType;
    prompt: string;
    title?: string;
    entityId?: string;
    context: Record<string, unknown>;
  }): Promise<AssistantResponseDto> {
    const { actor, pageType, prompt, title, entityId, context } = input;
    let response: string;
    let source: 'gemini' | 'fallback' = 'gemini';

    await this.assistantMessageModel.create({
      actorId: actor.userId,
      actorRole: actor.role,
      actorName: actor.name,
      pageType,
      entityId,
      role: 'user',
      body: prompt,
    });

    try {
      response = await this.generateGeminiResponse({ pageType, prompt, title, context });
    } catch {
      source = 'fallback';
      response = this.buildFallbackResponse({ actor, pageType, prompt, title, context });
    }

    await this.assistantMessageModel.create({
      actorId: actor.userId,
      actorRole: actor.role,
      actorName: actor.name,
      pageType,
      entityId,
      role: 'assistant',
      body: response,
      source,
    });

    const proposedActions = this.buildProposedActions({
      actor,
      pageType,
      prompt,
      entityId,
      context,
      response,
    });

    return {
      pageType,
      prompt,
      response,
      source,
      proposedActions,
      entityId,
      requestedBy: actor,
    };
  }

  private toMessageDto(record: {
    _id?: unknown;
    id?: string;
    pageType: AssistantPageType;
    entityId?: string;
    role: 'user' | 'assistant';
    body: string;
    source?: 'gemini' | 'fallback';
    createdAt: Date | string;
  }): AssistantMessageDto {
    return {
      id: String(record._id ?? record.id),
      pageType: record.pageType,
      entityId: record.entityId,
      role: record.role,
      body: record.body,
      source: record.source,
      createdAt:
        record.createdAt instanceof Date ? record.createdAt.toISOString() : String(record.createdAt),
    };
  }

  private async generateGeminiResponse(input: {
    pageType: AssistantPageType;
    prompt: string;
    title?: string;
    context: Record<string, unknown>;
  }) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    const model = this.configService.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash';

    if (!apiKey) {
      throw new AppBadRequestException(
        'MISSING_GEMINI_API_KEY',
        'GEMINI_API_KEY is not configured on the backend.',
      );
    }

    const contextJson = JSON.stringify(input.context, null, 2);
    const response = await Promise.race([
      fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: [
                      'You are a concise, practical real-estate operations copilot inside Ledgera.',
                      `Current page type: ${input.pageType}`,
                      `Page title: ${input.title ?? 'Untitled context'}`,
                      `User prompt: ${input.prompt}`,
                      '',
                      'Context JSON:',
                      contextJson,
                      '',
                      'Instructions:',
                      '- Answer using only the provided page context.',
                      '- Be practical and operational, not academic.',
                      '- Prefer short sections or bullets when helpful.',
                      '- For agent workspace questions, structure the answer under these headings when relevant: Summary, Priorities, Risks, Recommended Actions.',
                      '- If the user asks for a message draft, write a polished ready-to-use draft.',
                      '- If there is not enough context, say what is missing briefly.',
                      '- Do not mention being an AI model.',
                    ].join('\n'),
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.6,
              topP: 0.9,
            },
          }),
        },
      ),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Gemini request timed out.'));
        }, 15000);
      }),
    ]);

    if (!response.ok) {
      const errorText = await response.text();
      throw new AppBadRequestException(
        'GEMINI_REQUEST_FAILED',
        `Gemini request failed: ${errorText}`,
      );
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('\n').trim();

    if (!text) {
      throw new AppBadRequestException(
        'GEMINI_EMPTY_RESPONSE',
        'Gemini returned an empty response.',
      );
    }

    return text;
  }

  private buildFallbackResponse(input: {
    actor: ActorContextDto;
    pageType: AssistantPageType;
    prompt: string;
    title?: string;
    context: Record<string, unknown>;
  }) {
    const heading = input.title ?? 'Current page';
    const role = input.actor.role;

    switch (input.pageType) {
      case 'agents': {
        const selectedAgent = input.context.selectedAgent as
          | {
              name?: string;
              isActive?: boolean;
              email?: string;
            }
          | undefined;
        const selectedListings = input.context.selectedListings as
          | Array<{ title?: string; status?: string }>
          | undefined;
        const selectedTransactions = input.context.selectedTransactions as
          | Array<{ propertyRef?: string; stage?: string }>
          | undefined;
        const totalVisibleAgents = input.context.totalVisibleAgents as number | undefined;
        const selectedMetrics = input.context.selectedMetrics as
          | {
              listingCount?: number;
              transactionCount?: number;
              linkedAccountCount?: number;
            }
          | undefined;
        const listingPreview =
          selectedListings?.slice(0, 2).map((item) => item.title).filter(Boolean).join(', ') ||
          'no linked listings';
        const transactionPreview =
          selectedTransactions?.slice(0, 2).map((item) => item.propertyRef).filter(Boolean).join(', ') ||
          'no linked transactions';
        const listingCount = selectedMetrics?.listingCount ?? 0;
        const transactionCount = selectedMetrics?.transactionCount ?? 0;
        const linkedAccountCount = selectedMetrics?.linkedAccountCount ?? 0;
        const summaryLine =
          listingCount === 0 && transactionCount === 0
            ? 'No active listings or transactions are visible for this agent profile yet.'
            : `This agent profile currently shows ${listingCount} listings and ${transactionCount} transactions.`;
        const prioritiesLine =
          role === 'admin'
            ? '1. Balance portfolio workload. 2. Clean up inactive or incomplete records. 3. Keep listing and transaction ownership clear.'
            : role === 'operations'
              ? '1. Check delay risk across open records. 2. Accelerate listing-to-transaction handoffs. 3. Prioritize deliveries that need follow-up.'
              : role === 'finance'
                ? '1. Spot records likely to convert into transactions early. 2. Track files with high commission impact. 3. Prioritize files moving toward financial close.'
                : '1. Keep active listings current. 2. Clarify the follow-up plan for open transactions. 3. Complete client callbacks during the day.';
        const risksLine =
          listingCount === 0 && transactionCount === 0
            ? 'There is no visible workload risk yet; the main risk is incomplete onboarding and missing records.'
            : !selectedAgent?.isActive
              ? 'Because the profile appears inactive, assignment and ownership may become unclear.'
              : 'If workload distribution and follow-up discipline slip, delays may appear across listings and transactions.';
        const actionsLine =
          listingCount === 0 && transactionCount === 0
            ? 'Start with basic onboarding, complete contact details, and define the first assignment plan for this agent.'
            : `Today, review ${listingPreview} first, then run a quick status check on ${transactionPreview}.`;

        return [
          `${selectedAgent?.name ?? heading} agent workspace review`,
          `Summary:\n${summaryLine}\nRecord status: ${selectedAgent?.isActive ? 'active' : 'inactive or unclear'}.\nContact: ${selectedAgent?.email ?? 'no email on file'}.\nVisible agents: ${totalVisibleAgents ?? 0}. Linked accounts: ${linkedAccountCount}.`,
          `Priorities:\n${prioritiesLine}`,
          `Risks:\n${risksLine}`,
          `Recommended Actions:\n${actionsLine}`,
          `Reference Records:\nListings: ${listingPreview}.\nTransactions: ${transactionPreview}.`,
          `Question:\n${input.prompt}`,
        ].join('\n\n');
      }
      case 'listing_detail': {
        const listing = input.context.listing as
          | {
              title?: string;
              city?: string;
              fullAddress?: string;
              status?: string;
              askingPrice?: number;
              currency?: string;
              listingAgent?: { name?: string };
            }
          | undefined;

        return [
          `Quick review for ${listing?.title ?? heading}:`,
          `This record is in ${listing?.city ?? 'an unknown location'} and currently appears as ${listing?.status ?? 'active'}.`,
          role === 'agent'
            ? `The most practical next step today is to prepare a short client follow-up on behalf of ${listing?.listingAgent?.name ?? 'the assigned agent'}, using the address and price details clearly.`
            : `The most practical next step today is to confirm record ownership, tighten the follow-up plan, and make sure the address and price fields are operationally complete.`,
          `Saved address: ${listing?.fullAddress ?? 'address information is missing'}.`,
          `Question: ${input.prompt}`,
        ].join('\n\n');
      }
      case 'transaction_detail': {
        const transaction = input.context.transaction as
          | {
              propertyRef?: string;
              stage?: string;
              listingAgent?: { name?: string };
              sellingAgent?: { name?: string };
            }
          | undefined;

        return [
          `Quick transaction summary for ${transaction?.propertyRef ?? heading}:`,
          `Current stage: ${transaction?.stage ?? 'unknown'}.`,
          role === 'finance'
            ? 'From the finance side, the next check should confirm that the amount, commission, and lock conditions are clear before closing.'
            : 'The next logical step is to confirm the document or approval needed for the next stage and align the follow-up plan across the parties involved.',
          `Question: ${input.prompt}`,
        ].join('\n\n');
      }
      case 'listings': {
        const total = input.context.totalVisibleListings as number | undefined;
        const visibleListings = input.context.visibleListings as Array<{ title?: string; status?: string }> | undefined;
        const underOfferCount = visibleListings?.filter((item) => item.status === 'under_offer').length ?? 0;
        return [
          'Quick summary for the listings workspace:',
          `Visible listings right now: ${total ?? 0}. Under-offer listings: ${underOfferCount}.`,
          role === 'agent'
            ? 'The best move today is to prioritize listings waiting for a response or action and turn them into a short follow-up list.'
            : role === 'finance'
              ? 'For finance, the priority should be tracking listings that are likely to convert into transactions and records waiting for status changes.'
              : 'Operationally, the most sensible focus is to prioritize under-offer listings, records nearing closure, or items still waiting for movement.',
          `Question: ${input.prompt}`,
        ].join('\n\n');
      }
      default:
        {
          const dashboardSummary = input.context.summary as
            | {
                totals?: {
                  transactions?: number;
                  completedTransactions?: number;
                };
              }
            | undefined;
          const transactionsCount = dashboardSummary?.totals?.transactions ?? 0;
          const completedCount = dashboardSummary?.totals?.completedTransactions ?? 0;

        return [
          `Quick dashboard readout for ${heading}:`,
          `Total transactions: ${transactionsCount}. Completed transactions: ${completedCount}.`,
          role === 'admin'
            ? 'For admin, the best focus today is on stalled transactions, records with unclear ownership, and decisions that need fast team alignment.'
            : role === 'operations'
              ? 'For operations, the best focus today is on transactions slowing down in stage progression and listing/transaction records that need immediate follow-up.'
              : role === 'finance'
                ? 'For finance, the best focus today is on transactions nearing close, records with high commission impact, and changes that matter for reporting.'
                : 'For an agent, the best focus today is on listings waiting for action and transactions that still need client follow-up.',
          `Question: ${input.prompt}`,
        ].join('\n\n');
        }
    }
  }

  private buildProposedActions(input: {
    actor: ActorContextDto;
    pageType: AssistantPageType;
    prompt: string;
    entityId?: string;
    context: Record<string, unknown>;
    response: string;
  }): AssistantProposedActionDto[] {
    switch (input.pageType) {
      case 'listing_detail':
        return this.buildListingActions(input);
      case 'transaction_detail':
        return this.buildTransactionActions(input);
      default:
        return [];
    }
  }

  private buildListingActions(input: {
    actor: ActorContextDto;
    prompt: string;
    entityId?: string;
    context: Record<string, unknown>;
    response: string;
  }): AssistantProposedActionDto[] {
    const listing = input.context.listing as
      | {
          id?: string;
          title?: string;
          status?: 'active' | 'under_offer' | 'closed';
          listingAgent?: { name?: string };
        }
      | undefined;

    const entityId = input.entityId ?? listing?.id;

    if (!entityId) {
      return [];
    }

    const title = listing?.title ?? 'this listing';
    const assigneeName = listing?.listingAgent?.name || input.actor.name;
    const noteBody = this.buildActionNoteBody(input.response, title);
    const actions: AssistantProposedActionDto[] = [
      {
        id: `note-${entityId}`,
        kind: 'create_note',
        entityType: 'listing',
        entityId,
        label: 'Save guidance as note',
        description: `Store the assistant summary on ${title} for the team.`,
        body: noteBody,
      },
      {
        id: `task-${entityId}`,
        kind: 'create_task',
        entityType: 'listing',
        entityId,
        label: 'Create follow-up task',
        description: `Create a next-step task for ${title}.`,
        title: this.buildTaskTitle(input.prompt, `Follow up on ${title}`),
        dueDate: this.buildDueDate(1),
        assigneeName,
      },
    ];

    const suggestedStatus = this.inferListingStatus(listing?.status, input.prompt, input.response);

    if (suggestedStatus && suggestedStatus !== listing?.status) {
      actions.push({
        id: `status-${entityId}-${suggestedStatus}`,
        kind: 'update_listing_status',
        entityType: 'listing',
        entityId,
        label: `Update status to ${suggestedStatus.replaceAll('_', ' ')}`,
        description: `Apply the suggested status change for ${title}.`,
        status: suggestedStatus,
      });
    }

    return actions;
  }

  private buildTransactionActions(input: {
    actor: ActorContextDto;
    prompt: string;
    entityId?: string;
    context: Record<string, unknown>;
    response: string;
  }): AssistantProposedActionDto[] {
    const transaction = input.context.transaction as
      | {
          id?: string;
          propertyRef?: string;
          stage?: string;
          listingAgent?: { name?: string };
          sellingAgent?: { name?: string };
        }
      | undefined;

    const entityId = input.entityId ?? transaction?.id;

    if (!entityId) {
      return [];
    }

    const propertyRef = transaction?.propertyRef ?? 'this transaction';
    const assigneeName =
      transaction?.sellingAgent?.name || transaction?.listingAgent?.name || input.actor.name;

    return [
      {
        id: `note-${entityId}`,
        kind: 'create_note',
        entityType: 'transaction',
        entityId,
        label: 'Save transaction note',
        description: `Store the latest assistant guidance on ${propertyRef}.`,
        body: this.buildActionNoteBody(input.response, propertyRef),
      },
      {
        id: `task-${entityId}`,
        kind: 'create_task',
        entityType: 'transaction',
        entityId,
        label: 'Create transaction task',
        description: `Create a follow-up task for ${propertyRef}.`,
        title: this.buildTaskTitle(input.prompt, `Progress ${propertyRef}`),
        dueDate: this.buildDueDate(1),
        assigneeName,
      },
    ];
  }

  private buildActionNoteBody(response: string, label: string) {
    const compact = response.replace(/\s+/g, ' ').trim();
    const sliced = compact.length > 280 ? `${compact.slice(0, 277)}...` : compact;
    return `AI guidance for ${label}: ${sliced}`;
  }

  private buildTaskTitle(prompt: string, fallback: string) {
    const cleaned = prompt.replace(/\s+/g, ' ').trim();

    if (!cleaned) {
      return fallback;
    }

    const sentence = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    return sentence.length > 90 ? `${sentence.slice(0, 87)}...` : sentence;
  }

  private buildDueDate(daysFromNow: number) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + daysFromNow);
    return dueDate.toISOString().slice(0, 10);
  }

  private inferListingStatus(
    currentStatus: 'active' | 'under_offer' | 'closed' | undefined,
    prompt: string,
    response: string,
  ) {
    const combined = `${prompt} ${response}`.toLowerCase();

    if (currentStatus !== 'closed' && /\b(close|closed|completion|complete)\b/.test(combined)) {
      return 'closed' as const;
    }

    if (currentStatus === 'active' && /\b(offer|under offer|under_offer)\b/.test(combined)) {
      return 'under_offer' as const;
    }

    return undefined;
  }
}
