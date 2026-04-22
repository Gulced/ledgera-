import type { UserAccountDto } from './dto/user.dto';

export abstract class UsersRepository {
  abstract findAll(): Promise<UserAccountDto[]>;
  abstract findByEmail(email: string): Promise<UserAccountDto | null>;
  abstract create(user: UserAccountDto): Promise<UserAccountDto>;
  abstract update(email: string, user: UserAccountDto): Promise<UserAccountDto>;
}
