# Task 001 — MercadoLivre Order Extractor

> Construir o pipeline completo de extração de pedidos do MercadoLivre seguindo arquitetura hexagonal:
> camada de domínio, portas/use-cases da aplicação, adapter MercadoLivre com OAuth2, publisher RabbitMQ,
> scheduler, wiring NestJS e cobertura de 100% das funções.

---

## Referências — Documentação Oficial MercadoLivre

### Autenticação e Autorização

| Tópico | Link |
|---|---|
| Visão geral de Auth & Authorization | https://developers.mercadolivre.com.br/en_us/services-manage-users/authentication-and-authorization |
| Obtenção do Access Token (PT-BR) | https://developers.mercadolivre.com.br/pt_br/obtencao-do-access-token |
| Registrar sua aplicação | https://developers.mercadolivre.com.br/en_us/services-manage-users/register-your-application |
| Gerenciar aplicações | https://developers.mercadolivre.com.br/en_us/services-manage-users/manage-your-applications |

**Endpoint de token:**
```
POST https://api.mercadolibre.com/oauth/token
Content-Type: application/x-www-form-urlencoded
```

**Resposta do token:**
```json
{
  "access_token": "APP_USR-0303456-053009-cc03aaf33-123456",
  "token_type": "Bearer",
  "expires_in": 21600,
  "scope": "offline_access",
  "user_id": 123456,
  "refresh_token": "TG-0303456abc-123456"
}
```

**Causas de invalidação do token (antes de expirar):**
- Usuário alterou a senha
- Aplicação atualizou o App Secret
- Usuário revogou permissões da aplicação
- Aplicação sem uso por 4 meses

### Pedidos (Orders)

| Tópico | Link |
|---|---|
| Order Management (EN) — busca, resposta, filtros | https://developers.mercadolivre.com.br/en_us/order-management |
| Gerenciamento de Vendas (PT-BR) | https://developers.mercadolivre.com.br/pt_br/gerenciamento-de-vendas |
| Mshops Sales Management | https://developers.mercadolivre.com.br/en_us/sales-management-mshops |
| API Docs Reference | https://developers.mercadolivre.com.br/en_us/api-docs |

**Endpoint de busca de pedidos:**
```
GET https://api.mercadolibre.com/orders/search?seller={SELLER_ID}
Authorization: Bearer {ACCESS_TOKEN}
```

**Paginação:** default `limit=50`, suporta `offset` e `scroll_id`.

### Status de Pedido (`order.status`)

Fonte: campo `available_filters` da resposta de `/orders/search` ([doc](https://developers.mercadolivre.com.br/en_us/order-management))

| Status | Descrição |
|---|---|
| `confirmed` | Pedido confirmado, ainda sem pagamento |
| `payment_required` | Aguardando confirmação de pagamento |
| `payment_in_process` | Pagamento associado mas ainda não creditado |
| `paid` | Pagamento creditado |
| `cancelled` | Pedido cancelado |
| `invalid` | Pedido inválido |

### Status de Envio (`shipping.status`)

Fonte: campo `available_filters` da resposta de `/orders/search` ([doc](https://developers.mercadolivre.com.br/en_us/order-management))

| Status | Descrição |
|---|---|
| `to_be_agreed` | Envio a combinar |
| `pending` | Pendente |
| `handling` | Em manuseio |
| `ready_to_ship` | Pronto para envio |
| `shipped` | Despachado |
| `delivered` | Entregue ao comprador |
| `not_delivered` | Não entregue |
| `not_verified` | Não verificado |
| `cancelled` | Envio cancelado |
| `closed` | Encerrado |
| `error` | Erro |
| `active` | Ativo |

### Envios e Tracking (ME1)

| Tópico | Link |
|---|---|
| Order States & Tracking (ME1) | https://developers.mercadolibre.com.co/en_us/me1-order-states |
| Gerenciamento de Envios (PT-BR) | https://developers.mercadolivre.com.br/pt_br/gerenciamento-de-envios |

**Status de envio ME1 (notificação ao comprador):**

| Status | Substatus | Descrição |
|---|---|---|
| `shipped` | `null` | Despachado |
| `not_delivered` | `returning_to_sender` | Não entregue — devolvido ao vendedor |
| `delivered` | `null` | Entregue ao comprador |

### Packs (Carrinho)

| Tópico | Link |
|---|---|
| Gestão de Packs (PT-BR) | https://developers.mercadolivre.com.br/pt_br/gestao-packs |

> Um pack é um carrinho de compras que pode conter múltiplos pedidos (orders).

### Notas Fiscais e Faturamento

| Tópico | Link |
|---|---|
| Notas Fiscais | https://developers.mercadolivre.com.br/pt_br/gerenciamento-de-vendas/obtendo-nota-fiscal |
| Relatórios de Faturamento | https://developers.mercadolivre.com.br/pt_br/boas-praticas-para-o-consumo-das-apis-de-relatorios-de-faturamento |

---

## Estado Atual

- Scaffold NestJS 11 com boilerplate: `main.ts`, `AppModule`, `AppController`, `AppService`
- Único arquivo hexagonal: `src/application/ports/out/IPlatformClient.ts` com tipos placeholder `{}`
- `tsconfig.json` já tem path aliases (`@domain/*`, `@application/*`, `@adapters/*`, `@infrastructure/*`)
- `node_modules` instalado, mas faltam: `@nestjs/schedule`, `@nestjs/config`, `axios`, `amqplib`, `class-validator`, `class-transformer`
- `CLAUDE.md` referencia arquitetura antiga (iFood, Rappi, IOrderRepository) — precisa ser reescrito

## Estratégia

Construir **de dentro para fora** (domínio -> aplicação -> adapters -> infraestrutura). Cada arquivo ganha um `.spec.ts` no mesmo diretório. Remover boilerplate NestJS não utilizado (`app.controller.ts`, `app.service.ts`, `app.controller.spec.ts`).

---

## Fase 0 — Dependências e Limpeza

### Comandos de instalação

```bash
# Dependências de produção (versões auditadas)
npm install \
  axios@1.14.0 \
  @nestjs/schedule@^6.1.1 \
  @nestjs/config@^4.0.3 \
  amqplib@^1.0.2 \
  class-validator@^0.14.1 \
  class-transformer@^0.5.1

# Dependências de desenvolvimento
npm install --save-dev \
  @types/amqplib@^0.10.8

# Verificar segurança após instalação
npm audit
npm audit --audit-level=high
```

### Limpeza de boilerplate

- Remover `src/app.controller.ts`, `src/app.service.ts`, `src/app.controller.spec.ts`
- Remover `src/adapters/out/platforms/ubereats/` (diretório placeholder da arquitetura antiga)
- Os overrides de `path-to-regexp@8.4.0` e `picomatch@4.0.4` já estão no `package.json`

---

## Fase 1 — Camada de Domínio (zero dependência de framework)

Todos os arquivos de domínio são TypeScript puro — sem imports do NestJS.

**Arquivos (8 total — 4 source + 4 spec):**

| # | Arquivo | Descrição |
|---|---|---|
| 1 | `src/domain/errors/DomainError.ts` | Classe base `DomainError` + `InvalidOrderIdError` + `InvalidOrderError` |
| 2 | `src/domain/errors/DomainError.spec.ts` | Testes: herança, instanceof, mensagens de erro |
| 3 | `src/domain/value-objects/OrderStatus.ts` | Enum com os 6 status da API ML + `parseOrderStatus()` + `isValidOrderStatus()` |
| 4 | `src/domain/value-objects/OrderStatus.spec.ts` | Testes: valores válidos, inválidos, parse com erro |
| 5 | `src/domain/value-objects/OrderId.ts` | Value object imutável (number), construtor privado + `static create()` + `equals()` |
| 6 | `src/domain/value-objects/OrderId.spec.ts` | Testes: criação válida, zero, negativo, NaN, Infinity, equals |
| 7 | `src/domain/entities/Order.ts` | Entidade com `OrderId`, `OrderStatus`, `OrderItem[]`, `toJSON()`. Imutável via `Object.freeze` |
| 8 | `src/domain/entities/Order.spec.ts` | Testes: criação válida, items vazio, total negativo, moeda vazia, imutabilidade, toJSON |

### Código: `src/domain/errors/DomainError.ts`

```typescript
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidOrderIdError extends DomainError {
  constructor(value: string) {
    super(`Invalid order ID: "${value}". Must be a non-empty numeric string.`);
  }
}

export class InvalidOrderError extends DomainError {
  constructor(reason: string) {
    super(`Invalid order: ${reason}`);
  }
}
```

### Código: `src/domain/value-objects/OrderStatus.ts`

```typescript
export enum OrderStatus {
  CONFIRMED = 'confirmed',
  PAYMENT_REQUIRED = 'payment_required',
  PAYMENT_IN_PROCESS = 'payment_in_process',
  PAID = 'paid',
  CANCELLED = 'cancelled',
  INVALID = 'invalid',
}

const VALID_STATUSES = new Set<string>(Object.values(OrderStatus));

export function isValidOrderStatus(value: string): value is OrderStatus {
  return VALID_STATUSES.has(value);
}

export function parseOrderStatus(value: string): OrderStatus {
  if (!isValidOrderStatus(value)) {
    throw new Error(
      `Unknown order status: "${value}". Valid: ${[...VALID_STATUSES].join(', ')}`,
    );
  }
  return value;
}
```

### Código: `src/domain/value-objects/OrderId.ts`

```typescript
import { InvalidOrderIdError } from '../errors/DomainError';

export class OrderId {
  private readonly value: number;

  private constructor(value: number) {
    this.value = value;
  }

  static create(value: number): OrderId {
    if (!Number.isFinite(value) || value <= 0 || !Number.isInteger(value)) {
      throw new InvalidOrderIdError(String(value));
    }
    return new OrderId(value);
  }

  getValue(): number {
    return this.value;
  }

  equals(other: OrderId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return String(this.value);
  }
}
```

### Código: `src/domain/entities/Order.ts`

```typescript
import { OrderId } from '../value-objects/OrderId';
import { OrderStatus } from '../value-objects/OrderStatus';
import { InvalidOrderError } from '../errors/DomainError';

export interface OrderItem {
  readonly title: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly currencyId: string;
}

export interface CreateOrderProps {
  id: OrderId;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  currencyId: string;
  dateCreated: Date;
  lastUpdated: Date;
}

export class Order {
  private readonly _id: OrderId;
  private readonly _status: OrderStatus;
  private readonly _items: readonly OrderItem[];
  private readonly _totalAmount: number;
  private readonly _currencyId: string;
  private readonly _dateCreated: Date;
  private readonly _lastUpdated: Date;

  private constructor(props: CreateOrderProps) {
    this._id = props.id;
    this._status = props.status;
    this._items = Object.freeze([...props.items]);
    this._totalAmount = props.totalAmount;
    this._currencyId = props.currencyId;
    this._dateCreated = props.dateCreated;
    this._lastUpdated = props.lastUpdated;
  }

  static create(props: CreateOrderProps): Order {
    if (props.items.length === 0) {
      throw new InvalidOrderError('Order must have at least one item.');
    }
    if (props.totalAmount < 0) {
      throw new InvalidOrderError('Total amount cannot be negative.');
    }
    if (!props.currencyId || props.currencyId.trim() === '') {
      throw new InvalidOrderError('Currency ID is required.');
    }
    return new Order(props);
  }

  get id(): OrderId { return this._id; }
  get status(): OrderStatus { return this._status; }
  get items(): readonly OrderItem[] { return this._items; }
  get totalAmount(): number { return this._totalAmount; }
  get currencyId(): string { return this._currencyId; }
  get dateCreated(): Date { return this._dateCreated; }
  get lastUpdated(): Date { return this._lastUpdated; }

  toJSON(): Record<string, unknown> {
    return {
      id: this._id.getValue(),
      status: this._status,
      items: this._items,
      totalAmount: this._totalAmount,
      currencyId: this._currencyId,
      dateCreated: this._dateCreated.toISOString(),
      lastUpdated: this._lastUpdated.toISOString(),
    };
  }
}
```

---

## Fase 2 — Camada de Aplicação (Portas e Use Cases)

**Portas (interfaces):**

- `src/application/ports/out/IPlatformClient.ts` — **reescrever** arquivo existente com tipos corretos:

```typescript
export interface FetchOrdersParams {
  dateFrom: Date;
  dateTo: Date;
  sellerId: string;
}

export interface IPlatformClient {
  readonly platformName: string;
  fetchOrders(params: FetchOrdersParams): Promise<Order[]>;
}
```

- `src/application/ports/out/IMessagePublisher.ts` — porta abstrata de mensageria:

```typescript
export interface IMessagePublisher {
  publish(routingKey: string, message: unknown): Promise<void>;
  close(): Promise<void>;
}
```

- `src/application/ports/in/IExtractOrdersUseCase.ts` — porta de entrada:

```typescript
export interface IExtractOrdersUseCase {
  execute(params: ExtractOrdersCommand): Promise<ExtractOrdersResult>;
}
```

**Use Case:**

- `src/application/use-cases/ExtractOrdersUseCase.ts` — injeta `IPlatformClient` e `IMessagePublisher` via tokens. Busca pedidos, publica cada um na fila, retorna contagem/resumo.
- `.spec.ts` com mocks das portas (nunca das implementações)

---

## Fase 3 — Adapters (MercadoLivre + RabbitMQ + Scheduler)

### Adapter MercadoLivre (`src/adapters/out/platforms/mercadolivre/`)

- `dtos/MercadoLivreDto.ts` — interfaces fortemente tipadas para respostas da API ML (`MercadoLivreOrderDto`, `MercadoLivreTokenResponseDto`, `MercadoLivreOrderItemDto`). Zero `any`.
- `MercadoLivreAuthService.ts` — gerencia tokens OAuth2. Verifica `expiresAt - now < 5min`, chama endpoint de refresh, salva novo par de tokens em memória. Usa `axios@1.14.0`.
- `MercadoLivreOrderMapper.ts` — função pura: `MercadoLivreOrderDto` -> `Order` (entidade do domínio). Valida e mapeia campos.
- `MercadoLivreClientAdapter.ts` — implementa `IPlatformClient`. Injeta `MercadoLivreAuthService`. Chama `GET /orders/search?seller={sellerId}&order.date_created.from=...`. Pagina resultados. Usa mapper.
- `.spec.ts` para cada um (mock de axios, mock do auth service)

### Adapter RabbitMQ (`src/adapters/out/messaging/rabbitmq/`)

- `RabbitMQPublisherAdapter.ts` — implementa `IMessagePublisher`. Conecta via `amqplib`, asserta fila, publica mensagens JSON. Trata reconexão.
- `.spec.ts` com mock do `amqplib`

### Adapter Scheduler (`src/adapters/in/scheduler/`)

- `OrderExtractionScheduler.ts` — decorator `@Cron()` do `@nestjs/schedule`. Injeta use case via token `IExtractOrdersUseCase`. Calcula range de datas a partir da config. Chama `execute()`.
- `.spec.ts` com mock do use case

---

## Fase 4 — Infraestrutura (Wiring NestJS)

- `src/infrastructure/config/AppConfig.ts` — config tipada usando `@nestjs/config` `registerAs()`. Valida todas as env vars na inicialização. Grupos: `mercadolivre`, `scheduler`, `rabbitmq`.
- `src/infrastructure/modules/OrderModule.ts` — registra todos os providers com tokens de DI:
  - `PLATFORM_CLIENT_TOKEN` -> `MercadoLivreClientAdapter`
  - `MESSAGE_PUBLISHER_TOKEN` -> `RabbitMQPublisherAdapter`
  - `EXTRACT_ORDERS_USE_CASE_TOKEN` -> `ExtractOrdersUseCase`
- `src/infrastructure/modules/AppModule.ts` — substitui o atual `src/app.module.ts`. Importa `ConfigModule.forRoot()`, `ScheduleModule.forRoot()`, `OrderModule`.
- Atualizar `src/main.ts` para importar o novo `AppModule` da infraestrutura.

---

## Fase 5 — Arquivos de Configuração e Documentação

- Criar `.env.example` com todas as variáveis documentadas
- Atualizar `CLAUDE.md` para refletir a arquitetura real do MercadoLivre (remover referências iFood/Rappi/UberEats, adicionar fluxo de auth ML, atualizar tabela de pacotes, atualizar árvore de pastas)
- Atualizar `package.json` Jest config para incluir `moduleNameMapper` dos path aliases e `coverageThreshold` (100% funções)

---

## Resumo de Arquivos

- Domínio: 4 source + 4 spec = **8 arquivos**
- Aplicação: 4 source + 2 spec = **6 arquivos** (portas são interfaces, sem spec)
- Adapters: 6 source + 6 spec = **12 arquivos**
- Infraestrutura: 3 source = **3 arquivos**
- Config/docs: `.env.example`, `CLAUDE.md` atualizado, `package.json` atualizado
- **Total: ~32 arquivos** (incluindo testes)

---

## Checklist por Fase

- [ ] **Fase 0** — Dependências instaladas, boilerplate removido, `npm audit` limpo
- [ ] **Fase 1** — Domínio completo com specs passando
- [ ] **Fase 2** — Portas definidas, use case implementado com spec
- [ ] **Fase 3** — Adapters ML + RabbitMQ + Scheduler com specs
- [ ] **Fase 4** — Modules configurados, app compila e sobe
- [ ] **Fase 5** — `.env.example`, `CLAUDE.md` e Jest config atualizados
