# Visão Geral da API

A API do Controle Financeiro é construída com **Node.js** e **Express**, seguindo os princípios de design **RESTful**.

---

## Base URL

Em desenvolvimento, a API roda localmente na porta 5000:

```
http://localhost:5000/api
```

---

## Autenticação

A maioria dos endpoints requer autenticação. A API utiliza **JWT (JSON Web Tokens)**.

Você deve incluir o seu *Access Token* no header `Authorization` de todas as requisições para rotas protegidas:

```http
Authorization: Bearer <seu_access_token_aqui>
```

Se o token expirar, a API retornará `401 Unauthorized`. Você deve então usar a rota de *Refresh Token* para obter um novo token de acesso.

---

## Formato de Respostas

A API retorna dados no formato JSON.

### Resposta de Sucesso (2xx)

```json
{
  "sucesso": true,
  "dados": { ... },
  "mensagem": "Operação realizada com sucesso." (opcional)
}
```

### Resposta de Erro (4xx, 5xx)

```json
{
  "sucesso": false,
  "erro": "Descrição amigável do erro.",
  "detalhes": [ ... ] (opcional, comum em erros de validação)
}
```

---

## Swagger UI

A documentação iterativa completa da API, onde você pode testar os endpoints diretamente no navegador, está disponível através do Swagger UI.

Com o servidor backend rodando localmente, acesse:

[http://localhost:5000/api-docs](http://localhost:5000/api-docs)

---

## Paginação

Endpoints que retornam listas grandes (como contas, gastos, extrato) suportam paginação via query parameters:

- `page`: Número da página (padrão: 1)
- `limit`: Quantidade de itens por página (padrão: 50)

As respostas paginadas incluem headers customizados:
- `X-Total-Count`: Total absoluto de itens que correspondem aos filtros.
- `X-Total-Pages`: Total de páginas disponíveis.
