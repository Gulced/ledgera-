import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export type UserRole = 'admin' | 'operations' | 'finance' | 'agent';

export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  linkedAgentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserAccountDto extends UserDto {
  password: string;
}

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsIn(['admin', 'operations', 'finance', 'agent'])
  role: UserRole;

  @IsOptional()
  @IsString()
  linkedAgentId?: string;
}

export class LoginUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  @IsIn(['admin', 'operations', 'finance', 'agent'])
  role?: UserRole;
}
