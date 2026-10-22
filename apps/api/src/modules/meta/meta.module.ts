import { Module } from '@nestjs/common';
import { MetaService } from './meta.service';
import { MetaController, PagesController } from './meta.controller';

@Module({
  controllers: [MetaController, PagesController],
  providers: [MetaService],
  exports: [MetaService],
})
export class MetaModule {}
