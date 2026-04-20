import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class HealthController {
  @ApiOperation({ summary: 'Simple health check endpoint.' })
  @Get()
  getHealth() {
    return {
      name: 'ledgera-backend',
      status: 'ok',
    };
  }
}
