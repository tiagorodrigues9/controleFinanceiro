# Exportação de Relatórios

O sistema oferece recursos nativos de geração de relatórios e exportação de dados, úteis para contabilidade ou fechamento financeiro pessoal.

---

## Formatos Suportados

- **PDF**: Relatórios formatados para leitura e impressão, com tabelas e totais. (Gerados via `PDFKit` no backend).
- **Excel (.xlsx)**: Arquivos de planilha, ideais para se você quiser aplicar suas próprias fórmulas em cima dos dados do sistema. (Gerados via `ExcelJS` no backend).

---

## O que pode ser exportado?

Atualmente as seguintes visões possuem suporte à exportação de dados:

1. **Extrato Bancário**: Você pode filtrar as movimentações de um mês de uma conta bancária e exportar o relatório consolidado de entradas e saídas.
2. **Contas a Pagar/Receber**: A listagem de contas pode ser exportada, aplicando os filtros selecionados na tela (ex: Apenas contas pendentes do fornecedor X).

---

## Como Exportar

Nas telas que suportam exportação, haverá um botão de ações com as opções "Exportar PDF" e "Exportar Excel". Ao clicar, o download do arquivo será iniciado diretamente no seu navegador.
