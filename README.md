# AvanceOS

**AvanceOS** é uma plataforma de gestão operacional para oficinas automotivas, criada para modernizar o atendimento, a execução técnica, o controle financeiro, a gestão de estoque e a tomada de decisão dentro de uma oficina.

O projeto nasceu a partir da evolução do antigo **FleetCare**, mas foi reformulado para atender uma visão mais ampla, realista e profissional: não apenas controlar veículos ou serviços, mas estruturar uma operação completa de oficina com processos, rastreabilidade, governança, segurança e apoio de inteligência artificial.

---

## Por que o AvanceOS existe?

Muitas oficinas automotivas funcionam com processos fragmentados: anotações manuais, comunicação informal, ausência de histórico técnico, controle financeiro separado, estoque sem rastreabilidade e pouca previsibilidade sobre peças, serviços e produtividade.

Esse cenário gera problemas como:

- perda de informações importantes sobre clientes e veículos;
- dificuldade para acompanhar o status real de uma ordem de serviço;
- orçamentos pouco padronizados;
- diagnósticos sem histórico consolidado;
- controle frágil de estoque e compras;
- pouca visibilidade financeira;
- dependência excessiva de comunicação verbal;
- falta de indicadores para tomada de decisão;
- dificuldade de escalar a operação com qualidade.

O **AvanceOS** existe para transformar esse cenário em um ambiente digital, organizado e integrado.

A proposta é que a oficina deixe de operar apenas de forma reativa e passe a trabalhar com processos claros, dados centralizados e apoio tecnológico em todas as etapas do atendimento.

---

## Objetivo do projeto

O objetivo do AvanceOS é demonstrar, em ambiente controlado, como uma oficina pode ser reestruturada com apoio de tecnologia, integrando:

- cadastro de clientes;
- cadastro de veículos;
- abertura e gestão de ordens de serviço;
- registro de relatos iniciais;
- checklist técnico;
- diagnóstico;
- orçamento;
- aprovação;
- execução dos serviços;
- solicitação e controle de peças;
- anexos e documentos;
- pagamentos;
- caixa/PDV;
- relatórios operacionais e financeiros;
- apoio inteligente por IA através da OFYCIA;
- futura integração com dados automotivos simulados via OBD-II/TechHub.

---

## Conceito central

O AvanceOS não é apenas um sistema de cadastro.

Ele foi pensado como um **sistema operacional de oficina**, onde cada módulo representa uma parte importante do fluxo real de trabalho.

A ideia é que atendentes, mecânicos, financeiro e administradores trabalhem dentro de um mesmo ecossistema, com permissões, responsabilidades e rastreabilidade.

---

## Atores principais

### Cliente

O cliente é tratado como ator externo. Ele não necessariamente acessa o sistema, mas interage com a oficina por meio dos processos registrados no AvanceOS.

Principais interações:

- solicitar atendimento;
- informar sintomas ou relatos;
- aprovar orçamento;
- receber status do atendimento;
- receber comprovantes e documentos.

### Atendente

Responsável pelo relacionamento inicial com o cliente e pela organização administrativa da ordem de serviço.

Principais ações:

- cadastrar cliente;
- cadastrar veículo;
- abrir ordem de serviço;
- registrar relato inicial;
- consultar histórico;
- anexar documentos;
- criar orçamento;
- registrar aprovação;
- informar status ao cliente.

### Mecânico

Responsável pela execução técnica e pelo diagnóstico.

Principais ações:

- realizar checklist;
- registrar diagnóstico;
- executar serviço;
- solicitar peças;
- atualizar status da OS;
- finalizar execução técnica;
- consultar histórico técnico;
- apoiar diagnóstico com a OFYCIA.

### Financeiro

Responsável pelo caixa, pagamentos, comprovantes e relatórios financeiros.

Principais ações:

- abrir caixa;
- registrar pagamento;
- emitir comprovante;
- fechar caixa;
- consultar OS pendentes de pagamento;
- gerar relatório financeiro;
- registrar compra de estoque.

### Administrador

Responsável pela governança do sistema.

Principais ações:

- gerenciar usuários;
- definir perfis e permissões;
- consultar relatórios;
- acompanhar operação;
- configurar regras do ambiente.

---

## Módulos principais

### Gestão de Clientes

Permite cadastrar e consultar clientes, centralizando informações importantes para atendimento, histórico e relacionamento.

### Gestão de Veículos

Permite registrar veículos vinculados aos clientes, mantendo histórico técnico, atendimentos anteriores e dados relevantes para diagnóstico.

### Ordem de Serviço

É o núcleo operacional do sistema. A OS concentra o fluxo desde o relato inicial até o pagamento final.

Inclui:

- abertura da OS;
- dados do cliente;
- dados do veículo;
- sintomas relatados;
- checklist;
- diagnóstico;
- serviços;
- peças;
- orçamento;
- aprovação;
- execução;
- finalização;
- pagamento.

### Orçamentos

Permite estruturar propostas com serviços, peças, valores e aprovação formal.

### Estoque

Permite controlar produtos, peças, fornecedores, compras e movimentações internas.

### Caixa e PDV

Permite controlar pagamentos, abertura e fechamento de caixa, comprovantes e pendências financeiras.

### Relatórios e Análises

Fornece visão sobre faturamento, ordens de serviço, pagamentos, produtividade e operação.

### TechHub

Camada planejada para importação e análise de dados técnicos e arquivos de diagnóstico, incluindo simulações automotivas e integrações futuras.

### OFYCIA

A **OFYCIA** é a camada de inteligência assistiva do AvanceOS.

Ela foi idealizada para apoiar:

- interpretação de sintomas;
- apoio ao diagnóstico;
- geração de insights técnicos;
- análise de histórico;
- sugestões operacionais;
- relatórios;
- suporte ao atendimento;
- análise de dados do TechHub;
- apoio à tomada de decisão.

A OFYCIA não substitui o mecânico, o atendente ou o gestor. Ela atua como assistente inteligente para melhorar qualidade, velocidade e consistência das decisões.

---

## Arquitetura do sistema

O AvanceOS foi planejado com uma arquitetura moderna, híbrida e compatível com ambientes reais de pequenas e médias empresas.

### Backend

- Node.js
- NestJS
- Prisma ORM
- API REST
- Autenticação JWT
- Regras de acesso por perfil
- Integração com banco SQL Server

### Frontend

- React
- Vite
- TypeScript
- Tailwind CSS
- Interface web responsiva
- Layout operacional por módulos

### Banco de dados

- SQL Server 2022
- Execução em container Docker
- Persistência por volume
- Estrutura relacional para dados operacionais

### Infraestrutura

- Ubuntu Server
- Docker
- Docker Compose
- Ambiente on-premise
- Integração planejada com Windows Server e Active Directory

### Camada Microsoft

O projeto considera integração com tecnologias Microsoft, como:

- Windows Server
- AD DS
- DNS
- GPO
- Microsoft Entra ID
- Azure OpenAI
- Microsoft Foundry
- Power BI Desktop
- ambiente híbrido entre infraestrutura local e serviços de nuvem

---

## Visão de segurança

O AvanceOS considera segurança desde sua concepção, incluindo:

- autenticação;
- perfis de acesso;
- separação de responsabilidades;
- proteção de rotas;
- variáveis de ambiente;
- não exposição de segredos no repositório;
- rastreabilidade de ações;
- organização de permissões;
- possibilidade de integração futura com identidade corporativa.

O objetivo é aproximar o projeto de uma realidade empresarial, onde cada usuário deve acessar apenas aquilo que faz sentido para sua função.

---

## Perfis de acesso

O sistema considera diferentes perfis operacionais, como:

- Administrador;
- Atendente;
- Mecânico;
- Financeiro.

Cada perfil possui permissões específicas, evitando que funções sensíveis sejam executadas por usuários sem responsabilidade sobre aquela área.

---

## Fluxo operacional resumido

1. Cliente solicita atendimento.
2. Atendente cadastra cliente e veículo.
3. Atendente abre uma ordem de serviço.
4. Relato inicial é registrado.
5. Mecânico realiza checklist e diagnóstico.
6. Serviços e peças são adicionados.
7. Orçamento é criado.
8. Cliente aprova ou reprova o orçamento.
9. Execução técnica é realizada.
10. OS é finalizada tecnicamente.
11. Financeiro registra pagamento.
12. Comprovante/documento é emitido.
13. Dados ficam disponíveis para histórico e relatórios.

---

## Diferenciais do AvanceOS

- Projeto inspirado em necessidade real de oficina.
- Fluxo completo de atendimento.
- Separação entre papéis operacionais.
- Estrutura preparada para ambiente on-premise.
- Possibilidade de integração com ambiente Microsoft.
- Uso de Docker para padronização.
- Banco SQL Server.
- Planejamento para IA assistiva.
- Planejamento para integração com simuladores automotivos.
- Foco em rastreabilidade, organização e profissionalização.

---

## Status do projeto

O AvanceOS está em fase de evolução e consolidação.

Funcionalidades já trabalhadas incluem:

- autenticação;
- clientes;
- veículos;
- ordens de serviço;
- orçamento;
- estoque;
- fornecedores;
- compras;
- caixa/PDV;
- relatórios;
- documentos;
- interface operacional;
- estrutura para OFYCIA;
- estrutura para TechHub.

---

## Executando o projeto

> As instruções abaixo são uma base geral. Ajustes podem ser necessários conforme o ambiente.

### Pré-requisitos

- Docker
- Docker Compose
- Node.js
- Git
- SQL Server em container ou instância acessível

### Clonar o repositório

```bash
git clone h
ttps://github.com/dalmeidait/AvanceOS.git
cd AvanceOS

## Licença e propriedade intelectual

Este projeto é disponibilizado publicamente para fins de portfólio, documentação técnica,
avaliação acadêmica/profissional e demonstração de arquitetura.

O AvanceOS não é um software open source.

Todo o código-fonte, documentação, estrutura, conceitos, identidade, módulos e componentes
associados ao projeto são protegidos por direitos autorais.

Não é permitido copiar, modificar, redistribuir, comercializar, publicar, hospedar,
oferecer como serviço ou criar derivados deste projeto sem autorização prévia e por escrito
do autor.

Consulte o arquivo [LICENSE](./LICENSE) para mais detalhes.
