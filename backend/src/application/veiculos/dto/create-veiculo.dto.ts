import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateVeiculoDto {
  @IsString()
  @IsNotEmpty()
  placa: string;

  @IsString()
  @IsNotEmpty()
  marca: string;

  @IsString()
  @IsNotEmpty()
  modelo: string;

  // AQUI ESTÁ A MUDANÇA: Agora o ano é validado como String!
  @IsString()
  @IsNotEmpty()
  ano: string;

  @IsString()
  @IsOptional()
  cor?: string;

  @IsBoolean()
  @IsOptional()
  avarias_previas?: boolean;

  @IsString()
  @IsOptional()
  avarias_previas_desc?: string;

  @IsBoolean()
  @IsOptional()
  pertences_valor?: boolean;

  @IsString()
  @IsOptional()
  pertences_valor_desc?: string;

  @IsBoolean()
  @IsOptional()
  luzes_painel?: boolean;

  @IsString()
  @IsOptional()
  luzes_painel_desc?: string;

  @IsString()
  @IsNotEmpty()
  clienteId: string;

  @IsOptional()
  quilometragem?: number;
}