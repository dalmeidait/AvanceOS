import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  senhaAtual: string;

  @IsString()
  @MinLength(8, { message: 'A nova senha deve ter pelo menos 8 caracteres.' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
    message: 'A nova senha deve conter letra maiuscula, letra minuscula, numero e caractere especial.',
  })
  novaSenha: string;

  @IsString()
  @IsNotEmpty()
  confirmarNovaSenha: string;
}
