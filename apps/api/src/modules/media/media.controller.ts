import { Controller, Get, Post, Body, Query, Res, HttpStatus, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('fix-video')
  async fixVideo(@Body() body: { videoBase64: string }) {
    if (!body?.videoBase64) {
      throw new BadRequestException('videoBase64 es requerido');
    }
    return this.mediaService.fixVideo(body.videoBase64);
  }

  @Get('tts')
  async getTTS(
    @Query('text') text: string,
    @Query('lang') lang: string,
    @Res() res: Response
  ) {
    if (!text) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Texto requerido' });
    }

    try {
      const audioBuffer = await this.mediaService.getTTSAudio(text, lang || 'es');
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      });
      return res.end(audioBuffer);
    } catch (err: any) {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: err.message });
    }
  }

  @Get('proxy')
  async proxyImage(@Query('url') url: string, @Res() res: Response) {
    if (!url) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: 'URL requerida' });
    }

    try {
      const { buffer, contentType } = await this.mediaService.proxyImage(url);
      res.set({
        'Content-Type': contentType,
        'Content-Length': buffer.length,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      });
      return res.end(buffer);
    } catch (err: any) {
      return res.status(HttpStatus.BAD_GATEWAY).json({ message: err.message });
    }
  }

  @Get('search-images')
  async searchImages(@Query('q') query: string) {
    return this.mediaService.searchImages(query || '');
  }

  @Get('news-images')
  async getNewsImages(
    @Query('url') url: string,
    @Query('title') title: string,
    @Query('imageUrl') imageUrl: string
  ) {
    return this.mediaService.getNewsImages({ url, title, imageUrl });
  }
}
