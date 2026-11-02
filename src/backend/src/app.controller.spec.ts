import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { Clock, FixedClock } from './stock/clock.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        // 23:30 UTC on 01/11 is already 02/11 in Vietnam.
        { provide: Clock, useValue: new FixedClock(new Date('2026-11-01T23:30:00Z')) },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('clock', () => {
    it('#255 gives the business date in Asia/Ho_Chi_Minh', () => {
      expect(appController.getClock()).toEqual({ today: '2026-11-02' });
    });
  });
});
