import { Module } from '@nestjs/common';
import { NewsService } from './news.service';
import { NewsController, MediaController } from './news.controller';

@Module({
  controllers: [NewsController, MediaController],
  providers: [NewsService],
  exports: [NewsService],
})
export class NewsModule {}
