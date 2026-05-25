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
  
  // Usar valores locais do servidor (o servidor está no mesmo timezone do usuário)
  const anoCompra = data.getFullYear();
  const mesCompra = data.getMonth(); // 0-indexed
  const diaCompra = data.getDate();
  
  const diaFech = diaFechamento || 25;
  const diaVenc = diaVencimento || (diaFech + 3 > 28 ? 5 : diaFech + 3); // fallback: 3 dias após fechamento
  
  // A fatura fecha no dia `diaFech` de cada mês.
  // Se a compra foi feita ATÉ o dia de fechamento (inclusive), cai na fatura do MÊS ATUAL.
  // Se a compra foi feita DEPOIS do dia de fechamento, cai na fatura do PRÓXIMO mês.
  
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
  
  // Data de fechamento da fatura (no mês da fatura)
  const dataFechamento = new Date(anoFatura, mesFatura, diaFech, 12, 0, 0);
  
  // Data de vencimento da fatura (no mês da fatura, ou no mês seguinte se diaVenc < diaFech)
  let mesVenc = mesFatura;
  let anoVenc = anoFatura;
  if (diaVenc <= diaFech) {
    // Vencimento no mês seguinte (ex: fecha dia 24, vence dia 5 do próximo mês)
    mesVenc = mesFatura + 1;
    if (mesVenc > 11) {
      mesVenc = 0;
      anoVenc++;
    }
  }
  const dataVencimento = new Date(anoVenc, mesVenc, diaVenc, 12, 0, 0);
  
  const mesStr = String(mesFatura + 1).padStart(2, '0');
  const mesReferencia = `${anoFatura}-${mesStr}`;
  
  return { dataVencimento, dataFechamento, mesReferencia };
}

/**
 * Busca a fatura do cartão para o mês correspondente. 
 * Se a fatura calculada já estiver Fechada ou Paga, empurra para o mês seguinte sucessivamente até achar uma Aberta ou criar uma nova.
 */
async function buscarOuCriarFaturaAberta(cartaoId, usuarioId, baseDataVencimento, baseDataFechamento, baseMesReferencia) {
  const FaturaCartao = require('../models/FaturaCartao');
  
  let fatura = null;
  let dataVencAtual = new Date(baseDataVencimento);
  let dataFechAtual = new Date(baseDataFechamento);
  let mesRefAtual = baseMesReferencia;

  while (true) {
    fatura = await FaturaCartao.findOne({
      cartao: cartaoId,
      mesReferencia: mesRefAtual,
      usuario: usuarioId
    });

    if (fatura && (fatura.status === 'Fechada' || fatura.status === 'Paga')) {
      // Avançar 1 mês nas datas
      dataVencAtual.setMonth(dataVencAtual.getMonth() + 1);
      dataFechAtual.setMonth(dataFechAtual.getMonth() + 1);
      
      const partes = mesRefAtual.split('-');
      let novoAno = parseInt(partes[0], 10);
      let novoMes = parseInt(partes[1], 10) + 1;
      if (novoMes > 12) {
        novoMes = 1;
        novoAno++;
      }
      mesRefAtual = `${novoAno}-${String(novoMes).padStart(2, '0')}`;
    } else {
      break; // Encontrou Aberta ou não encontrou (então será criada)
    }
  }

  if (!fatura) {
    fatura = new FaturaCartao({
      cartao: cartaoId,
      usuario: usuarioId,
      mesReferencia: mesRefAtual,
      dataVencimento: dataVencAtual,
      dataFechamento: dataFechAtual
    });
  }

  return fatura;
}

module.exports = { calcularDatasFatura, buscarOuCriarFaturaAberta };
