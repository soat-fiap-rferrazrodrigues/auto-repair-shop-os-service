# ADR-002: Escalabilidade via Horizontal Pod Autoscaler

- **Status:** Aceito
- **Data:** 2026-09-15

## Contexto

A expansão para múltiplas unidades torna a carga variável ao longo do dia, com
picos na abertura da oficina. É necessário absorver esses picos sem manter
capacidade ociosa permanente.

## Decisão

Usar **HorizontalPodAutoscaler (autoscaling/v2)** com gatilhos de **CPU a 70%** e
**memória a 80%**, variando de **2 a 5 réplicas**, combinado com um managed node
group EKS que escala de 2 a 5 nós.

## Justificativa

- Escala horizontal é adequada para uma API stateless: qualquer réplica atende
  qualquer requisição, pois o estado vive no PostgreSQL.
- Mínimo de 2 réplicas garante disponibilidade durante rollout e falha de nó.
- Dois gatilhos evitam ponto cego: cargas de I/O pressionam memória antes da CPU.
- O addon `metrics-server` é provisionado no Terraform, pois o HPA depende dele.

## Consequências

**Positivas**
- Absorve picos automaticamente e reduz custo fora do horário de pico.
- Limites de recursos declarados por pod tornam o scheduling previsível.

**Negativas**
- Escala reativa: há latência entre o pico e a nova réplica pronta.
- Exige `readinessProbe` correta (`/ready`), senão o tráfego chega antes do pod
  conseguir falar com o banco.

**Alternativas descartadas**
- *Vertical Pod Autoscaler*: exige reinício do pod, causando indisponibilidade.
- *Réplicas fixas*: ou desperdiça recurso, ou degrada no pico.
