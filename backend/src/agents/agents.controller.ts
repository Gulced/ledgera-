import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateAgentDto } from './dto/agent.dto';
import { AgentsService } from './agents.service';

@ApiTags('Agents')
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @ApiOperation({ summary: 'List agents.' })
  @Get()
  findAll() {
    return this.agentsService.findAll();
  }

  @ApiOperation({ summary: 'Get one agent by id.' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.agentsService.findById(id);
  }

  @ApiOperation({ summary: 'Create a new agent.' })
  @Post()
  create(@Body() payload: CreateAgentDto) {
    return this.agentsService.create(payload);
  }
}
