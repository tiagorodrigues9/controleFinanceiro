/**
 * Calcula as datas de fechamento, vencimento e mês de referência de uma fatura de cartão.
 * 
 * @param {Date} dataReferencia - A data da compra/gasto
 * @param {number} diaFechamento - O dia do mês em que a fatura fecha (ex: 24)
 * @param {number} diaVencimento - O dia do mês em que a fatura vence (ex: 27)
 * @returns {{ dataVencimento: Date, dataFechamento: Date, mesReferencia: string }}
 */
function calcularDatasFatura(dataReferencia, diaFechamento, diaVencimento) {
  const data = new Date(dataReferencia);
  
  const anoCompra = data.getFullYear();
  const mesCompra = data.getMonth(); // 0-indexed
  const diaCompra = data.getDate();
  
  const diaFech = diaFechamento || 25;
  const diaVenc = diaVencimento || (diaFech + 3 > 28 ? 5 : diaFech + 3); // fallback
  
  let mesFatura = mesCompra;
  let anoFatura = anoCompra;
  
  if (diaCompra > diaFech) {
    // Compra depois do fechamento → fatura do próximo mês
    mesFatura = mesCompra + 1;
    if (mesFatura > 11) {
      mesFatura = 0;
      anoFatura++;
    }
  }
  
  // Data de fechamento da fatura
  const dataFechamento = new Date(Date.UTC(anoFatura, mesFatura, diaFech, 12, 0, 0));
  
  // Data de vencimento da fatura
  let mesVenc = mesFatura;
  let anoVenc = anoFatura;
  if (diaVenc <= diaFech) {
    // Vencimento no mês seguinte
    mesVenc = mesFatura + 1;
    if (mesVenc > 11) {
      mesVenc = 0;
      anoVenc++;
    }
  }
  
  const dataVencimento = new Date(Date.UTC(anoVenc, mesVenc, diaVenc, 12, 0, 0));
  
  const mesStr = String(mesFatura + 1).padStart(2, '0');
  const mesReferencia = `${anoFatura}-${mesStr}`;
  
  return { dataVencimento, dataFechamento, mesReferencia };
}

/**
 * Retorna as datas de inicio e fim de vigencia para filtrar os gastos que compõem uma fatura.
 */
function obterPeriodoFatura(dataFechamentoAtual) {
  // O inicio dos gastos da fatura atual começa 1 segundo depois do fechamento do mes passado
  const dataInicio = new Date(dataFechamentoAtual);
  dataInicio.setMonth(dataInicio.getMonth() - 1);
  dataInicio.setSeconds(dataInicio.getSeconds() + 1);
  return { start: dataInicio, end: dataFechamentoAtual };
}

/**
 * Busca a fatura do cartão para o mês correspondente. Se não houver, cria uma base.
 * Agora utiliza o `calcularDatasFatura` avançando 15 dias de segurança para forçar o fechamento seguinte
 * sem cair em armadilhas de meses de 28/31 dias no Javascript puro.
 */
async function buscarOuCriarFaturaAberta(cartao, usuarioId, baseDataReferencia) {
  const FaturaCartao = require('../models/FaturaCartao');
  
  let dataRefAtual = new Date(baseDataReferencia);
  let iteracoes = 0;

  while (iteracoes < 24) { // Proteção de loop infinito
    const { dataVencimento, dataFechamento, mesReferencia } = calcularDatasFatura(
      dataRefAtual, 
      cartao.diaFatura, 
      cartao.diaVencimento
    );

    let fatura = await FaturaCartao.findOne({
      cartao: cartao._id,
      mesReferencia: mesReferencia,
      usuario: usuarioId
    });

    if (fatura && (fatura.status === 'Fechada' || fatura.status === 'Paga')) {
      // Se esta fatura já está fechada/paga, a nova despesa ou fatura alvo tem que pular pra próxima
      // Somar 20 dias com segurança no objeto Date faz ele pular o mês com perfeição sem cair no bug do dia 31
      dataRefAtual = new Date(dataFechamento);
      dataRefAtual.setDate(dataRefAtual.getDate() + 10);
      iteracoes++;
    } else {
      // Encontrou uma fatura Aberta (ou null, onde criamos uma nova perfeita)
      if (!fatura) {
        fatura = new FaturaCartao({
          cartao: cartao._id,
          usuario: usuarioId,
          mesReferencia: mesReferencia,
          dataVencimento: dataVencimento,
          dataFechamento: dataFechamento
        });
        await fatura.save(); // Salva a casca base
      }
      return fatura;
    }
  }
  throw new Error("Erro catastrófico ao iterar meses de fatura");
}

module.exports = { calcularDatasFatura, buscarOuCriarFaturaAberta, obterPeriodoFatura };
