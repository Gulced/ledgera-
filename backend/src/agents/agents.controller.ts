import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { UserRole } from '../transactions/dto/transaction.dto';
import { buildAuthorizedActorContext } from '../transactions/auth/transaction-authorization';
import { CreateAgentDto, UpdateAgentDto } from './dto/agent.dto';
import { AgentsService } from './agents.service';

@ApiTags('Agents')
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
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @ApiOperation({ summary: 'List agents with role-aware visibility.' })
  @Get()
  findAll(
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-name') name?: string,
    @Headers('x-user-role') role?: UserRole,
  ) {
    return this.agentsService.findAll(
      buildAuthorizedActorContext(userId, name, role),
    );
  }

  @ApiOperation({ summary: 'Get one agent by id.' })
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-name') name?: string,
    @Headers('x-user-role') role?: UserRole,
  ) {
    return this.agentsService.findById(
      id,
      buildAuthorizedActorContext(userId, name, role),
    );
  }

  @ApiOperation({ summary: 'Create a new agent. Only admins can create agents.' })
  @Post()
  create(
    @Body() payload: CreateAgentDto,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-name') name?: string,
    @Headers('x-user-role') role?: UserRole,
  ) {
    return this.agentsService.create(
      payload,
      buildAuthorizedActorContext(userId, name, role),
    );
  }

  @ApiOperation({ summary: 'Update agent profile fields.' })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() payload: UpdateAgentDto,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-name') name?: string,
    @Headers('x-user-role') role?: UserRole,
  ) {
    return this.agentsService.update(
      id,
      payload,
      buildAuthorizedActorContext(userId, name, role),
    );
  }

  @ApiOperation({ summary: 'Delete an agent profile.' })
  @HttpCode(204)
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-name') name?: string,
    @Headers('x-user-role') role?: UserRole,
  ) {
    await this.agentsService.delete(
      id,
      buildAuthorizedActorContext(userId, name, role),
    );
  }
}
