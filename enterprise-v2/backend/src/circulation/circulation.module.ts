import { Module } from '@nestjs/common';
import { CirculationService } from './circulation.service';
import { CirculationController } from './circulation.controller';

@Module({
  providers: [CirculationService],
  controllers: [CirculationController]
})
export class CirculationModule {}
