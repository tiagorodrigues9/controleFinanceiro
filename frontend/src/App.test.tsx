import React from 'react';
import { render } from '@testing-library/react';

// Um teste de sanidade simples para garantir que o Jest está configurado corretamente
// no Create React App e não falhar o CI com "No tests found".
describe('Sanity Check', () => {
  it('true is truthy', () => {
    expect(true).toBe(true);
  });
});
