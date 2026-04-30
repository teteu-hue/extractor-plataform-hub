# Fluxo Manual: Criar Pedido de Teste no Mercado Livre

> Guia passo a passo para criar usuários de teste, publicar produto, simular compra
> e consultar o pedido via `/orders/search` — tudo necessário para validar o extractor
> antes de implementar no código.

**Pré-requisito:** `ACCESS_TOKEN` válido da sua aplicação (auth já feita).

**Importante:** O Mercado Livre **não tem sandbox**. Os testes são feitos com usuários
de teste no ambiente de produção. Todas as transações devem ser **entre usuários de teste**.

---

## Passo 0 — Obter ACCESS_TOKEN da aplicação

Abra no browser (logado com sua conta real ML, dona da aplicação):

```
https://auth.mercadolibre.com/authorization?response_type=code&client_id=$APP_ID&redirect_uri=$REDIRECT_URI
```

Após autorizar, copie o `code` da URL de redirect e troque por token:

```bash
curl -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&client_id=$APP_ID&client_secret=$APP_SECRET&code=$CODE&redirect_uri=$REDIRECT_URI" \
  https://api.mercadolibre.com/oauth/token
```

Guarde o `access_token` da resposta como `$ACCESS_TOKEN`.

---

## Passo 1 — Criar 2 usuários de teste (vendedor + comprador)

Crie **dois** usuários de teste. Um será o vendedor, outro o comprador.

```bash
# Usuário VENDEDOR
curl -X POST \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"site_id": "MLB"}' \
  https://api.mercadolibre.com/users/test_user
```

Exemplo de resposta:

```json
{
  "id": 120506781,
  "nickname": "TEST0548",
  "password": "qatest328",
  "site_status": "active"
}
```

Repita para o **comprador**:

```bash
# Usuário COMPRADOR
curl -X POST \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"site_id": "MLB"}' \
  https://api.mercadolibre.com/users/test_user
```

**Salve as credenciais** — não há como recuperar depois. Agora você tem:

- `$SELLER_ID` / `$SELLER_NICKNAME` / `$SELLER_PASSWORD`
- `$BUYER_ID` / `$BUYER_NICKNAME` / `$BUYER_PASSWORD`

### Considerações

- Máximo de **10 usuários de teste** por conta ML.
- Inativos por **60 dias** são removidos automaticamente.
- Senha perdida = criar novo usuário (não tem recuperação).
- Código de verificação de e-mail = **últimos dígitos do user_id** (4 ou 6 dígitos).

---

## Passo 2 — Obter tokens dos usuários de teste

Cada usuário de teste precisa do **seu próprio** `ACCESS_TOKEN`.

**2a.** Abra no browser (em aba anônima para não conflitar sessões):

```
https://auth.mercadolibre.com/authorization?response_type=code&client_id=$APP_ID&redirect_uri=$REDIRECT_URI
```

- Faça login com `$SELLER_NICKNAME` e `$SELLER_PASSWORD`
- Copie o `code` da URL de redirect

**2b.** Troque o code por token:

```bash
# Token do VENDEDOR
curl -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&client_id=$APP_ID&client_secret=$APP_SECRET&code=$SELLER_CODE&redirect_uri=$REDIRECT_URI" \
  https://api.mercadolibre.com/oauth/token
```

Guarde como `$SELLER_TOKEN`.

**2c.** Repita o processo para o **comprador** (aba anônima, login com buyer) e guarde como `$BUYER_TOKEN`.

---

## Passo 3 — Publicar produto de teste (com token do vendedor)

A categoria `MLB1227` (livros / similares) impõe regras extras: quantidade máxima **1** para `condition: new` + `listing_type_id: free`, e atributos obrigatórios (`PUBLISHER`, `TITLE`). Se a API retornar `validation_error`, leia o array `cause` — cada entrada explica o que ajustar.

```bash
curl -X POST \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Item de Teste – Por favor, NÃO OFERTAR!",
    "category_id": "MLB1227",
    "price": 59.90,
    "currency_id": "BRL",
    "available_quantity": 1,
    "buying_mode": "buy_it_now",
    "listing_type_id": "free",
    "condition": "new",
    "attributes": [
      { "id": "PUBLISHER", "value_name": "Editora Teste API" },
      { "id": "TITLE", "value_name": "Item de Teste – Por favor, NÃO OFERTAR!" }
    ],
    "pictures": [
      {"source": "https://http2.mlstatic.com/D_NQ_NP_2X_602135-MLA31003306509_062019-F.webp"}
    ]
  }' \
  https://api.mercadolibre.com/items
```

Para outra categoria, consulte atributos obrigatórios antes de publicar:

```bash
curl -s "https://api.mercadolibre.com/categories/$CATEGORY_ID/attributes" | head
```

### Regras obrigatórias para anúncios de teste

| Regra | Motivo |
|  ---  |  ---   |
| Título contém **"Item de Teste – Por favor, NÃO OFERTAR!"** | Identificar como teste, evitar compras reais |
| `listing_type_id` = **`free`** | Não aparecer na home do ML |
| `category_id` = **`MLB1227`** | Exemplo usado no guia (livros); **ajuste** `attributes` se trocar de categoria |
| `available_quantity` conforme limite da categoria | Ex.: para `MLB1227` + `new` + `free`, o máximo é **1** |
| `attributes` com IDs exigidos pela categoria | Ex.: `PUBLISHER` e `TITLE` para `MLB1227` no marketplace |

Guarde o `$ITEM_ID` da resposta (ex: `"id": "MLB1234567890"`).

Confirme que o item foi criado:

```bash
curl -X GET \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  https://api.mercadolibre.com/items/$ITEM_ID
```

---

## Passo 4 — Comprar o produto (com o usuário comprador)

A compra **não pode ser feita puramente via API REST** — o ML exige checkout web.

**4a.** Abra o anúncio no browser, **logado como o comprador de teste** (use aba anônima para não misturar com sua conta real).

Use **sempre** o campo **`permalink`** completo devolvido pelo `POST /items` ou pelo `GET /items/$ITEM_ID` — é uma URL já pronta, por exemplo:

```
https://produto.mercadolivre.com.br/MLB-1234567890-item-de-teste-por-favor-nao-ofertar-_JM
```

**Não** monte a URL só com o `id` colado após `produto.mercadolivre.com.br/` sem o slug (`-titulo-_JM`). Isso pode redirecionar errado.

Alternativa aceita pelo site (substitua pelo seu `id` numérico do item):

```
https://www.mercadolivre.com.br/item/MLB-1234567890
```

(alguns IDs usam hífen `MLB-1234567890` na URL — use exatamente o que vier no `permalink` ou no `id` da API.)

**4b.** Clique em **"Comprar agora"** e siga o checkout.

### Se você cai em `lista.mercadolivre.com.br/.../outros/#redirectedFromVip`

Isso costuma significar que o site **não abriu a página do anúncio** e te jogou para a listagem da categoria. Confira:

1. **`status` do item** — no `GET /items/$ITEM_ID`, o `status` precisa ser **`active`**. Se estiver `paused` ou outro, reative ou publique de novo.
2. **URL correta** — copie o **`permalink`** inteiro da resposta da API; não invente a URL manualmente.
3. **Sessão** — faça login com o **usuário comprador de teste** antes de abrir o link. Se aparecer “acesse sua conta”, o fluxo de compra não segue.
4. **Anúncio `free` + teste** — em alguns casos o ML altera o fluxo; se continuar falhando, abra **Minhas publicações** logado como **vendedor de teste** no site e clique em **Ver publicação** no anúncio; use esse link ou compartilhe com o comprador de teste.

**4c.** Na hora do pagamento, use um **cartão de teste**:

| Bandeira | Número | CVV | Vencimento |
|---|---|---|---|
| Visa | `4235 6477 2802 5682` | `123` | `11/30` |
| Mastercard | `5031 4332 1540 6351` | `123` | `11/30` |
| Elo | `5067 7667 8388 8311` | `123` | `11/30` |

**4d.** No **nome do titular** do cartão, use um código para simular o resultado:

| Nome do titular | Resultado |
|---|---|
| `APRO APRO` | Pagamento **aprovado** (pedido fica `paid`) |
| `CONT CONT` | Pagamento **pendente** |
| `FUND FUND` | Saldo **insuficiente** |

Use **`APRO APRO`** para que o pedido fique com status `paid`.

**4e.** E-mail: use `test@testuser.com`

**4f.** Código de verificação de e-mail: **últimos dígitos** do `$BUYER_ID` (4 ou 6 dígitos).
Exemplo: se o ID for `653764425`, o código é `764425`.

---

## Passo 5 — Consultar o pedido via /orders/search

Com o token do **vendedor**, busque os pedidos:

```bash
# Listar todos os pedidos do vendedor
curl -X GET \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  "https://api.mercadolibre.com/orders/search?seller=$SELLER_ID"
```

Filtrar por data:

```bash
curl -X GET \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  "https://api.mercadolibre.com/orders/search?seller=$SELLER_ID&order.date_created.from=2026-04-08T00:00:00.000-03:00&order.date_created.to=2026-04-09T00:00:00.000-03:00"
```

Buscar pedido específico:

```bash
curl -X GET \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  "https://api.mercadolibre.com/orders/$ORDER_ID"
```

A resposta do `/orders/search` é exatamente o que o `MercadoLivreClientAdapter` vai consumir — os campos mapeiam diretamente para os DTOs em `MercadoLivreDto.ts`.

---

## Resumo das variáveis

| Variável | De onde vem |
|---|---|
| `$ACCESS_TOKEN` | Passo 0 — token da sua app |
| `$APP_ID` | Client ID da app no ML (`.env` → `MERCADOLIVRE_CLIENT_ID`) |
| `$APP_SECRET` | Client Secret da app (`.env` → `MERCADOLIVRE_CLIENT_SECRET`) |
| `$REDIRECT_URI` | URL de redirect (`.env` → `MERCADOLIVRE_REDIRECT_URI`) |
| `$SELLER_ID` / `$SELLER_TOKEN` | Passo 1 + Passo 2 |
| `$BUYER_ID` / `$BUYER_TOKEN` | Passo 1 + Passo 2 |
| `$ITEM_ID` | Resposta do Passo 3 |
| `$ORDER_ID` | Resposta do Passo 5 |

---

## Referências

- [Realização de testes](https://developers.mercadolivre.com.br/pt_br/realizacao-de-testes)
- [Publicar produtos](https://developers.mercadolivre.com.br/pt_br/publicacao-de-produtos)
- [Order Management](https://developers.mercadolivre.com.br/en_us/order-management)
- [Cartões de teste (Mercado Pago)](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-v2/integration-test/cards)
