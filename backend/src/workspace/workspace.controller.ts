import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { buildAuthorizedActorContext } from '../transactions/auth/transaction-authorization';
import type { UserRole } from '../transactions/dto/transaction.dto';
import {
  CreateWorkspaceDocumentDto,
  CreateWorkspaceNoteDto,
  CreateWorkspaceTaskDto,
  UpdateWorkspaceDocumentStatusDto,
  UpdateWorkspaceTaskStatusDto,
  WorkspaceListQueryDto,
} from './dto/workspace.dto';
import { WorkspaceService } from './workspace.service';

@ApiTags('Workspace')
@ApiHeader({
  name: 'x-user-id',
  required: true,
  description: 'Authenticated actor identifier used by the role/ownership layer.',
})
@ApiHeader({
  name: 'x-user-name',
  required: false,
  description: 'Optional display name used for audit visibility.',
})
@ApiHeader({
  name: 'x-user-role',
  required: true,
  description: 'Actor role. Allowed values: admin, operations, finance, agent.',
})
@Controller('workspace')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @ApiOperation({ summary: 'List workspace notes.' })
  @Get('notes')
  listNotes(
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-name') name?: string,
    @Headers('x-user-role') role?: UserRole,
    @Query() query: WorkspaceListQueryDto = {},
  ) {
    return this.workspaceService.listNotes(
      buildAuthorizedActorContext(userId, name, role),
      query,
    );
  }

  @ApiOperation({ summary: 'Create a workspace note.' })
  @Post('notes')
  createNote(
    @Body() payload: CreateWorkspaceNoteDto,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-name') name?: string,
    @Headers('x-user-role') role?: UserRole,
  ) {
    return this.workspaceService.createNote(
      buildAuthorizedActorContext(userId, name, role),
      payload,
    );
  }

  @ApiOperation({ summary: 'List workspace tasks.' })
  @Get('tasks')
  listTasks(
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-name') name?: string,
    @Headers('x-user-role') role?: UserRole,
    @Query() query: WorkspaceListQueryDto = {},
  ) {
    return this.workspaceService.listTasks(
      buildAuthorizedActorContext(userId, name, role),
      query,
    );
  }

  @ApiOperation({ summary: 'Create a workspace task.' })
  @Post('tasks')
  createTask(
    @Body() payload: CreateWorkspaceTaskDto,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-name') name?: string,
    @Headers('x-user-role') role?: UserRole,
  ) {
    return this.workspaceService.createTask(
      buildAuthorizedActorContext(userId, name, role),
      payload,
    );
  }

  @ApiOperation({ summary: 'Update task status.' })
  @Patch('tasks/:id/status')
  updateTaskStatus(
    @Param('id') id: string,
    @Body() payload: UpdateWorkspaceTaskStatusDto,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-name') name?: string,
    @Headers('x-user-role') role?: UserRole,
  ) {
    return this.workspaceService.updateTaskStatus(
      buildAuthorizedActorContext(userId, name, role),
      id,
      payload.status,
    );
  }

  @ApiOperation({ summary: 'List workspace documents.' })
  @Get('documents')
  listDocuments(
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-name') name?: string,
    @Headers('x-user-role') role?: UserRole,
    @Query() query: WorkspaceListQueryDto = {},
  ) {
    return this.workspaceService.listDocuments(
      buildAuthorizedActorContext(userId, name, role),
      query,
    );
  }

  @ApiOperation({ summary: 'Create a workspace document placeholder.' })
  @Post('documents')
  createDocument(
    @Body() payload: CreateWorkspaceDocumentDto,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-name') name?: string,
    @Headers('x-user-role') role?: UserRole,
  ) {
    return this.workspaceService.createDocument(
      buildAuthorizedActorContext(userId, name, role),
      payload,
    );
  }

  @ApiOperation({ summary: 'Update document status.' })
  @Patch('documents/:id/status')
  updateDocumentStatus(
    @Param('id') id: string,
    @Body() payload: UpdateWorkspaceDocumentStatusDto,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-name') name?: string,
    @Headers('x-user-role') role?: UserRole,
  ) {
    return this.workspaceService.updateDocumentStatus(
      buildAuthorizedActorContext(userId, name, role),
      id,
      payload.status,
    );
  }

  @ApiOperation({ summary: 'List recent workspace events.' })
  @Get('events')
  listEvents(
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-name') name?: string,
    @Headers('x-user-role') role?: UserRole,
    @Query() query: WorkspaceListQueryDto = {},
  ) {
    return this.workspaceService.listEvents(
      buildAuthorizedActorContext(userId, name, role),
      query,
    );
  }
}
