import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateUserDto, LoginUserDto } from './dto/user.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'List user accounts.' })
  @Get('users')
  findAll() {
    return this.usersService.findAll();
  }

  @ApiOperation({ summary: 'Create a new user account.' })
  @Post('users')
  create(@Body() payload: CreateUserDto) {
    return this.usersService.create(payload);
  }

  @ApiOperation({ summary: 'Login with email and password.' })
  @Post('auth/login')
  login(@Body() payload: LoginUserDto) {
    return this.usersService.login(payload);
  }
}
