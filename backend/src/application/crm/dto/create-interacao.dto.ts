import { IsString, IsOptional, IsDateString, IsUUID } from 'class-validator';

export class CreateInteracaoDto {
  @IsUUID()
  clienteId: string;

  @IsOptional()
  @IsUUID()
  veiculoId?: string;

  @IsOptional()
  @IsUUID()
  ordemServicoId?: string;

  @IsOptional()
  @IsUUID()
  orcamentoId?: string;

  @IsString()
  tipo: string;

  @IsOptional()
  @IsString()
  motivo?: string;

  @IsString()
  canal: string;

  @IsOptional()
  @IsString()
  prioridade?: string;

  @IsString()
  assunto: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsString()
  mensagemSugerida?: string;

  @IsOptional()
  @IsDateString()
  dataPrevista?: string;

  @IsOptional()
  @IsUUID()
  responsavelId?: string;
}
