# 🔧 Auto Repair Shop API

API RESTful para gerenciamento de oficina mecânica — Ordens de Serviço, Clientes, Veículos, Serviços e Peças.

## Justificativa do Banco de Dados

**PostgreSQL** foi escolhido por:
- Suporte robusto a transações (ACID) — essencial para controle de estoque
- Integridade referencial forte (FK entre clientes → veículos → OS → serviços/peças)
- Tipos nativos (enum, uuid, decimal) que mapeiam diretamente para o domínio
- Ecossistema maduro com TypeORM e excelente performance para queries analíticas (relatórios)

## Tecnologias

- **NestJS** — Framework Node.js com arquitetura em camadas
- **TypeORM** — ORM com suporte a migrations e decorators
- **PostgreSQL 16** — Banco de dados relacional
- **JWT** — Autenticação via Bearer Token
- **Swagger** — Documentação interativa da API
- **Docker & Docker Compose** — Containerização
- **Jest** — Testes unitários e de integração

## Arquitetura

```
src/
├── auth/          # Autenticação JWT (login/register)
├── clients/       # CRUD de clientes (CPF/CNPJ validado)
├── vehicles/      # CRUD de veículos (placa validada)
├── services/      # CRUD de serviços de reparo
├── parts/         # CRUD de peças com controle de estoque
├── orders/        # Ordens de Serviço (fluxo completo)
├── reports/       # Relatórios (tempo médio, dashboard)
└── common/        # Guards, validators, decorators
```

## Execução Local

### Pré-requisitos
- Node.js 20+
- Docker e Docker Compose

### Com Docker (recomendado)

```bash
# Subir toda a stack (API + PostgreSQL)
docker-compose up --build

# API disponível em http://localhost:3000
# Swagger em http://localhost:3000/api/docs
```

### Sem Docker

```bash
# 1. Instalar dependências
npm install

# 2. Subir PostgreSQL (ex: via Docker)
docker run -d --name pg-repair \
  -e POSTGRES_DB=auto_repair \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 postgres:16-alpine

# 3. Copiar variáveis de ambiente
cp .env.example .env

# 4. Rodar em modo desenvolvimento
npm run start:dev
```

### Testes

```bash
# Testes unitários
npm test

# Testes com cobertura
npm run test:cov

# Testes e2e
npm run test:e2e
```

## Endpoints Principais

### Auth (público)
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/auth/register` | Registrar usuário admin |
| POST | `/auth/login` | Login (retorna JWT) |

### Clientes (autenticado)
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/clients` | Cadastrar cliente |
| GET | `/clients` | Listar clientes |
| GET | `/clients/search?cpfCnpj=` | Buscar por CPF/CNPJ |
| GET | `/clients/:id` | Detalhar cliente |
| PATCH | `/clients/:id` | Atualizar cliente |
| DELETE | `/clients/:id` | Remover cliente |

### Veículos (autenticado)
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/vehicles` | Cadastrar veículo |
| GET | `/vehicles` | Listar veículos |
| GET | `/vehicles/:id` | Detalhar veículo |
| PATCH | `/vehicles/:id` | Atualizar veículo |
| DELETE | `/vehicles/:id` | Remover veículo |

### Serviços (autenticado)
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/services` | Cadastrar serviço |
| GET | `/services` | Listar serviços |
| PATCH | `/services/:id` | Atualizar serviço |
| DELETE | `/services/:id` | Remover serviço |

### Peças e Insumos (autenticado)
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/parts` | Cadastrar peça |
| GET | `/parts` | Listar peças (com estoque) |
| PATCH | `/parts/:id` | Atualizar peça/estoque |
| DELETE | `/parts/:id` | Remover peça |

### Ordens de Serviço
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/orders` | Criar OS (gera orçamento auto) |
| GET | `/orders` | Listar todas as OS |
| GET | `/orders/:id` | Detalhar OS |
| PATCH | `/orders/:id/status` | Alterar status (fluxo) |
| GET | `/orders/:id/track` | **Público** — Cliente acompanha OS |

### Relatórios (autenticado)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/reports/average-time` | Tempo médio de execução |
| GET | `/reports/orders-by-status` | OS por status |
| GET | `/reports/dashboard` | Dashboard completo |

## Fluxo de Status da OS

```
RECEIVED → IN_DIAGNOSIS → AWAITING_APPROVAL → IN_EXECUTION → FINISHED → DELIVERED
```

- Transições são validadas automaticamente
- Estoque é decrementado ao iniciar execução (IN_EXECUTION)
- Timestamps são registrados em cada etapa

## Variáveis de Ambiente

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| DATABASE_HOST | localhost | Host do PostgreSQL |
| DATABASE_PORT | 5432 | Porta do PostgreSQL |
| DATABASE_USER | postgres | Usuário do banco |
| DATABASE_PASSWORD | postgres | Senha do banco |
| DATABASE_NAME | auto_repair | Nome do banco |
| JWT_SECRET | default-secret | Chave secreta JWT |
| PORT | 3000 | Porta da API |
