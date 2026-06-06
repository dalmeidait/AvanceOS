import { IsEmail, IsNotEmpty, IsString, IsOptional, Length } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  senha: string;

  @IsString()
  @IsOptional()
  @Length(6, 6)
  mfaCode?: string;
}
