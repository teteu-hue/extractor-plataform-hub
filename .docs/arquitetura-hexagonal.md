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

Uma **Entidade** é diferente de um Value Object porque **tem identidade** e **ciclo de vida**. Ela nasce, muda de estado e precisa ser rastreada ao longo do tempo. Dois pedidos com o mesmo valor total não são o mesmo pedido — eles têm IDs diferentes.

**O teste para saber se algo é Entity:** tem ID próprio + muda de estado + precisa ser persistido/rastreado = Entity.

**No nosso projeto:** `Order` é uma entidade identificada por `OrderId`. Ela agrupa os value objects e dados do pedido em um único objeto coeso.

**Quando criar uma nova entity?** Exemplos de entidades que poderiam surgir neste projeto:

- **`ExtractionLog`** — registra cada execução de extração. Tem ID, data de início/fim, quantidade de pedidos extraídos, status (sucesso/falha). Nasce a cada execução, muda de estado ("em andamento" → "concluído"), precisa ser consultada depois ("quando foi a última extração?").
- **`Seller`** — se o sistema passasse a suportar múltiplos vendedores. Cada seller tem ID, credenciais (token ML), configurações próprias. Nasce quando cadastrado, pode ser desativado, tem histórico.
- **`ExtractionSchedule`** — se cada plataforma/seller pudesse ter agendamentos diferentes. Tem ID, frequência, último horário de execução, estado (ativo/pausado). Muda ao longo do tempo.

**Entity vs. Value Object — cuidado com a confusão:**

Um erro comum é criar uma Entity para algo que é apenas um rótulo fixo. Exemplo: `Platform` ("Mercado Livre", "Shopee") **não é Entity** neste projeto — "Mercado Livre" não nasce, não morre, não muda de estado no nosso sistema. É um valor fixo e conhecido, ou seja, um **Value Object**.

Se `Platform` fosse Entity, seria num sistema diferente — por exemplo, um SaaS onde o próprio usuário cadastra e configura plataformas dinamicamente:

```typescript
// AQUI sim Platform seria Entity — tem ciclo de vida e estado mutável
export class Platform {
  private _id: PlatformId;
  private _name: string;
  private _apiBaseUrl: string;
  private _credentials: PlatformCredentials;
  private _status: PlatformStatus; // active, suspended, configuring
  private _rateLimitConfig: RateLimitConfig;
  private _lastHealthCheck: Date;

  activate() { ... }
  suspend() { ... }
  updateCredentials(creds: PlatformCredentials) { ... }
}
```

**Regra prática:** se o conceito é como o **número 5** (valor, imutável, sempre igual a si mesmo) → Value Object. Se é como uma **conta bancária** (tem ID, saldo muda, precisa ser rastreada) → Entity.

> **No nosso projeto:** novas plataformas não se "plugam" por uma Entity. Elas se plugam por **adapters que implementam o port `IPlatformClient`**. O enum `PlatformEnum` + Value Object resolvem o "de onde veio o pedido". O port + adapter resolvem o "como conectar".

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

**Ports** são contratos abstratos que definem **o que** o sistema precisa, sem dizer **como**.

#### Por que usamos `abstract class` em vez de `interface` nos ports?

No TypeScript puro, um port seria uma `interface`:

```typescript
export interface IPlatformClient {
  fetchOrders(params: FetchOrdersParams): Promise<Order[]>;
}
```

O problema: uma `interface` **não existe em runtime**. Ela é apagada completamente na compilação para JavaScript. É apenas uma dica para o compilador.

O NestJS precisa de um **token real** para a injeção de dependência — algo que exista em runtime para ele saber: "quando alguém pedir X, entrego Y". Uma interface apagada não pode ser esse token.

Por isso usamos `abstract class`:

```typescript
export abstract class IPlatformClient {
  abstract fetchOrders(params: FetchOrdersParams): Promise<Order[]>;
}
```

Uma `abstract class`:
- **Existe em runtime** — vira uma classe JavaScript real, pode ser usada como token de DI
- **Não pode ser instanciada diretamente** — assim como uma interface, obriga alguém a implementar
- **Define o contrato** — todo método `abstract` precisa ser implementado pela classe filha

| Característica | `interface` | `abstract class` |
|---|---|---|
| Existe em runtime? | Não (apagada na compilação) | Sim (vira classe JS real) |
| Pode ser token de DI no NestJS? | Não | Sim |
| Pode ter implementação parcial? | Não | Sim (métodos não-abstract) |
| Pode ser instanciada? | N/A | Não (precisa de `extends`) |
| Suporta múltipla herança? | Sim (`implements A, B`) | Não (`extends` de uma só) |

**Isso NÃO é o padrão Abstract Factory.** Abstract Factory é sobre criar *famílias de objetos relacionados*. Aqui é mais simples: usamos `abstract class` apenas porque precisamos de um contrato que sobreviva à compilação para funcionar como token de DI no NestJS. Conceitualmente, continua sendo um **Port** (contrato/interface) da arquitetura hexagonal.

> **Regra:** se o projeto não usasse NestJS (ou qualquer DI container que precisa de tokens em runtime), `interface` seria a escolha correta e mais idiomática.

Existem dois tipos de port:

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
