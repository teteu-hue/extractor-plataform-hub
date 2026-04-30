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

> Os adapters são a ponte entre o núcleo da aplicação e o mundo externo.
> Cada adapter implementa (ou estende) um port definido na camada de aplicação.
> Aqui mora todo código que sabe o que é axios, amqplib, API do ML ou `@nestjs/schedule`.

**Arquivos (11 total — 6 source + 5 spec):**

| # | Arquivo | Tipo | Descrição |
|---|---|---|---|
| 1 | `src/adapters/out/platforms/mercadolivre/dtos/MercadoLivreDto.ts` | source | Interfaces tipadas das respostas da API ML |
| 2 | `src/adapters/out/platforms/mercadolivre/MercadoLivreAuthService.ts` | source | Gerenciamento de tokens OAuth2 |
| 3 | `src/adapters/out/platforms/mercadolivre/MercadoLivreAuthService.spec.ts` | spec | Testes: token válido, expirado, refresh, falha |
| 4 | `src/adapters/out/platforms/mercadolivre/MercadoLivreOrderMapper.ts` | source | Função pura: DTO do ML → `Order` do domínio |
| 5 | `src/adapters/out/platforms/mercadolivre/MercadoLivreOrderMapper.spec.ts` | spec | Testes: mapeamento, campos faltando, status inválido |
| 6 | `src/adapters/out/platforms/mercadolivre/MercadoLivreClientAdapter.ts` | source | `extends IPlatformClient`. Busca pedidos com paginação |
| 7 | `src/adapters/out/platforms/mercadolivre/MercadoLivreClientAdapter.spec.ts` | spec | Testes: paginação, auth header, mapper integration |
| 8 | `src/adapters/out/messaging/rabbitmq/RabbitMQPublisherAdapter.ts` | source | `implements IMessagePublisher`. Publica mensagens JSON |
| 9 | `src/adapters/out/messaging/rabbitmq/RabbitMQPublisherAdapter.spec.ts` | spec | Testes: publicação, reconexão, close |
| 10 | `src/adapters/in/scheduler/OrderExtractionScheduler.ts` | source | Cron job que dispara o use case |
| 11 | `src/adapters/in/scheduler/OrderExtractionScheduler.spec.ts` | spec | Testes: range de datas, chamada ao use case |

### Pré-requisito: Ajustes nos ports existentes

Antes de implementar os adapters, os ports precisam de ajustes para que os adapters consigam implementá-los corretamente.

**`src/application/ports/out/IMessagePublish.ts` — Adicionar `routingKey`**

O port atual não recebe `routingKey`, mas o adapter RabbitMQ precisa saber em qual fila publicar:

```typescript
// ANTES (atual)
export interface IMessagePublisher {
  publish(message: unknown): Promise<void>;
  close(): Promise<void>;
}

// DEPOIS — routingKey permite que o use case decida a fila
export interface IMessagePublisher {
  publish(routingKey: string, message: unknown): Promise<void>;
  close(): Promise<void>;
}
```

**Por que:** Sem `routingKey`, o adapter teria que hardcodar o nome da fila ou receber via config. Com `routingKey` no contrato, o use case (que conhece o contexto de negócio) decide para onde enviar.

**`src/application/ports/out/IExtractOrdersUseCase.ts` — Tipar parâmetros e retorno**

O port atual usa `unknown[]` e `void`, que não carregam informação nenhuma:

```typescript
// ANTES (atual)
export interface IExtractOrdersUseCase {
  execute(...params: unknown[]): Promise<void>;
}

// DEPOIS — tipos explícitos
export interface ExtractOrdersCommand {
  dateFrom: Date;
  dateTo: Date;
  sellerId: string;
}

export interface ExtractOrdersResult {
  totalExtracted: number;
  totalPublished: number;
}

export abstract class IExtractOrdersUseCase {
  abstract execute(command: ExtractOrdersCommand): Promise<ExtractOrdersResult>;
}
```

**Por que `abstract class`?** Pelo mesmo motivo do `IPlatformClient` — o NestJS precisa de um token que exista em runtime para injeção de dependência. `interface` é apagada na compilação (ver doc em `arquitetura-hexagonal.md`).

**Por que mover de `ports/out/` para `ports/in/`?** O `IExtractOrdersUseCase` é um port de **entrada** — define o que o mundo externo (scheduler) pode pedir ao sistema. Hoje ele está em `ports/out/`, o que é conceitualmente errado.

**`src/application/ports/out/IPlatformClient.ts` — Remover `externalOrderId` dos params**

```typescript
// ANTES (atual)
export interface FetchOrdersParams {
  externalOrderId: string;  // não faz sentido aqui — buscamos VÁRIOS pedidos
  dateFrom: Date;
  dateTo: Date;
  sellerId: string;
}

// DEPOIS
export interface FetchOrdersParams {
  dateFrom: Date;
  dateTo: Date;
  sellerId: string;
}
```

**Por que:** `externalOrderId` é um dado de um pedido individual, não um parâmetro de busca. A busca é por range de datas + seller.

---

### 3.1 — DTOs do MercadoLivre (arquivo novo)

**Arquivo:** `src/adapters/out/platforms/mercadolivre/dtos/MercadoLivreDto.ts`

**O que é:** Interfaces que espelham exatamente o JSON da API do ML. Ficam no adapter (não no domínio) porque representam o formato **externo**.

**Por que DTOs separados?** A API do ML usa snake_case (`date_created`, `order_items`, `unit_price`), tem campos que o domínio não precisa (`tags`, `status_detail`), e estrutura aninhada diferente. O DTO captura esse formato cru. O Mapper (3.3) traduz para o domínio.

```typescript
/** Resposta do POST /oauth/token (ver Referências → Autenticação) */
export interface MercadoLivreTokenResponseDto {
  access_token: string;
  token_type: string;
  expires_in: number;       // segundos até expirar (geralmente 21600 = 6h)
  scope: string;
  user_id: number;
  refresh_token: string;    // novo refresh_token (o anterior é invalidado)
}

/** Item dentro de order_items[] na resposta de /orders/search */
export interface MercadoLivreOrderItemDto {
  item: {
    id: string;             // ex: "MLB1234567890"
    title: string;
    category_id: string;
  };
  quantity: number;
  unit_price: number;
  currency_id: string;      // ex: "BRL"
}

/** Comprador (buyer) dentro de um pedido */
export interface MercadoLivreBuyerDto {
  id: number;
  nickname: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: {
    area_code: string;
    number: string;
  };
}

/** Um pedido individual em results[] */
export interface MercadoLivreOrderDto {
  id: number;                                  // → Order.externalOrderId (String)
  status: string;                              // → parseOrderStatus()
  status_detail: string | null;
  date_created: string;                        // ISO 8601 → new Date()
  date_last_updated: string;                   // ISO 8601 → new Date()
  order_items: MercadoLivreOrderItemDto[];     // → OrderItem[]
  total_amount: number;                        // → Order.totalAmount
  currency_id: string;                         // → Order.currencyId
  buyer: MercadoLivreBuyerDto;                 // → Client value object
  seller: { id: number };
  tags: string[];
}

/** Paginação */
export interface MercadoLivrePagingDto {
  total: number;
  offset: number;
  limit: number;      // default 50 na API
}

/** Resposta completa de GET /orders/search */
export interface MercadoLivreOrderSearchResponseDto {
  query: string;
  results: MercadoLivreOrderDto[];
  paging: MercadoLivrePagingDto;
}
```

**Sem spec:** DTOs são apenas interfaces — não têm lógica para testar.

---

### 3.2 — MercadoLivreAuthService (arquivo novo)

**Arquivo:** `src/adapters/out/platforms/mercadolivre/MercadoLivreAuthService.ts`

**Responsabilidade:** Gerenciar o ciclo de vida do token OAuth2 do ML. Não implementa nenhum port — é um serviço **interno** do adapter ML, injetado no `MercadoLivreClientAdapter`.

**Fluxo do token (baseado na doc de Referências):**

```
1. Primeira chamada → usa refresh_token do .env para obter access_token
   POST https://api.mercadolibre.com/oauth/token
   Body: grant_type=refresh_token&client_id=...&client_secret=...&refresh_token=...

2. Armazena em memória: { accessToken, refreshToken, expiresAt }

3. Chamadas seguintes → verifica se (expiresAt - now) < 5 min
   → Se sim: faz refresh (mesmo POST, com o refreshToken atualizado)
   → Se não: retorna accessToken em memória

4. Cuidado: cada refresh invalida o refresh_token anterior.
   O novo refresh_token vem na resposta.
```

**Por que buffer de 5 min?** O token expira em 6h (`expires_in: 21600`). Se verificarmos apenas no momento exato, uma request lenta poderia usar um token que expira durante o trânsito.

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { MercadoLivreTokenResponseDto } from './dtos/MercadoLivreDto';

interface TokenState {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

@Injectable()
export class MercadoLivreAuthService {
  private static readonly TOKEN_URL = 'https://api.mercadolibre.com/oauth/token';
  private static readonly REFRESH_BUFFER_MS = 5 * 60 * 1000;

  private tokenState: TokenState | null = null;

  constructor(private readonly configService: ConfigService) {}

  /** Retorna um access_token válido, fazendo refresh se necessário. */
  async getAccessToken(): Promise<string> {
    if (this.isTokenValid()) {
      return this.tokenState!.accessToken;
    }
    await this.refreshAccessToken();
    return this.tokenState!.accessToken;
  }

  private isTokenValid(): boolean {
    if (!this.tokenState) return false;
    const now = new Date();
    const remaining = this.tokenState.expiresAt.getTime() - now.getTime();
    return remaining > MercadoLivreAuthService.REFRESH_BUFFER_MS;
  }

  private async refreshAccessToken(): Promise<void> {
    // Na primeira chamada, usa o refresh_token do .env
    // Nas seguintes, usa o refresh_token atualizado pelo último refresh
    const refreshToken = this.tokenState?.refreshToken
      ?? this.configService.getOrThrow<string>('mercadolivre.refreshToken');

    const response = await axios.post<MercadoLivreTokenResponseDto>(
      MercadoLivreAuthService.TOKEN_URL,
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.configService.getOrThrow<string>('mercadolivre.clientId'),
        client_secret: this.configService.getOrThrow<string>('mercadolivre.clientSecret'),
        refresh_token: refreshToken,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    const { access_token, refresh_token, expires_in } = response.data;
    this.tokenState = {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: new Date(Date.now() + expires_in * 1000),
    };
  }
}
```

**Spec — cenários:**

| Cenário | O que testa |
|---|---|
| Sem token → chama refresh | Primeira chamada dispara POST `/oauth/token` |
| Token válido → retorna direto | Não faz request se `expiresAt` está longe |
| Token próximo de expirar → refresh | Buffer de 5 min dispara refresh automático |
| Refresh falha (401) → lança erro | Token revogado (ver "Causas de invalidação" nas Referências) |
| Refresh retorna novo `refresh_token` | State atualizado com o novo par de tokens |

---

### 3.3 — MercadoLivreOrderMapper (arquivo novo)

**Arquivo:** `src/adapters/out/platforms/mercadolivre/MercadoLivreOrderMapper.ts`

**Responsabilidade:** Função pura que traduz `MercadoLivreOrderDto` → `Order` (domínio). É aqui que o "vocabulário" do ML vira o vocabulário do nosso domínio.

**Mapeamento campo a campo:**

| ML (DTO) | Domínio (Order/CreateOrderProps) | Transformação |
|---|---|---|
| `id` (number) | `externalOrderId` (string) | `String(dto.id)` |
| `id` (number) | `id` (OrderId) | `OrderId.create(dto.id)` |
| `status` (string) | `status` (OrderStatus) | `parseOrderStatus(dto.status)` |
| `order_items[].item.title` | `items[].title` | direto |
| `order_items[].quantity` | `items[].quantity` | direto |
| `order_items[].unit_price` | `items[].unitPrice` | rename snake→camel |
| `order_items[].currency_id` | `items[].currencyId` | rename snake→camel |
| `total_amount` | `totalAmount` | rename snake→camel |
| `currency_id` | `currencyId` | rename snake→camel |
| `date_created` (ISO string) | `dateCreated` (Date) | `new Date(dto.date_created)` |
| `date_last_updated` (ISO string) | `lastUpdated` (Date) | `new Date(dto.date_last_updated)` |
| `buyer.first_name + last_name` | `client.name` | concatenação |
| `buyer.phone.area_code + number` | `client.phone` | concatenação |
| `buyer.email` | `client.email` | direto |
| — (fixo) | `platform` | `PlatformEnum.MERCADOLIVRE` |

**Por que o mapper fica no adapter e não no domínio?** Porque ele conhece `MercadoLivreOrderDto` — um tipo específico do ML. O domínio não sabe que o ML existe.

```typescript
import { Order } from '@domain/entities/Order';
import { OrderId } from '@domain/value-objects/OrderId';
import { parseOrderStatus } from '@domain/value-objects/OrderStatus';
import { PlatformEnum } from '@domain/value-objects/Platform';
import { Client } from '@domain/value-objects/Client';
import { MercadoLivreOrderDto } from './dtos/MercadoLivreDto';

export class MercadoLivreOrderMapper {
  static toDomain(dto: MercadoLivreOrderDto): Order {
    const items = dto.order_items.map((oi) => ({
      title: oi.item.title,
      quantity: oi.quantity,
      unitPrice: oi.unit_price,
      currencyId: oi.currency_id,
    }));

    const client = Client.create({
      name: `${dto.buyer.first_name} ${dto.buyer.last_name}`.trim(),
      phone: `${dto.buyer.phone.area_code}${dto.buyer.phone.number}`,
      email: dto.buyer.email,
    });

    return Order.create({
      id: OrderId.create(dto.id),
      externalOrderId: String(dto.id),
      status: parseOrderStatus(dto.status),
      items,
      client,
      platform: PlatformEnum.MERCADOLIVRE,
      totalAmount: dto.total_amount,
      currencyId: dto.currency_id,
      dateCreated: new Date(dto.date_created),
      lastUpdated: new Date(dto.date_last_updated),
    });
  }

  static toDomainList(dtos: MercadoLivreOrderDto[]): Order[] {
    return dtos.map((dto) => this.toDomain(dto));
  }
}
```

**Nota:** Para esse mapper funcionar, `CreateOrderProps` precisa incluir `client: Client`. Hoje não inclui — será adicionado como ajuste.

**Spec — cenários:**

| Cenário | O que testa |
|---|---|
| DTO válido completo → Order criada | Todos os campos mapeados corretamente |
| DTO com status desconhecido → erro | `parseOrderStatus` lança para status fora do enum |
| DTO com `order_items` vazio → erro | `Order.create` rejeita items vazios |
| DTO com `total_amount` negativo → erro | `Order.create` rejeita total <= 0 |
| `toDomainList` com múltiplos DTOs | Mapeia array completo |
| Campos do buyer → Client | Nome concatenado, phone formatado, email direto |

---

### 3.4 — MercadoLivreClientAdapter (arquivo novo)

**Arquivo:** `src/adapters/out/platforms/mercadolivre/MercadoLivreClientAdapter.ts`

**Responsabilidade:** Implementação concreta do port `IPlatformClient` para o ML. Busca pedidos com paginação automática e traduz para entidades de domínio.

**Relação com a arquitetura:**

```
UseCase ──chama──> IPlatformClient.fetchOrders(params)   [port abstrato]
                         ↑
                         │ extends
                         │
              MercadoLivreClientAdapter                   [este arquivo]
                    │           │
                    │           └──> MercadoLivreOrderMapper.toDomainList()
                    └──> MercadoLivreAuthService.getAccessToken()
```

**Por que `extends` e não `implements`?** Porque `IPlatformClient` é uma `abstract class` (necessário para DI do NestJS), não uma `interface`. Em TypeScript, `abstract class` requer `extends`.

**Fluxo de paginação (baseado na doc: "limit=50, suporta offset"):**

```
1. offset = 0
2. GET /orders/search?seller={sellerId}&order.date_created.from=...&limit=50&offset={offset}
3. Mapeia results[] via MercadoLivreOrderMapper
4. Se offset + limit < paging.total → offset += limit, volta ao passo 2
5. Retorna todas as Orders acumuladas
```

```typescript
import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { IPlatformClient, FetchOrdersParams } from '@application/ports/out/IPlatformClient';
import { Order } from '@domain/entities/Order';
import { MercadoLivreAuthService } from './MercadoLivreAuthService';
import { MercadoLivreOrderMapper } from './MercadoLivreOrderMapper';
import { MercadoLivreOrderSearchResponseDto } from './dtos/MercadoLivreDto';

@Injectable()
export class MercadoLivreClientAdapter extends IPlatformClient {
  private static readonly BASE_URL = 'https://api.mercadolibre.com';
  private static readonly PAGE_SIZE = 50;

  readonly platformName = 'MercadoLivre';

  constructor(private readonly authService: MercadoLivreAuthService) {
    super();
  }

  async fetchOrders(params: FetchOrdersParams): Promise<Order[]> {
    const allOrders: Order[] = [];
    let offset = 0;
    let total: number;

    do {
      const token = await this.authService.getAccessToken();

      const response = await axios.get<MercadoLivreOrderSearchResponseDto>(
        `${MercadoLivreClientAdapter.BASE_URL}/orders/search`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            seller: params.sellerId,
            'order.date_created.from': params.dateFrom.toISOString(),
            'order.date_created.to': params.dateTo.toISOString(),
            limit: MercadoLivreClientAdapter.PAGE_SIZE,
            offset,
          },
        },
      );

      const { results, paging } = response.data;
      total = paging.total;
      offset += paging.limit;

      allOrders.push(...MercadoLivreOrderMapper.toDomainList(results));
    } while (offset < total);

    return allOrders;
  }

  // authenticate() do port — apenas força o refresh do token
  async authenticate(): Promise<void> {
    await this.authService.getAccessToken();
  }
}
```

**Spec — cenários:**

| Cenário | O que testa |
|---|---|
| 1 página (total=10, limit=50) | Retorna orders, sem loop |
| 3 páginas (total=120, limit=50) | Loop acumula todas as orders |
| 0 resultados (total=0) | Retorna array vazio |
| Header `Authorization: Bearer {token}` | Verifica que token vai em toda request |
| Erro 401 → propaga | Não silencia erro de auth |
| Erro de rede → propaga | Não silencia timeout/DNS |

---

### 3.5 — RabbitMQPublisherAdapter (arquivo novo)

**Arquivo:** `src/adapters/out/messaging/rabbitmq/RabbitMQPublisherAdapter.ts`

**Responsabilidade:** Implementação do port `IMessagePublisher`. Conecta ao RabbitMQ, garante que a fila existe e publica mensagens JSON.

**Por que `implements` e não `extends`?** Porque `IMessagePublisher` é uma `interface` (não precisa ser token de DI — quem vira token é o `IMessagePublisher` via `provide/useClass` no module). Se no futuro virar `abstract class` para DI, mudamos para `extends`.

**Fluxo de lazy connection:**

```
1. Primeira chamada a publish() → conecta (amqplib.connect(url))
2. Cria channel
3. assertQueue(routingKey) → cria a fila se não existir
4. sendToQueue() → publica JSON serializado, com persistent: true
5. Desconexão inesperada → handler limpa state → próximo publish reconecta
6. close() → fecha channel + connection
```

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqplib from 'amqplib';
import { IMessagePublisher } from '@application/ports/out/IMessagePublish';

@Injectable()
export class RabbitMQPublisherAdapter implements IMessagePublisher {
  private connection: amqplib.Connection | null = null;
  private channel: amqplib.Channel | null = null;

  constructor(private readonly configService: ConfigService) {}

  async publish(routingKey: string, message: unknown): Promise<void> {
    const channel = await this.getChannel();
    await channel.assertQueue(routingKey, { durable: true });
    channel.sendToQueue(
      routingKey,
      Buffer.from(JSON.stringify(message)),
      { persistent: true },
    );
  }

  async close(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
    this.channel = null;
    this.connection = null;
  }

  private async getChannel(): Promise<amqplib.Channel> {
    if (this.channel) return this.channel;

    const url = this.configService.getOrThrow<string>('rabbitmq.url');
    this.connection = await amqplib.connect(url);
    this.channel = await this.connection.createChannel();

    // Se a conexão cair, limpa o state para que o próximo publish reconecte
    this.connection.on('close', () => {
      this.channel = null;
      this.connection = null;
    });

    return this.channel;
  }
}
```

**Por que `persistent: true`?** Garante que a mensagem sobrevive a um restart do RabbitMQ (escrita em disco, não só em memória).

**Por que `durable: true` na fila?** Mesmo motivo — a fila em si sobrevive ao restart do broker.

**Spec — cenários:**

| Cenário | O que testa |
|---|---|
| Primeiro `publish()` → conecta + cria channel + asserta fila | Lazy connection |
| Segundo `publish()` → reutiliza channel | Não reconecta se já conectado |
| Mensagem publicada como JSON + persistent | `Buffer.from(JSON.stringify(...))` |
| Conexão perdida → próximo publish reconecta | Handler `on('close')` limpa state |
| `close()` → fecha channel e connection | Cleanup |
| `close()` sem conexão → não lança erro | Null-safe via `?.` |

---

### 3.6 — OrderExtractionScheduler (arquivo novo)

**Arquivo:** `src/adapters/in/scheduler/OrderExtractionScheduler.ts`

**Responsabilidade:** Adapter de **entrada**. Cron job que dispara o use case periodicamente.

**Por que é adapter IN?** Ele recebe um estímulo externo (o tempo/cron) e chama o use case. É a mesma posição que um controller HTTP teria — a diferença é que o "cliente" é o relógio, não um browser.

```
   ┌─────────────────────────────┐
   │ OrderExtractionScheduler    │  ← adapter IN (este arquivo)
   │ @Cron(EVERY_30_MINUTES)     │
   │                             │
   │ injeta IExtractOrdersUseCase│  ← port IN (abstract class para DI)
   │ chama execute()             │
   └─────────────┬───────────────┘
                 │
                 ▼
   ┌─────────────────────────────┐
   │ ExtractOrdersUseCase        │  ← use case (implementado na Fase 2)
   └─────────────────────────────┘
```

**Cálculo do range de datas:**

```
now = 2026-04-01T15:00:00
intervalMinutes = 30  (vindo do config)
dateFrom = now - 30min = 2026-04-01T14:30:00
dateTo = now
```

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { IExtractOrdersUseCase } from '@application/ports/in/IExtractOrdersUseCase';

@Injectable()
export class OrderExtractionScheduler {
  private readonly logger = new Logger(OrderExtractionScheduler.name);

  constructor(
    private readonly extractOrdersUseCase: IExtractOrdersUseCase,
    private readonly configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleCron(): Promise<void> {
    this.logger.log('Starting scheduled order extraction...');

    const now = new Date();
    const intervalMinutes = this.configService.getOrThrow<number>('scheduler.intervalMinutes');
    const dateFrom = new Date(now.getTime() - intervalMinutes * 60 * 1000);
    const sellerId = this.configService.getOrThrow<string>('mercadolivre.sellerId');

    const result = await this.extractOrdersUseCase.execute({
      dateFrom,
      dateTo: now,
      sellerId,
    });

    this.logger.log(
      `Extraction completed: ${result.totalExtracted} extracted, ${result.totalPublished} published.`,
    );
  }
}
```

**Spec — cenários:**

| Cenário | O que testa |
|---|---|
| `handleCron()` calcula `dateFrom` corretamente | `now - intervalMinutes` em ms |
| Chama `useCase.execute()` com params corretos | sellerId, dateFrom, dateTo |
| Loga resultado com contadores | Logger chamado com totalExtracted/totalPublished |
| Use case lança erro → scheduler propaga | Erros não são engolidos silenciosamente |

---

### Bug existente a corrigir antes da Fase 3

Em `src/domain/entities/Order.ts`, linha 103, a validação de `externalOrderId` está com um bug lógico:

```typescript
// BUGADO — a condição é (!x || x), que é SEMPRE true
if (!props.externalOrderId || props.externalOrderId) {
  throw new InvalidOrderError('Order external order ID is required');
}

// CORRETO — verifica ausência com trim
if (!props.externalOrderId || props.externalOrderId.trim() === '') {
  throw new InvalidOrderError('Order external order ID is required');
}
```

---

### Resumo: dependências entre os arquivos da Fase 3

```
OrderExtractionScheduler (adapter IN)
  └──> IExtractOrdersUseCase (port IN — Fase 2)
         ├──> IPlatformClient (port OUT)
         │      └──> MercadoLivreClientAdapter (adapter OUT)
         │             ├──> MercadoLivreAuthService (serviço interno)
         │             │     └──> axios → POST /oauth/token
         │             └──> MercadoLivreOrderMapper (função pura)
         │                    └──> Order.create() / Client.create() (domínio)
         └──> IMessagePublisher (port OUT)
                └──> RabbitMQPublisherAdapter (adapter OUT)
                       └──> amqplib → RabbitMQ
```

### Ordem de implementação recomendada

| Passo | Arquivo | Motivo |
|---|---|---|
| 0 | Ajustar ports + corrigir bug Order.ts | Pré-requisito para tudo |
| 1 | `MercadoLivreDto.ts` | Zero dependência, base para mapper e client |
| 2 | `MercadoLivreOrderMapper.ts` + spec | Depende só do DTO + domínio |
| 3 | `MercadoLivreAuthService.ts` + spec | Depende só de axios + config |
| 4 | `MercadoLivreClientAdapter.ts` + spec | Depende de auth + mapper |
| 5 | `RabbitMQPublisherAdapter.ts` + spec | Independente dos anteriores |
| 6 | `OrderExtractionScheduler.ts` + spec | Depende só do use case (Fase 2) |

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
