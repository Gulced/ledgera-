import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns the service status payload', () => {
    const controller = new HealthController();

    expect(controller.getHealth()).toEqual({
      name: 'ledgera-backend',
      status: 'ok',
    });
  });
});
