import { IsOptional } from 'class-validator';

export class GetEventsDto {
  @IsOptional()
  limit: number = 100;

  @IsOptional()
  skip: number = 0;
}
