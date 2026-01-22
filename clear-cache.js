fetch('http://localhost:5000/api/dashboard/clear-cache', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3ODJkZmI3ZjQ5ZjkxM2E3ZmNhNTgwOSIsImVtYWlsIjoidGlhZ29AZW1haWwuY29tIiwiaWF0IjoxNzM3NTk0MzIxLCJleHAiOjE3Mzc2ODA3MjF9.invalid'
  }
}).then(r => r.json()).then(console.log);
