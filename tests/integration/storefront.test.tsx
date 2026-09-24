import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StorefrontApp } from '../../src/features/storefront/StorefrontApp';

const products = [
  { codigo: '1', nome: 'Cubo infinito', descricao: 'Um brinquedo sensorial', valor: 19.9, imagens: [], categorias: ['Brinquedos'] },
  { codigo: '2', nome: 'Jogo Dino', descricao: 'Um jogo', valor: 0, imagens: [], categorias: ['Jogos'] },
];

describe('vitrine', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ produtos: products }) }));
    vi.stubGlobal('IntersectionObserver', class {
      observe() {}
      disconnect() {}
    });
  });

  it('carrega, busca e filtra produtos', async () => {
    const user = userEvent.setup();
    render(<StorefrontApp />);
    expect(await screen.findByRole('heading', { name: 'Cubo infinito' })).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox'), 'dino');
    expect(screen.queryByRole('heading', { name: 'Cubo infinito' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Jogo Dino' })).toBeInTheDocument();
  });

  it('adiciona produto, atualiza o carrinho persistido e inicia checkout', async () => {
    const user = userEvent.setup();
    render(<StorefrontApp />);
    await user.click((await screen.findAllByRole('button', { name: 'Adicionar' }))[0]);
    expect(screen.getByText('Cubo infinito adicionado ao carrinho!')).toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem('clubeDoLeo.cart') ?? '[]')).toEqual([{ codigo: '1', quantity: 1 }]);
    await user.click(screen.getByRole('button', { name: /abrir carrinho, 1 item/i }));
    expect(screen.getByRole('dialog', { name: 'Carrinho de compras' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /revisar pedido/i }));
    expect(screen.getByRole('dialog', { name: 'Enviar pedido' })).toBeInTheDocument();
  });

  it('busca sem acentos e permite adicionar item sob consulta', async () => {
    const user = userEvent.setup();
    render(<StorefrontApp />);
    await screen.findByRole('heading', { name: 'Cubo infinito' });
    await user.type(screen.getByRole('searchbox'), 'sensorial');
    expect(screen.getByRole('heading', { name: 'Cubo infinito' })).toBeInTheDocument();
    await user.clear(screen.getByRole('searchbox'));
    await user.type(screen.getByRole('searchbox'), 'jogo');
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect(JSON.parse(sessionStorage.getItem('clubeDoLeo.cart') ?? '[]')).toEqual([{ codigo: '2', quantity: 1 }]);
  });

  it('mostra erro amigável quando o catálogo não pode ser carregado', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Erro' } as Response);
    render(<StorefrontApp />);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar'));
  });
});
