import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import mercadolivreConfig from './infrastructure/config/mercadolivre.config';

@Module({
  imports: [
    ConfigModule.forRoot({
        isGlobal: true,
        load: [mercadolivreConfig, ],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
