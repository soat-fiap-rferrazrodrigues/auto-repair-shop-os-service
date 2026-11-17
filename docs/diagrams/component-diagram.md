# Diagrama de Componentes

Visão de nuvem da plataforma Auto Repair Shop, incluindo API Gateway, função
serverless de autenticação, cluster Kubernetes, banco gerenciado e observabilidade.

```mermaid
flowchart TB
    subgraph Cliente
        APP["Cliente / Aplicativo Web"]
    end

    subgraph AWS["AWS — Região us-east-1"]
        GW["API Gateway HTTP<br/>(roteamento, throttling, access logs)"]

        subgraph Serverless
            LAMBDA["Lambda auth-cpf<br/>valida CPF → consulta cliente → emite JWT HS256"]
        end

        subgraph EKS["Cluster EKS (VPC privada)"]
            ING["Service / Ingress"]
            API["Deployment auto-repair-api<br/>NestJS · 2-5 réplicas"]
            HPA["HorizontalPodAutoscaler<br/>CPU 70% / Memória 80%"]
            DD["Datadog Agent (DaemonSet)<br/>métricas · logs · APM"]
            ES["External Secrets Operator"]
        end

        subgraph Dados
            RDS[("RDS PostgreSQL 16<br/>Multi-AZ em produção")]
            SM["Secrets Manager<br/>credenciais e JWT_SECRET"]
        end
    end

    subgraph SaaS["Observabilidade"]
        DATADOG["Datadog<br/>dashboards · monitores · synthetics"]
    end

    APP -->|"POST /auth/token (CPF)"| GW
    APP -->|"/api/* + Bearer JWT"| GW
    GW --> LAMBDA
    GW --> ING
    ING --> API
    HPA -.->|escala| API

    LAMBDA -->|consulta cliente| RDS
    LAMBDA -->|lê credenciais| SM
    API --> RDS
    ES -->|sincroniza| SM
    ES -->|cria Secret| API

    API -->|traces + logs JSON| DD
    DD --> DATADOG
    LAMBDA -->|logs estruturados| DATADOG
    GW -->|access logs| DATADOG
```

## Responsabilidades

| Componente | Responsabilidade |
|---|---|
| **API Gateway** | Ponto único de entrada, roteamento, throttling e access logs correlacionados |
| **Lambda auth-cpf** | Valida CPF, consulta cliente e emite JWT HS256 (`iss=auto-repair-auth-lambda`) |
| **Deployment API** | Regras de negócio de ordens de serviço, clientes, veículos, peças e serviços |
| **HPA** | Escala horizontal por consumo de CPU e memória |
| **RDS PostgreSQL** | Persistência transacional com backup automático e criptografia |
| **Secrets Manager** | Guarda `JWT_SECRET` e credenciais; nada sensível fica em Git |
| **Datadog Agent** | Coleta métricas de nó/pod, logs JSON e traces APM |

## Contrato de token compartilhado

A Lambda e a API assinam e validam com o **mesmo `JWT_SECRET` (HS256)**.
As claims são mantidas compatíveis em `src/auth/mappers/auth.mapper.ts`:

```json
{
  "sub": "<client-id>",
  "email": "cliente@exemplo.com",
  "role": "client",
  "clientId": "<client-id>",
  "cpf": "52998224725",
  "iss": "auto-repair-auth-lambda"
}
```

## Fase 4 — Microsserviços

```mermaid
flowchart LR
    GW[API Gateway] --> OS[os-service :3000]
    GW --> BIL[billing-service :3001]
    GW --> EXE[execution-service :3002]
    MP[Mercado Pago] -- webhook --> BIL

    OS -- publica --> T1[(SNS os-commands)]
    T1 -- billing.* --> Q1[[SQS billing-commands]] --> BIL
    T1 -- execution.* --> Q2[[SQS execution-commands]] --> EXE
    BIL -- publica --> T2[(SNS billing-events)]
    EXE -- publica --> T3[(SNS execution-events)]
    T2 --> Q3[[SQS os-saga-events]]
    T3 --> Q3
    Q3 --> OS

    OS --- DB1[(PostgreSQL os)]
    BIL --- DB2[(PostgreSQL billing)]
    EXE --- DB3[(DynamoDB execution)]

    Q1 -.-> D1[[DLQ]]
    Q2 -.-> D2[[DLQ]]
    Q3 -.-> D3[[DLQ]]
```

Cada serviço acessa somente o próprio banco. As permissões vêm do IAM via IRSA
(ADR-005, ADR-006).
