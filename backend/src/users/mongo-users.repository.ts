import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import type { UserAccountDto } from './dto/user.dto';
import { UsersRepository } from './users.repository';
import { UserRecord, type UserDocument } from './schemas/user.schema';

@Injectable()
export class MongoUsersRepository implements UsersRepository {
  constructor(
    @InjectModel(UserRecord.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async findAll(): Promise<UserAccountDto[]> {
    const documents = await this.userModel
      .find()
      .sort({ createdAt: 1 })
      .lean<UserAccountDto[]>()
      .exec();

    return documents.map((document) => this.stripMongoFields(document));
  }

  async findByEmail(email: string): Promise<UserAccountDto | null> {
    const document = await this.userModel
      .findOne({ email: email.trim().toLowerCase() })
      .lean<UserAccountDto | null>()
      .exec();

    return document ? this.stripMongoFields(document) : null;
  }

  async create(user: UserAccountDto): Promise<UserAccountDto> {
    const created = await this.userModel.create(user);

    return this.stripMongoFields(
      created.toObject<UserAccountDto>({
        versionKey: false,
      }),
    );
  }

  private stripMongoFields(document: UserAccountDto & { _id?: unknown }) {
    const { _id, ...user } = document;

    return user;
  }
}
