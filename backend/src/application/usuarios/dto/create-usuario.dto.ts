import { IsString, IsEmail, IsNotEmpty, IsOptional, IsEnum, Matches } from 'class-validator';
import { Role } from '../../../domain/enums';;

export class CreateUsuarioDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  senha?: string;

  @IsEnum(Role)
  @IsOptional()
  perfil?: Role;

  @IsString()
  @IsOptional()
  status?: string;
}
