// Teste manual da API para verificar dados de mesesComparacao
fetch('http://localhost:5000/api/dashboard?mes=1&ano=2026')
  .then(response => response.json())
  .then(data => {
    console.log('Dados completos:', data);
    console.log('mesesComparacao:', data.mesesComparacao);
    console.log('Length mesesComparacao:', data.mesesComparacao?.length);
  })
  .catch(error => console.error('Erro:', error));
