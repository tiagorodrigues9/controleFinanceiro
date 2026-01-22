// Script para testar a API do dashboard diretamente
fetch('http://localhost:5000/api/dashboard?mes=1&ano=2026', {
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3ODJkZmI3ZjQ5ZjkxM2E3ZmNhNTgwOSIsImVtYWlsIjoidGlhZ29AZW1haWwuY29tIiwiaWF0IjoxNzM3NTk0MzIxLCJleHAiOjE3Mzc2ODA3MjF9.invalid'
  }
})
.then(response => response.json())
.then(data => {
  console.log('Dados completos:', data);
  console.log('graficoBarrasTiposDespesa:', data.graficoBarrasTiposDespesa);
  console.log('relatorioTiposDespesa:', data.relatorioTiposDespesa);
})
.catch(error => console.error('Erro:', error));
