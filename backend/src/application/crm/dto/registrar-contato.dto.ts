import { IsString, IsOptional, IsBoolean, IsDateString } from 'class-validator';

export class RegistrarContatoDto {
  @IsString()
  canalUtilizado: string;

  @IsString()
  resultado: string;

  @IsOptional()
  @IsString()
  detalhes?: string;

  @IsOptional()
  @IsBoolean()
  agendarRetorno?: boolean;

  @IsOptional()
  @IsDateString()
  dataRetorno?: string;
}
