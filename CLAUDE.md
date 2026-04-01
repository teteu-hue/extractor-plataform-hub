# CLAUDE.md — Platform Extractors Hub

> Instruções de arquitetura, padrões e setup para o projeto platform-extractors-hub.
> Este arquivo é a fonte da verdade para criação e evolução do sistema.

---

## ⚠️ ALERTA DE SEGURANÇA — LEIA ANTES DE INSTALAR QUALQUER PACOTE

### 🚨 axios — Supply Chain Attack ATIVO (31/03/2026)

**Versões comprometidas (NÃO INSTALAR):**
- `axios@1.14.1` — RAT dropper via `plain-crypto-js@4.2.1`
- `axios@0.30.4` — RAT dropper via `plain-crypto-js@4.2.1`

**O que aconteceu:** A conta npm do mantenedor principal do axios foi comprometida. As versões acima injetam `plain-crypto-js@4.2.1` como dependência, que executa um script `postinstall` baixando um Remote Access Trojan (RAT) para macOS, Windows e Linux.

**Versões seguras:**
- `axios@1.14.0` ✅ (última versão limpa da linha 1.x)
- `axios@0.30.3` ✅ (última versão limpa da linha 0.x)

**Ação obrigatória no projeto:**
```json
// package.json — fixar versão exata
"axios": "1.14.0"
```

```bash
# SEMPRE usar npm ci (não npm install) em CI/CD
npm ci

# Verificar lockfile antes de qualquer instalação
npm audit
```

**Referências:** Wiz Blog (31/03/2026), StepSecurity, The Hacker News, Snyk.

---

### 🔶 @nestjs/platform-express — CVE-2025-47944

**Versões afetadas:** `@nestjs/platform-express@10.x` (usa `multer@1.4.4-lts.1`)

**Severidade:** Alta — Uncaught Exception + Memory Leak  
**Correção:** Usar NestJS 11.x (`@nestjs/platform-express@11.x`) que depende de `multer@2.0.0+`

**Versão segura:** `@nestjs/platform-express@^11.1.17` ✅

---

### 🔶 @nestjs/platform-fastify — CVE-2025-69211

**Afeta:** `@nestjs/platform-fastify < 11.1.11`  
**Problema:** Middleware bypass por URL encoding — permite acesso não autenticado a rotas protegidas.  
**Ação:** Usar `@nestjs/platform-fastify@^11.1.17` ou usar Express (recomendado para este projeto).

---

### 🔶 @nestjs/devtools-integration — CVE-2025-54782

**Afeta:** versões < `0.2.1`  
**Problema:** RCE via `vm.runInNewContext()` sem CORS  
**Ação:** Versão segura `@nestjs/devtools-integration@0.2.1` ✅ — Nunca usar devtools em produção.

---

## 🏗️ Arquitetura: Hexagonal (Ports & Adapters) com NestJS 11

```
src/
├── application/                  # Casos de uso (núcleo da aplicação)
│   ├── ports/
│   │   ├── in/                   # Interfaces de entrada (driven)
│   │   │   └── IExtractOrdersUseCase.ts
│   │   └── out/                  # Interfaces de saída (driving)
│   │       ├── IOrderRepository.ts
│   │       └── IPlatformClient.ts
│   └── use-cases/
│       └── ExtractOrdersUseCase.ts
│
├── domain/                       # Entidades e regras de negócio puras
│   ├── entities/
│   │   └── Order.ts
│   ├── value-objects/
│   │   └── OrderId.ts
│   └── errors/
│       └── DomainError.ts
│
├── adapters/
│   ├── in/                       # Adaptadores de entrada (HTTP, Queue, CLI...)
│   │   └── http/
│   │       ├── OrderController.ts
│   │       └── dtos/
│   │           ├── ExtractOrderRequestDto.ts
│   │           └── OrderResponseDto.ts
│   └── out/                      # Adaptadores de saída (DB, APIs externas...)
│       ├── persistence/
│       │   └── OrderRepositoryAdapter.ts
│       └── platforms/
│           ├── PlatformClientBase.ts      # Classe base abstrata
│           ├── ifood/
│           │   └── IfoodClientAdapter.ts
│           └── rappi/
│               └── RappiClientAdapter.ts
│
├── infrastructure/               # Config, módulos NestJS, DI
│   ├── modules/
│   │   ├── AppModule.ts
│   │   └── OrderModule.ts
│   └── config/
│       └── AppConfig.ts
│
└── main.ts
```

---

## 📦 Pacotes e Versões Auditadas

| Pacote | Versão Segura | Status | Observação |
|---|---|---|---|
| `@nestjs/core` | `^11.1.17` | ✅ | Última estável |
| `@nestjs/common` | `^11.1.17` | ✅ | Última estável |
| `@nestjs/platform-express` | `^11.1.17` | ✅ | Corrige CVE-2025-47944 |
| `@nestjs/config` | `^4.0.3` | ✅ | |
| `@nestjs/swagger` | `^11.x` | ✅ | Usar versão compatível com NestJS 11 |
| `@nestjs/testing` | `^11.1.17` | ✅ | |
| `axios` | `1.14.0` | ✅ SEGURA | **PIN EXATO** — `1.14.1` e `0.30.4` são ☠️ MALICIOSAS |
| `class-validator` | `^0.14.1` | ✅ | |
| `class-transformer` | `^0.5.1` | ✅ | |
| `reflect-metadata` | `^0.2.2` | ✅ | |
| `rxjs` | `^7.8.1` | ✅ | |
| **DevDependencies** | | | |
| `@nestjs/cli` | `^11.0.16` | ✅ | |
| `typescript` | `^5.7.x` | ✅ | |
| `jest` | `^29.x` | ✅ | |
| `@types/jest` | `^29.x` | ✅ | |
| `ts-jest` | `^29.x` | ✅ | |
| `eslint` | `^9.x` | ✅ | |
| `@typescript-eslint/parser` | `^8.x` | ✅ | |

---

## 🚀 Setup Passo a Passo

### Pré-requisitos

```bash
# Node.js LTS (22.x recomendado)
node --version  # >= 20.x

# npm >= 10
npm --version

# NestJS CLI global
npm install -g @nestjs/cli@11.0.16
```

### 1. Criar o Projeto

```bash
nest new platform-extractors-hub --package-manager npm --strict
cd platform-extractors-hub
```

### 2. Remover e Reinstalar com Versões Fixas

```bash
# Remover node_modules e lockfile para controle total
rm -rf node_modules package-lock.json

# Instalar dependências de produção com versões auditadas
npm install \
  @nestjs/core@^11.1.17 \
  @nestjs/common@^11.1.17 \
  @nestjs/platform-express@^11.1.17 \
  @nestjs/config@^4.0.3 \
  axios@1.14.0 \
  class-validator@^0.14.1 \
  class-transformer@^0.5.1 \
  reflect-metadata@^0.2.2 \
  rxjs@^7.8.1

# DevDependencies
npm install --save-dev \
  @nestjs/testing@^11.1.17 \
  @nestjs/cli@^11.0.16 \
  @nestjs/schematics@^11.x \
  typescript@^5.7.0 \
  ts-node@^10.9.2 \
  ts-jest@^29.x \
  jest@^29.x \
  @types/jest@^29.x \
  @types/node@^22.x \
  @types/express@^5.x \
  eslint@^9.x \
  @typescript-eslint/eslint-plugin@^8.x \
  @typescript-eslint/parser@^8.x
```

### 3. Auditar Imediatamente Após Instalar

```bash
npm audit

# Se houver vulnerabilidades de severidade alta/crítica, NÃO prosseguir sem correção
npm audit --audit-level=high
```

### 4. Configurar tsconfig.json (Tipagem Forte)

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2022",
    "lib": ["ES2022"],
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": false,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "forceConsistentCasingInFileNames": true,
    "paths": {
      "@domain/*": ["src/domain/*"],
      "@application/*": ["src/application/*"],
      "@adapters/*": ["src/adapters/*"],
      "@infrastructure/*": ["src/infrastructure/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.spec.ts"]
}
```

> ⚠️ `"noImplicitAny": true` e `"strict": true` garantem **proibição total de `any`** no projeto.

### 5. Configurar ESLint (.eslintrc.js) — Bloquear `any`

```js
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',       // Proíbe `any` explícito
    '@typescript-eslint/no-unsafe-assignment': 'error',  // Proíbe atribuição unsafe
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'warn',
  },
};
```

### 6. Configurar Jest (jest.config.ts)

```ts
import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 100,   // 100% de cobertura em funções
      lines: 80,
      statements: 80,
    },
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@domain/(.*)$': '<rootDir>/domain/$1',
    '^@application/(.*)$': '<rootDir>/application/$1',
    '^@adapters/(.*)$': '<rootDir>/adapters/$1',
    '^@infrastructure/(.*)$': '<rootDir>/infrastructure/$1',
  },
};

export default config;
```

---

## 🧱 Princípios SOLID Aplicados

| Princípio | Como Aplicar |
|---|---|
| **S** — Single Responsibility | Cada Use Case trata uma única operação. Adapters só fazem tradução. |
| **O** — Open/Closed | `IPlatformClient` permite adicionar plataformas sem modificar código existente. |
| **L** — Liskov Substitution | Todo adapter de plataforma implementa `IPlatformClient` sem quebrar o contrato. |
| **I** — Interface Segregation | Portas separadas para `in` (use cases) e `out` (repositórios, clientes). |
| **D** — Dependency Inversion | Use cases dependem de interfaces, não de implementações concretas. |

---

## 🔌 Contrato de Nova Plataforma

Para adicionar uma nova plataforma (ex: Uber Eats), basta criar um adapter que implemente `IPlatformClient`:

```ts
// src/application/ports/out/IPlatformClient.ts
export interface IPlatformClient {
  readonly platformName: string;
  fetchOrders(params: FetchOrdersParams): Promise<RawOrderData[]>;
  authenticate(credentials: PlatformCredentials): Promise<AuthToken>;
}
```

```ts
// src/adapters/out/platforms/ubereats/UberEatsClientAdapter.ts
@Injectable()
export class UberEatsClientAdapter implements IPlatformClient {
  readonly platformName = 'ubereats';

  async fetchOrders(params: FetchOrdersParams): Promise<RawOrderData[]> { ... }
  async authenticate(credentials: PlatformCredentials): Promise<AuthToken> { ... }
}
```

Registrar no módulo:
```ts
{ provide: 'PLATFORM_CLIENTS', useClass: UberEatsClientAdapter, multi: true }
```

---

## 🧪 Padrão de Testes

Toda função criada **deve** ter um arquivo `.spec.ts` correspondente:

```
src/
├── application/use-cases/ExtractOrdersUseCase.ts
├── application/use-cases/ExtractOrdersUseCase.spec.ts
├── adapters/out/platforms/ifood/IfoodClientAdapter.ts
├── adapters/out/platforms/ifood/IfoodClientAdapter.spec.ts
```

Padrão de teste de Use Case:
```ts
describe('ExtractOrdersUseCase', () => {
  let useCase: ExtractOrdersUseCase;
  let mockPlatformClient: jest.Mocked<IPlatformClient>;

  beforeEach(() => {
    mockPlatformClient = { fetchOrders: jest.fn(), authenticate: jest.fn(), platformName: 'mock' };
    useCase = new ExtractOrdersUseCase(mockPlatformClient);
  });

  it('should extract orders successfully', async () => { ... });
  it('should throw when platform returns empty', async () => { ... });
  it('should propagate authentication errors', async () => { ... });
});
```

---

## 🔒 Boas Práticas de Segurança Contínua

```bash
# Antes de cada merge/PR
npm audit --audit-level=moderate

# Verificar se lockfile foi adulterado
npm ci  # sempre em CI/CD, nunca npm install

# Verificar assinatura de pacotes novos
npm view <pacote> dist-tags
npm view <pacote>@<versão> integrity

# Nunca usar latest em produção — sempre fixar versão
```

**CI/CD obrigatório:**
```yaml
# .github/workflows/security.yml
- name: Install dependencies (lockfile enforced)
  run: npm ci

- name: Security audit
  run: npm audit --audit-level=high

- name: Run tests with coverage
  run: npm run test:cov
```

---

## 📋 Checklist de Nova Implementação

Ao adicionar qualquer funcionalidade:

- [ ] Interface/Port definida em `application/ports/`
- [ ] Use Case implementado em `application/use-cases/`
- [ ] Adapter em `adapters/in/` ou `adapters/out/`
- [ ] DTO com validação via `class-validator` se entrada HTTP
- [ ] Arquivo `.spec.ts` criado com cobertura 100% das funções
- [ ] Nenhum uso de `any` (o build falhará se houver)
- [ ] `npm audit` executado após instalar pacote novo
- [ ] Versão do pacote novo pesquisada no Snyk antes de instalar

---

*Última atualização: 31/03/2026 — Inclui alerta crítico axios supply chain attack*
