import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminApp } from '../../src/features/admin/AdminApp';

const product = { codigo: '1', nome: 'Cubo infinito', descricao: 'Sensorial', valor: 19.9, imagens: [], categorias: ['Brinquedos'] };

describe('painel administrativo', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ produtos: [product] }) }));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('carrega e pesquisa por nome ou código', async () => {
    const user = userEvent.setup();
    render(<AdminApp />);
    expect(await screen.findByText('Cubo infinito')).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox'), 'inexistente');
    expect(screen.getByText('Nenhum produto encontrado.')).toBeInTheDocument();
  });

  it('adiciona um produto válido ao rascunho local', async () => {
    const user = userEvent.setup();
    render(<AdminApp />);
    await screen.findByText('Cubo infinito');
    await user.click(screen.getByRole('button', { name: /novo produto/i }));
    await user.type(screen.getByLabelText('Código'), '3');
    await user.type(screen.getByLabelText('Nome'), 'Estrela');
    await user.type(screen.getByLabelText('Valor (R$)'), '15');
    await user.click(screen.getByRole('checkbox', { name: 'Jogos' }));
    await user.click(screen.getByRole('button', { name: 'Salvar produto' }));
    expect(await screen.findByText('Estrela')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('clubeDoLeo.admin.draft') ?? '[]')).toHaveLength(2);
  });
});
