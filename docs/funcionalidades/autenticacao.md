# Autenticação

O sistema utiliza **JSON Web Tokens (JWT)** com uma arquitetura de dois tokens: **Access Token** e **Refresh Token**. Essa abordagem garante alta segurança (tokens de acesso expiram rápido) mantendo uma excelente experiência de usuário (usuário não precisa logar frequentemente).

---

## Como Funciona

1. **Login**: O usuário envia e-mail e senha.
2. **Geração de Tokens**: Se as credenciais estiverem corretas, o servidor gera:
    - **Access Token**: Token de curta duração (ex: 15 minutos), usado em cada requisição para acessar rotas protegidas.
    - **Refresh Token**: Token de longa duração (ex: 7 dias), armazenado de forma segura e usado para solicitar novos Access Tokens.
3. **Uso do Access Token**: O frontend envia o Access Token no header `Authorization: Bearer <token>` em todas as chamadas à API.
4. **Renovação**: Quando o Access Token expira, as chamadas à API falham com status `401 Unauthorized`. O frontend, automaticamente através de interceptores do Axios, intercepta esse erro e envia o Refresh Token para a rota `/api/auth/refresh-token`.
5. **Novo Access Token**: Se o Refresh Token for válido, a API retorna um novo Access Token. O frontend atualiza seu estado e retenta a requisição original falha.

---

## Funcionalidades

- **Login**: Autenticação com e-mail e senha.
- **Cadastro**: Criação de novas contas com validação de dados.
- **Recuperação de Senha**: Fluxo de "Esqueci minha senha" com envio de token temporário por e-mail para redefinição.
- **Logout**: Invalidação dos tokens e limpeza do estado do frontend.

---

## Segurança

- As senhas são criptografadas (hash) usando **bcrypt** antes de serem salvas no banco de dados.
- Limite de taxa (Rate Limiting) mais rigoroso aplicado às rotas de autenticação para prevenir ataques de força bruta.
