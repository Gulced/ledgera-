import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AssistantModule } from './assistant/assistant.module';
import { AgentsModule } from './agents/agents.module';
import { HealthController } from './health.controller';
import { ListingsModule } from './listings/listings.module';
import { TransactionsModule } from './transactions/transactions.module';
import { UsersModule } from './users/users.module';
import { WorkspaceModule } from './workspace/workspace.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri:
          configService.get<string>('MONGODB_URI') ??
          'mongodb://127.0.0.1:27017/ledgera',
        dbName: configService.get<string>('MONGODB_DB') ?? 'ledgera',
      }),
    }),
    AssistantModule,
    AgentsModule,
    ListingsModule,
    TransactionsModule,
    UsersModule,
    WorkspaceModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
