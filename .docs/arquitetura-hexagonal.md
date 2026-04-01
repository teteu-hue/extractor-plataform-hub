# Arquitetura Hexagonal — Guia Didático

> Este documento explica os conceitos por trás da arquitetura hexagonal aplicada neste
> projeto. Serve como referência de estudo para entender **por que** cada pasta, camada
> e padrão existe.

---

## O que é a Arquitetura Hexagonal?

A Arquitetura Hexagonal (também chamada de **Ports & Adapters**) foi proposta por Alistair Cockburn em 2005. A ideia central é uma só: **o núcleo da aplicação não deve saber que o mundo externo existe**.

O sistema é dividido em camadas com uma regra de dependência rígida: as camadas internas **nunca** importam das externas. As externas é que se adaptam ao núcleo.

```
┌─────────────────────────────────────────────────────────────────┐
│  INFRAESTRUTURA (NestJS modules, DI, config)                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  ADAPTERS (implementações concretas)                      │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  APPLICATION (use cases + ports)                    │  │  │
│  │  │  ┌───────────────────────────────────────────────┐  │  │  │
│  │  │  │  DOMAIN (entidades, value objects, erros)     │  │  │  │
│  │  │  │  Nenhuma dependência externa.                 │  │  │  │
│  │  │  │  Não sabe o que é NestJS, HTTP ou RabbitMQ.   │  │  │  │
│  │  │  └───────────────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

A seta de dependência sempre aponta **para dentro**: adapters dependem da application, application depende do domain, domain não depende de nada.

---

## Camada: `domain/` — O Coração do Sistema

**O que é:** Contém as regras de negócio puras. É o código que existiria mesmo se não houvesse framework, banco de dados ou API externa.

**Regra de ouro:** Zero imports de NestJS, axios, amqplib ou qualquer biblioteca externa. Apenas TypeScript puro.

**Por que existe:** Se amanhã trocarmos NestJS por Fastify, ou RabbitMQ por Kafka, ou MercadoLivre por Shopee — o domínio **não muda**. Um pedido continua sendo um pedido, com ID, status e itens.

**No nosso projeto:** A entidade `Order` representa um pedido do mundo real. Ela não sabe que veio do MercadoLivre nem que será publicada no RabbitMQ.

### O que são Value Objects (`domain/value-objects/`)

**Por que esse nome?** O termo vem do Domain-Driven Design (DDD), criado por Eric Evans. Um **Value Object** é um objeto que:

1. **É definido pelo seu valor, não por uma identidade** — dois `OrderId("123")` são iguais se o valor é `"123"`, não importa se são instâncias diferentes
2. **É imutável** — uma vez criado, não pode ser alterado
3. **Valida a si mesmo** — um `OrderId` vazio ou nulo não pode existir; a validação acontece na criação

**Comparação com tipos primitivos:**

```typescript
// SEM value object — qualquer string é aceita, inclusive inválida
function getOrder(id: string): Order { ... }
getOrder("");     // compila, mas é um bug
getOrder("abc");  // compila, pode ser inválido

// COM value object — só IDs válidos passam
function getOrder(id: OrderId): Order { ... }
getOrder(OrderId.create(""));     // lança erro na criação
getOrder(OrderId.create("12345")); // garante que é válido
```

**No nosso projeto:**
- `OrderId` — encapsula o ID numérico do pedido do ML. Valida que não é vazio/nulo.
- `OrderStatus` — enum com os status possíveis (`paid`, `confirmed`, `cancelled`...). Garante que só valores válidos da API do ML são aceitos.

### O que são Entities (`domain/entities/`)

Uma **Entidade** é diferente de um Value Object porque **tem identidade**. Dois pedidos com o mesmo valor total não são o mesmo pedido — eles têm IDs diferentes.

**No nosso projeto:** `Order` é uma entidade identificada por `OrderId`. Ela agrupa os value objects e dados do pedido em um único objeto coeso.

### O que são Domain Errors (`domain/errors/`)

Erros tipados do domínio. Em vez de lançar `throw new Error("ID inválido")` (string genérica), criamos classes específicas como `InvalidOrderIdError`. Isso permite:
- Tratamento diferenciado por tipo de erro (`catch` específico)
- Mensagens padronizadas
- Rastreabilidade

---

## Camada: `application/` — Orquestração e Contratos

**O que é:** Contém os **casos de uso** (a lógica de "o que o sistema faz") e os **contratos** (interfaces que definem o que o sistema precisa do mundo externo).

**Regra de ouro:** Depende apenas do domínio. Nunca importa implementações concretas (axios, amqplib, etc.).

### O que são Ports (`application/ports/`)

**Ports** são **interfaces** — contratos abstratos que definem **o que** o sistema precisa, sem dizer **como**.

Existem dois tipos:

**Ports de entrada (`ports/in/`)** — definem o que o mundo externo pode pedir ao sistema:
```typescript
// "O sistema pode extrair pedidos"
export interface IExtractOrdersUseCase {
  execute(params: ExtractOrdersCommand): Promise<ExtractOrdersResult>;
}
```
Quem chama? Um cron job, um controller HTTP, um comando CLI — qualquer um. O use case não sabe nem se importa.

**Ports de saída (`ports/out/`)** — definem o que o sistema precisa do mundo externo:
```typescript
// "O sistema precisa buscar pedidos de alguma plataforma"
export interface IPlatformClient {
  fetchOrders(params: FetchOrdersParams): Promise<Order[]>;
}

// "O sistema precisa publicar mensagens em alguma fila"
export interface IMessagePublisher {
  publish(routingKey: string, message: unknown): Promise<void>;
}
```
Quem implementa? O `MercadoLivreClientAdapter`, o `RabbitMQPublisherAdapter` — mas o use case não sabe disso. Ele só conhece a interface.

**Por que isso importa?** Porque amanhã podemos trocar MercadoLivre por Shopee criando um novo adapter, sem alterar **nenhuma linha** do use case.

### O que são Use Cases (`application/use-cases/`)

Um **Use Case** é uma operação completa do sistema. Ele orquestra a lógica:

```
ExtractOrdersUseCase.execute():
  1. Chama IPlatformClient.fetchOrders()  → busca pedidos
  2. Para cada pedido, chama IMessagePublisher.publish()  → publica na fila
  3. Retorna o resultado (quantos pedidos extraídos)
```

O use case não sabe que `IPlatformClient` é o MercadoLivre. Não sabe que `IMessagePublisher` é o RabbitMQ. Ele trabalha **apenas com interfaces**.

---

## Camada: `adapters/` — O Mundo Real

**O que é:** Implementações concretas que conectam o sistema ao mundo externo. São os "tradutores" entre o núcleo da aplicação e as tecnologias reais.

**Regra de ouro:** Cada adapter implementa uma interface (port) definida na application. O adapter conhece a tecnologia específica (axios, amqplib), mas o restante do sistema não.

**Dois tipos:**

**Adapters de entrada (`adapters/in/`)** — recebem estímulos do mundo externo e chamam os use cases:
- `OrderExtractionScheduler` — um cron job que, a cada 30 minutos, chama `IExtractOrdersUseCase.execute()`
- Poderia ser um controller HTTP, um listener de fila, um comando CLI — o use case não se importa

**Adapters de saída (`adapters/out/`)** — implementam os ports de saída, conectando a tecnologia real:
- `MercadoLivreClientAdapter` — implementa `IPlatformClient` usando axios + API do ML
- `RabbitMQPublisherAdapter` — implementa `IMessagePublisher` usando amqplib

**No nosso projeto:**

```
Mundo externo (entrada)          Núcleo              Mundo externo (saída)
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│ Cron Scheduler   │────>│ ExtractOrders    │────>│ MercadoLivre API     │
│ (adapter in)     │     │ UseCase          │     │ (adapter out)        │
└──────────────────┘     │                  │     └──────────────────────┘
                         │                  │     ┌──────────────────────┐
                         │                  │────>│ RabbitMQ             │
                         │                  │     │ (adapter out)        │
                         └──────────────────┘     └──────────────────────┘
```

---

## Camada: `infrastructure/` — Cola do Framework

**O que é:** Configuração do NestJS, módulos, injeção de dependência, variáveis de ambiente. É a camada que "cola" tudo.

**Responsabilidade:** Dizer ao NestJS: "quando alguém pedir `PLATFORM_CLIENT_TOKEN`, entregue uma instância de `MercadoLivreClientAdapter`". Essa é a inversão de dependência em ação — o use case pede pela interface (token), e a infraestrutura decide qual implementação entregar.

---

## Resumo: Por que cada pasta tem esse nome

| Pasta | Nome vem de | Propósito |
|---|---|---|
| `domain/` | Domain-Driven Design (Eric Evans) | Regras de negócio puras, zero dependência |
| `domain/value-objects/` | DDD — objetos definidos pelo valor, imutáveis, auto-validados | `OrderId`, `OrderStatus` |
| `domain/entities/` | DDD — objetos com identidade única | `Order` |
| `domain/errors/` | Convenção — erros tipados do domínio | `InvalidOrderIdError` |
| `application/ports/` | Hexagonal (Cockburn) — "portas" de entrada e saída | Interfaces/contratos |
| `application/ports/in/` | Hexagonal — o que o sistema oferece | `IExtractOrdersUseCase` |
| `application/ports/out/` | Hexagonal — o que o sistema precisa | `IPlatformClient`, `IMessagePublisher` |
| `application/use-cases/` | Clean Architecture (Robert C. Martin) | Operações completas do sistema |
| `adapters/in/` | Hexagonal — traduzem entrada externa para o núcleo | Scheduler, controllers |
| `adapters/out/` | Hexagonal — traduzem o núcleo para tecnologias externas | ML client, RabbitMQ publisher |
| `infrastructure/` | Convenção NestJS — configuração e DI | Modules, config |

---

## Regra de dependência (nunca violar)

```
infrastructure → adapters → application → domain
       ↑              ↑           ↑           ↑
    depende de    depende de  depende de   não depende
    tudo          application  domain       de nada
```

Se um arquivo em `domain/` importar algo de `adapters/` ou `infrastructure/`, a arquitetura está quebrada.

---

## Princípios SOLID aplicados neste projeto

| Princípio | Aplicação |
|---|---|
| **S** — Single Responsibility | Cada Use Case trata uma única operação. Adapters apenas traduzem. |
| **O** — Open/Closed | `IPlatformClient` permite novas plataformas sem alterar código existente. |
| **L** — Liskov Substitution | Todo adapter de plataforma implementa `IPlatformClient` sem quebrar o contrato. |
| **I** — Interface Segregation | Ports separados para `in` (use cases) e `out` (clientes, publishers). |
| **D** — Dependency Inversion | Use Cases dependem de interfaces, não de implementações concretas. |
