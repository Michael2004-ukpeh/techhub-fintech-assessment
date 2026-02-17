import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { config } from './data-source';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => config,
    }),
  ],
})
export class DatabaseModule {}
