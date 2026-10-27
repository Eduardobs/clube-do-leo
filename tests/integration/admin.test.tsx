import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminApp } from '../../src/features/admin/AdminApp';

const product = { codigo: '1', nome: 'Cubo infinito', descricao: 'Sensorial', valor: 19.9, imagens: [], categorias: ['Brinquedos'] };

describe('painel administrativo', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ produtos: [product] }) }));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('ordena os códigos numericamente e mantém a ordem na busca', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ produtos: [10, 2, 1].map(codigo => ({ ...product, codigo, nome: `Produto ${codigo}` })) }) } as Response);
    const user = userEvent.setup();
    render(<AdminApp />);
    await screen.findByText('Produto 10');
    const codes = () => screen.getAllByRole('row').slice(1).map(row => within(row).getAllByRole('cell')[1].textContent);
    expect(codes()).toEqual(['1', '2', '10']);
    await user.type(screen.getByRole('searchbox'), '1');
    expect(codes()).toEqual(['1', '10']);
  });

  it('bloqueia caracteres não numéricos no código', async () => {
    const user = userEvent.setup();
    render(<AdminApp />);
    await screen.findByText('Cubo infinito');
    await user.click(screen.getByRole('button', { name: /novo produto/i }));
    const input = screen.getByLabelText('Código');
    await user.type(input, 'abc-+e.');
    expect(input).toHaveValue('');
    fireEvent.change(input, { target: { value: '12.5' } });
    expect(input).toHaveValue('');
    await user.type(input, '12');
    expect(input).toHaveValue('12');
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
    expect(JSON.parse(localStorage.getItem('clubeDoLeo.admin.draft') ?? '[]').map((p: { codigo: number }) => p.codigo)).toEqual([1, 3]);
  });
});
