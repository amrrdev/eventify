import { Transform } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsOptional, IsString, IsISO8601, Min, Max } from 'class-validator';

const SEVERITIES = ['INFO', 'WARN', 'ERROR', 'SEVERITY_UNSPECIFIED'] as const;
export type Severity = (typeof SEVERITIES)[number];

export class GetEventsDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(200)
  limit: number = 50;

  @IsOptional()
  @IsString()
  eventName?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsIn(SEVERITIES)
  severity?: Severity;

  @IsOptional()
  @IsISO8601()
  fromDate?: string;

  @IsOptional()
  @IsISO8601()
  toDate?: string;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value.flatMap((v) => v.split(',')).filter(Boolean);
    if (typeof value === 'string') return value.split(',').filter(Boolean);
    return [];
  })
  tags?: string[];

  @IsOptional()
  @IsIn(['timestamp', 'createdAt', 'eventName', 'severity'])
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
