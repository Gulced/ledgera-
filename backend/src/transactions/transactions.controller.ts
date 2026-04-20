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
import {
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type {
  ActorContextDto,
  UserRole,
} from './dto/transaction.dto';
import {
  buildAuthorizedActorContext,
} from './auth/transaction-authorization';
import {
  CreateTransactionDto,
  TransactionListQueryDto,
  TransitionTransactionDto,
} from './dto/transaction.dto';
import { TransactionsService } from './transactions.service';

@ApiTags('Transactions')
@ApiHeader({
  name: 'x-user-id',
  required: true,
  description: 'Authenticated actor identifier used by the role/ownership layer.',
})
@ApiHeader({
  name: 'x-user-name',
  required: false,
  description: 'Optional display name used for audit trail visibility.',
})
@ApiHeader({
  name: 'x-user-role',
  required: true,
  description: 'Actor role. Allowed values: admin, operations, finance, agent.',
})
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @ApiOperation({ summary: 'List transactions with filters, pagination, and sorting.' })
  @Get()
  findAll(
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-name') name?: string,
    @Headers('x-user-role') role?: UserRole,
    @Query() query: TransactionListQueryDto = {},
  ) {
    return this.transactionsService.findAll(
      this.buildActorContext(userId, name, role),
      query,
    );
  }

  @ApiOperation({ summary: 'Return dashboard summary totals and stage distribution.' })
  @Get('summary')
  getSummary(
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-name') name?: string,
    @Headers('x-user-role') role?: UserRole,
    @Query() query: TransactionListQueryDto = {},
  ) {
    return this.transactionsService.getSummary(
      this.buildActorContext(userId, name, role),
      {
        stage: query.stage,
        currency: query.currency,
        agentId: query.agentId,
        search: query.search,
      },
    );
  }

  @ApiOperation({ summary: 'Return one transaction if the actor has access.' })
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-name') name?: string,
    @Headers('x-user-role') role?: UserRole,
  ) {
    return this.transactionsService.findById(
      id,
      this.buildActorContext(userId, name, role),
    );
  }

  @ApiOperation({ summary: 'Create a new transaction.' })
  @Post()
  create(
    @Body() payload: CreateTransactionDto,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-name') name?: string,
    @Headers('x-user-role') role?: UserRole,
  ) {
    return this.transactionsService.create(
      payload,
      this.buildActorContext(userId, name, role),
    );
  }

  @ApiOperation({ summary: 'Preview commission without persisting any data.' })
  @Post('preview-commission')
  previewCommission(
    @Body() payload: CreateTransactionDto,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-name') name?: string,
    @Headers('x-user-role') role?: UserRole,
  ) {
    return this.transactionsService.previewCommission(
      payload,
      this.buildActorContext(userId, name, role),
    );
  }

  @ApiOperation({ summary: 'Move a transaction to the next valid stage.' })
  @Patch(':id/stage')
  transitionStage(
    @Param('id') id: string,
    @Body() payload: TransitionTransactionDto,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-name') name?: string,
    @Headers('x-user-role') role?: UserRole,
  ) {
    return this.transactionsService.transitionStage(
      id,
      payload.stage,
      this.buildActorContext(userId, name, role),
    );
  }

  private buildActorContext(
    userId?: string,
    name?: string,
    role?: UserRole,
  ): ActorContextDto {
    return buildAuthorizedActorContext(userId, name, role);
  }
}
