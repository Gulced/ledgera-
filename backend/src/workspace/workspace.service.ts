import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Model } from 'mongoose';
import { AppBadRequestException, AppNotFoundException } from '../common/errors/app-error';
import { ListingsService } from '../listings/listings.service';
import type { ActorContextDto } from '../transactions/dto/transaction.dto';
import { TransactionsService } from '../transactions/transactions.service';
import type {
  CreateWorkspaceDocumentDto,
  CreateWorkspaceNoteDto,
  CreateWorkspaceTaskDto,
  WorkspaceDocumentDto,
  WorkspaceEntityType,
  WorkspaceEventDto,
  WorkspaceListQueryDto,
  WorkspaceNoteDto,
  WorkspaceTaskDto,
} from './dto/workspace.dto';
import {
  WorkspaceDocumentRecord,
  type WorkspaceDocumentDocument,
  WorkspaceEventRecord,
  type WorkspaceEventDocument,
  WorkspaceNoteRecord,
  type WorkspaceNoteDocument,
  WorkspaceTaskRecord,
  type WorkspaceTaskDocument,
} from './schemas/workspace.schema';

@Injectable()
export class WorkspaceService {
  constructor(
    @InjectModel(WorkspaceNoteRecord.name)
    private readonly noteModel: Model<WorkspaceNoteDocument>,
    @InjectModel(WorkspaceTaskRecord.name)
    private readonly taskModel: Model<WorkspaceTaskDocument>,
    @InjectModel(WorkspaceDocumentRecord.name)
    private readonly documentModel: Model<WorkspaceDocumentDocument>,
    @InjectModel(WorkspaceEventRecord.name)
    private readonly eventModel: Model<WorkspaceEventDocument>,
    private readonly listingsService: ListingsService,
    private readonly transactionsService: TransactionsService,
  ) {}

  async listNotes(actor: ActorContextDto, query: WorkspaceListQueryDto = {}) {
    const notes = await this.noteModel.find().sort({ createdAt: -1 }).lean<WorkspaceNoteDto[]>().exec();
    return this.filterAccessibleRecords(actor, this.applyEntityFilter(notes, query));
  }

  async createNote(actor: ActorContextDto, payload: CreateWorkspaceNoteDto) {
    await this.assertEntityAccess(actor, payload.entityType, payload.entityId);
    const note: WorkspaceNoteDto = {
      id: `note_${randomUUID().slice(0, 8)}`,
      entityType: payload.entityType,
      entityId: payload.entityId,
      body: payload.body.trim(),
      authorName: actor.name ?? 'System',
      authorRole: actor.role,
      createdAt: new Date().toISOString(),
    };

    const created = await this.noteModel.create(note);
    await this.recordEvent({
      title: 'New note added',
      description: note.body,
      actorName: note.authorName,
      entityType: note.entityType,
      entityId: note.entityId,
    });

    return this.toPlain(created);
  }

  async listTasks(actor: ActorContextDto, query: WorkspaceListQueryDto = {}) {
    const tasks = await this.taskModel.find().sort({ dueDate: 1, createdAt: -1 }).lean<WorkspaceTaskDto[]>().exec();
    return this.filterAccessibleRecords(actor, this.applyEntityFilter(tasks, query));
  }

  async createTask(actor: ActorContextDto, payload: CreateWorkspaceTaskDto) {
    await this.assertEntityAccess(actor, payload.entityType, payload.entityId);
    const task: WorkspaceTaskDto = {
      id: `task_${randomUUID().slice(0, 8)}`,
      entityType: payload.entityType,
      entityId: payload.entityId,
      title: payload.title.trim(),
      dueDate: payload.dueDate,
      status: 'open',
      assigneeName: payload.assigneeName?.trim() || actor.name || 'Unassigned',
      createdAt: new Date().toISOString(),
    };

    const created = await this.taskModel.create(task);
    await this.recordEvent({
      title: 'Follow-up scheduled',
      description: `${task.title} • due ${task.dueDate}`,
      actorName: actor.name ?? 'System',
      entityType: task.entityType,
      entityId: task.entityId,
    });

    return this.toPlain(created);
  }

  async updateTaskStatus(
    actor: ActorContextDto,
    id: string,
    status: WorkspaceTaskDto['status'],
  ) {
    const existing = await this.taskModel.findOne({ id }).lean<WorkspaceTaskDto | null>().exec();

    if (!existing) {
      throw new AppNotFoundException('WORKSPACE_RECORD_NOT_FOUND', `Workspace task ${id} not found.`);
    }

    await this.assertEntityAccess(actor, existing.entityType, existing.entityId);

    if (existing.status === status) {
      return existing;
    }

    const updated = await this.taskModel
      .findOneAndUpdate({ id }, { ...existing, status }, { new: true, upsert: false })
      .lean<WorkspaceTaskDto | null>()
      .exec();

    if (!updated) {
      throw new AppNotFoundException('WORKSPACE_RECORD_NOT_FOUND', `Workspace task ${id} not found.`);
    }

    await this.recordEvent({
      title: 'Follow-up status updated',
      description: `${updated.title} • ${status}`,
      actorName: actor.name ?? 'System',
      entityType: updated.entityType,
      entityId: updated.entityId,
    });

    return updated;
  }

  async listDocuments(actor: ActorContextDto, query: WorkspaceListQueryDto = {}) {
    const documents = await this.documentModel.find().sort({ createdAt: -1 }).lean<WorkspaceDocumentDto[]>().exec();
    return this.filterAccessibleRecords(actor, this.applyEntityFilter(documents, query));
  }

  async createDocument(actor: ActorContextDto, payload: CreateWorkspaceDocumentDto) {
    await this.assertEntityAccess(actor, payload.entityType, payload.entityId);
    const document: WorkspaceDocumentDto = {
      id: `doc_${randomUUID().slice(0, 8)}`,
      entityType: payload.entityType,
      entityId: payload.entityId,
      name: payload.name.trim(),
      type: payload.type,
      status: payload.status,
      createdAt: new Date().toISOString(),
    };

    const created = await this.documentModel.create(document);
    await this.recordEvent({
      title: 'Document placeholder added',
      description: `${document.name} • ${document.status}`,
      actorName: actor.name ?? 'System',
      entityType: document.entityType,
      entityId: document.entityId,
    });

    return this.toPlain(created);
  }

  async updateDocumentStatus(
    actor: ActorContextDto,
    id: string,
    status: WorkspaceDocumentDto['status'],
  ) {
    const existing = await this.documentModel
      .findOne({ id })
      .lean<WorkspaceDocumentDto | null>()
      .exec();

    if (!existing) {
      throw new AppNotFoundException('WORKSPACE_RECORD_NOT_FOUND', `Workspace document ${id} not found.`);
    }

    await this.assertEntityAccess(actor, existing.entityType, existing.entityId);

    if (existing.status === status) {
      return existing;
    }

    const updated = await this.documentModel
      .findOneAndUpdate({ id }, { ...existing, status }, { new: true, upsert: false })
      .lean<WorkspaceDocumentDto | null>()
      .exec();

    if (!updated) {
      throw new AppNotFoundException('WORKSPACE_RECORD_NOT_FOUND', `Workspace document ${id} not found.`);
    }

    await this.recordEvent({
      title: 'Document status updated',
      description: `${updated.name} • ${status}`,
      actorName: actor.name ?? 'System',
      entityType: updated.entityType,
      entityId: updated.entityId,
    });

    return updated;
  }

  async listEvents(actor: ActorContextDto, query: WorkspaceListQueryDto = {}) {
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 50) : 20;
    const events = await this.eventModel.find().sort({ createdAt: -1 }).limit(limit * 3).lean<WorkspaceEventDto[]>().exec();
    const visible = await this.filterAccessibleRecords(actor, this.applyEntityFilter(events, query));
    return visible.slice(0, limit);
  }

  private async recordEvent(input: {
    title: string;
    description: string;
    actorName: string;
    entityType?: WorkspaceEntityType;
    entityId?: string;
  }) {
    await this.eventModel.create({
      id: `evt_${randomUUID().slice(0, 8)}`,
      title: input.title,
      description: input.description,
      actorName: input.actorName,
      entityType: input.entityType,
      entityId: input.entityId,
      createdAt: new Date().toISOString(),
    } satisfies WorkspaceEventDto);
  }

  private async assertEntityAccess(
    actor: ActorContextDto,
    entityType: WorkspaceEntityType,
    entityId: string,
  ) {
    if (!entityId.trim()) {
      throw new AppBadRequestException('INVALID_WORKSPACE_PAYLOAD', 'entityId is required.');
    }

    if (entityType === 'listing') {
      await this.listingsService.findById(entityId, actor);
      return;
    }

    await this.transactionsService.findById(entityId, actor);
  }

  private applyEntityFilter<T extends { entityType?: WorkspaceEntityType; entityId?: string }>(
    items: T[],
    query: WorkspaceListQueryDto,
  ) {
    return items.filter((item) =>
      (query.entityType ? item.entityType === query.entityType : true) &&
      (query.entityId ? item.entityId === query.entityId : true),
    );
  }

  private async filterAccessibleRecords<
    T extends { entityType?: WorkspaceEntityType; entityId?: string },
  >(actor: ActorContextDto, items: T[]) {
    const cache = new Map<string, boolean>();

    await Promise.all(
      items.map(async (item) => {
        if (!item.entityType || !item.entityId) {
          cache.set(`${item.entityType}:${item.entityId}`, true);
          return;
        }

        const key = `${item.entityType}:${item.entityId}`;
        if (cache.has(key)) {
          return;
        }

        try {
          await this.assertEntityAccess(actor, item.entityType, item.entityId);
          cache.set(key, true);
        } catch {
          cache.set(key, false);
        }
      }),
    );

    return items.filter((item) => {
      if (!item.entityType || !item.entityId) {
        return true;
      }

      return cache.get(`${item.entityType}:${item.entityId}`) ?? false;
    });
  }

  private toPlain<T extends { toObject?: (options?: Record<string, unknown>) => T }>(
    record: T,
  ) {
    if (typeof record.toObject === 'function') {
      return record.toObject({ versionKey: false });
    }

    return record;
  }
}
