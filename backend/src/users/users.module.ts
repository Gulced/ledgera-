import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AgentsModule } from '../agents/agents.module';
import { MongoUsersRepository } from './mongo-users.repository';
import { UserRecord, UserSchema } from './schemas/user.schema';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [
    AgentsModule,
    MongooseModule.forFeature([
      {
        name: UserRecord.name,
        schema: UserSchema,
      },
    ]),
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: UsersRepository,
      useClass: MongoUsersRepository,
    },
  ],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
