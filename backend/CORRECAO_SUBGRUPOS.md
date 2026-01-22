# 🔧 Correção do Relatório Detalhado por Tipo de Despesa

## ❌ **Problema Identificado**

### **O que estava acontecendo:**
- O relatório mostrava os grupos principais com valores corretos
- Ao clicar em um grupo, os subgrupos não apareciam
- O campo `subgrupos: []` estava sempre vazio

### **Causa do Problema:**
Na linha 742 do `api/dashboard.js`:
```javascript
relatorioTiposDespesa: relatorioTiposDespesa.map(item => ({
  grupoId: item._id,
  grupoNome: item.grupoNome || 'Sem Categoria',
  totalGrupo: item.totalGrupo || 0,
  quantidade: item.quantidade || 0,
  percentualGrupo: 0,
  subgrupos: []  // ❌ SEMPRE VAZIO!
}))
```

## ✅ **Solução Implementada**

### **1. Substituído o aggregate simples por lógica completa:**

#### **Antes (Simplificado):**
```javascript
const relatorioTiposDespesa = await Gasto.aggregate([
  {
    $match: {
      usuario: new mongoose.Types.ObjectId(req.user._id),
      data: { $gte: startDate, $lte: endDate }
    }
  },
  {
    $group: {
      _id: '$tipoDespesa.grupo',
      totalGrupo: { $sum: '$valor' },
      quantidade: { $sum: 1 }
    }
  },
  // ... lookup para nomes
]);
```

#### **Depois (Completo com Subgrupos):**
```javascript
// 1. Buscar todos os grupos do usuário
const grupos = await Grupo.find({ 
  usuario: new mongoose.Types.ObjectId(req.user._id) 
});

// 2. Calcular total geral para percentuais
const totalGeralResult = await Gasto.aggregate([
  {
    $match: {
      usuario: new mongoose.Types.ObjectId(req.user._id),
      data: { $gte: startDate, $lte: endDate }
    }
  },
  {
    $group: {
      _id: null,
      total: { $sum: '$valor' }
    }
  }
]);

const totalGeral = totalGeralResult[0]?.total || 0;

// 3. Para cada grupo, buscar gastos com subgrupos
const relatorioTiposDespesaDetalhado = await Promise.all(
  grupos.map(async (grupo) => {
    // Aggregate para buscar gastos do grupo com subgrupos
    const gastosGrupo = await Gasto.aggregate([
      {
        $match: {
          usuario: new mongoose.Types.ObjectId(req.user._id),
          'tipoDespesa.grupo': grupo._id,
          data: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$tipoDespesa.subgrupo',
          valor: { $sum: '$valor' },
          quantidade: { $sum: 1 }
        }
      },
      {
        $sort: { valor: -1 }
      }
    ]);
    
    // Se não houver gastos, retornar null
    if (gastosGrupo.length === 0) {
      return null;
    }
    
    // Calcular total do grupo
    const totalGrupo = gastosGrupo.reduce((acc, item) => acc + item.valor, 0);
    
    // Processar subgrupos com percentuais
    const subgrupos = gastosGrupo.map(item => ({
      subgrupoNome: item._id || 'Não categorizado',
      valor: item.valor,
      quantidade: item.quantidade,
      percentualSubgrupo: totalGrupo > 0 ? (item.valor / totalGrupo) * 100 : 0
    }));
    
    return {
      grupoId: grupo._id,
      grupoNome: grupo.nome,
      totalGrupo: totalGrupo,
      quantidade: gastosGrupo.reduce((acc, item) => acc + item.quantidade, 0),
      percentualGrupo: totalGeral > 0 ? (totalGrupo / totalGeral) * 100 : 0,
      subgrupos: subgrupos  // ✅ DADOS REAIS!
    };
  })
);

// 4. Filtrar e ordenar
const relatorioTiposDespesa = relatorioTiposDespesaDetalhado
  .filter(item => item !== null && item.totalGrupo > 0)
  .sort((a, b) => b.totalGrupo - a.totalGrupo);
```

### **2. Corrigida a saída do relatório:**

#### **Antes:**
```javascript
relatorioTiposDespesa: relatorioTiposDespesa.map(item => ({
  // ... outros campos
  subgrupos: []  // ❌ Sempre vazio
})),
```

#### **Depois:**
```javascript
relatorioTiposDespesa: relatorioTiposDespesa,  // ✅ Dados completos
```

## 📊 **Estrutura Esperada Agora**

### **Saída Completa com Subgrupos:**
```json
[
  {
    "grupoId": "507f1f77bcf86cd799439011",
    "grupoNome": "Alimentação",
    "totalGrupo": 1500.00,
    "quantidade": 15,
    "percentualGrupo": 35.5,
    "subgrupos": [
      {
        "subgrupoNome": "Restaurante",
        "valor": 800.00,
        "quantidade": 8,
        "percentualSubgrupo": 53.3
      },
      {
        "subgrupoNome": "Supermercado",
        "valor": 500.00,
        "quantidade": 5,
        "percentualSubgrupo": 33.3
      },
      {
        "subgrupoNome": "Lanche",
        "valor": 200.00,
        "quantidade": 2,
        "percentualSubgrupo": 13.3
      }
    ]
  }
]
```

## 🎯 **Como Funciona Agora**

### **1. Para cada grupo do usuário:**
- Busca todos os gastos daquele grupo no período
- Agrupa por subgrupo (`$tipoDespesa.subgrupo`)
- Calcula totais e quantidades

### **2. Para cada subgrupo:**
- **Valor**: Soma de todos os gastos do subgrupo
- **Quantidade**: Número de transações
- **Percentual**: `(valor_subgrupo / valor_grupo) * 100`

### **3. Para cada grupo:**
- **Total Grupo**: Soma de todos os subgrupos
- **Percentual Grupo**: `(valor_grupo / valor_total_geral) * 100`
- **Subgrupos**: Array com detalhes de cada subgrupo

## ✅ **Resultados Esperados**

### **Ao clicar em um grupo, o usuário verá:**
1. **Nome do grupo** (ex: "Alimentação")
2. **Valor total do grupo** (ex: R$ 1.500,00)
3. **Percentual do total geral** (ex: 35.5%)
4. **Lista de subgrupos com:**
   - **Nome do subgrupo** (ex: "Restaurante")
   - **Valor do subgrupo** (ex: R$ 800,00)
   - **Quantidade de transações** (ex: 8)
   - **Percentual dentro do grupo** (ex: 53.3%)

## 🔄 **Teste Disponível**

Foi criado o arquivo `test-subgrupos.js` para testar a funcionalidade dos subgrupos.

## 📝 **Resumo**

**Problema**: Subgrupos não apareciam ao clicar nos grupos
**Causa**: Array `subgrupos` sempre vazio
**Solução**: Implementada lógica completa para buscar e processar subgrupos
**Resultado**: Relatório detalhado funcionando com subgrupos, valores e percentuais

**Status**: ✅ **Corrigido e funcionando!**
