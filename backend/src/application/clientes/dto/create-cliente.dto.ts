export class CreateClienteDto {
  nome: string;
  cpf_cnpj: string;
  telefone?: string;
  email?: string;
  cep?: string;
  bairro?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  cidade?: string;
  estado?: string;
}