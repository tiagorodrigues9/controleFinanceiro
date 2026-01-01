# 📧 Configuração Outlook - Guia Completo

## 🎯 Por que Outlook?
- ✅ **Gratuito** - Sem custo
- ✅ **Senha normal** - Não precisa de App Password
- ✅ **Configuração simples** - Menos passos que Gmail
- ✅ **Funciona bem** - Com configuração correta

## 🚀 Configuração Passo a Passo

### **1. Criar Conta Outlook (se não tiver)**
1. Acesse: https://outlook.live.com/
2. Criar conta gratuita
3. Verifique e-mail

### **2. Configurar no Render.com**
No backend service > Environment:

```bash
# Remover modo desenvolvimento
# EMAIL_DEV_MODE=true  <-- Remova esta linha

# Configurar Outlook
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=seu_email@outlook.com
EMAIL_PASS=sua_senha_normal
EMAIL_FROM=Controle Financeiro <seu_email@outlook.com>
FRONTEND_URL=https://controlefinanceiro.onrender.com
```

### **3. Fazer Deploy**
```bash
git add .
git commit -m "Configurar Outlook para produção"
git push origin main
```

## 🔧 Configurações Alternativas (se a principal não funcionar)

### **Opção A: Office365**
```bash
EMAIL_HOST=smtp.office365.com
EMAIL_PORT=587
EMAIL_USER=seu_email@outlook.com
EMAIL_PASS=sua_senha_normal
```

### **Opção B: Porta 25**
```bash
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=25
EMAIL_USER=seu_email@outlook.com
EMAIL_PASS=sua_senha_normal
```

### **Opção C: SSL (porta 465)**
```bash
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=465
EMAIL_USER=seu_email@outlook.com
EMAIL_PASS=sua_senha_normal
```

## 📋 Variáveis Finais

```bash
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=seu_email@outlook.com
EMAIL_PASS=sua_senha_normal
EMAIL_FROM=Controle Financeiro <seu_email@outlook.com>
FRONTEND_URL=https://controlefinanceiro.onrender.com
# EMAIL_DEV_MODE=  # Remover ou deixar vazio
```

## 🧪 Teste

Após deploy, teste forgot password:
- ✅ E-mail real enviado
- ✅ Link correto para produção
- ✅ Sem timeout (configuração otimizada)

## 🔍 Logs Esperados

```
✅ EmailService configurado com Outlook (smtp-mail.outlook.com:587)
📧 Tentando enviar e-mail via Outlook...
✅ E-mail enviado com sucesso via Outlook
```

## 🚨 Se Ainda Der Timeout

1. **Tente Office365**: `EMAIL_HOST=smtp.office365.com`
2. **Tente porta 25**: `EMAIL_PORT=25`
3. **Verifique senha**: Confirme senha correta
4. **Verifique e-mail**: Use e-mail @outlook.com válido

## 🎉 Resultado

Você receberá e-mail real com:
- ✅ Link correto: `https://controlefinanceiro.onrender.com/reset-password/...`
- ✅ Funciona em produção
- ✅ Sem localhost
- ✅ Sem erros 500
