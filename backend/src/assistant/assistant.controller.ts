import { Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { UserRole } from '../transactions/dto/transaction.dto';
import { buildAuthorizedActorContext } from '../transactions/auth/transaction-authorization';
import { AssistantService } from './assistant.service';
import { AssistantHistoryQueryDto, AssistantRequestDto } from './dto/assistant.dto';

@ApiTags('Assistant')
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
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @ApiOperation({ summary: 'List persisted assistant messages for the current page context.' })
  @Get('history')
  history(
    @Query() query: AssistantHistoryQueryDto,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-name') name?: string,
    @Headers('x-user-role') role?: UserRole,
  ) {
    return this.assistantService.listHistory(buildAuthorizedActorContext(userId, name, role), query);
  }

  @ApiOperation({ summary: 'Generate context-aware assistant guidance for the current page.' })
  @Post('chat')
  chat(
    @Body() payload: AssistantRequestDto,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-name') name?: string,
    @Headers('x-user-role') role?: UserRole,
  ) {
    return this.assistantService.chat({
      actor: buildAuthorizedActorContext(userId, name, role),
      pageType: payload.pageType,
      prompt: payload.prompt.trim(),
      title: payload.title?.trim(),
      entityId: payload.entityId?.trim(),
      context: payload.context,
    });
  }
}
