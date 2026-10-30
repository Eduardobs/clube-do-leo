import { render, screen, waitFor, within } from '@testing-library/react';
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

  it('exibe grupos de 12 produtos somente ao clicar e reinicia a listagem ao filtrar', async () => {
    const user = userEvent.setup();
    const catalog = Array.from({ length: 25 }, (_, index) => ({
      ...products[0], codigo: String(index + 1), nome: `Produto ${index + 1}`,
    }));
    vi.stubGlobal('IntersectionObserver', undefined);
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ produtos: catalog }) } as Response);
    render(<StorefrontApp />);
    await screen.findByRole('heading', { name: 'Produto 1' });
    expect(screen.getAllByRole('heading', { name: /^Produto \d+$/ })).toHaveLength(12);
    expect(screen.queryByRole('heading', { name: 'Produto 13' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Exibir mais produtos' }));
    expect(screen.getAllByRole('heading', { name: /^Produto \d+$/ })).toHaveLength(24);
    await user.click(screen.getByRole('button', { name: 'Exibir mais produtos' }));
    expect(screen.getAllByRole('heading', { name: /^Produto \d+$/ })).toHaveLength(25);
    expect(screen.queryByRole('button', { name: 'Exibir mais produtos' })).not.toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: /Ordenar por/ }), 'name');
    expect(screen.getAllByRole('heading', { name: /^Produto \d+$/ })).toHaveLength(12);
    expect(screen.getByRole('button', { name: 'Exibir mais produtos' })).toBeInTheDocument();
  });

  it('carrega, busca e filtra produtos', async () => {
    const user = userEvent.setup();
    render(<StorefrontApp />);
    expect(await screen.findByRole('heading', { name: 'Cubo infinito' })).toBeInTheDocument();
    expect(screen.getByText('Código 1')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Jogos' })).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Jogos' }));
    expect(screen.queryByRole('heading', { name: 'Cubo infinito' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Todos' }));
    expect(screen.getByRole('heading', { name: 'Cubo infinito' })).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox'), 'dino');
    expect(screen.queryByRole('heading', { name: 'Cubo infinito' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Jogo Dino' })).toBeInTheDocument();
  });

  it('adiciona produto, atualiza o carrinho persistido e inicia checkout', async () => {
    const user = userEvent.setup();
    render(<StorefrontApp />);
    await user.click((await screen.findAllByRole('button', { name: 'Adicionar ao carrinho' }))[0]);
    expect(screen.getByText('Cubo infinito adicionado ao carrinho!')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('clubeDoLeo.cart') ?? '[]')).toMatchObject([{ codigo: '1', quantity: 1 }]);
    expect(JSON.parse(sessionStorage.getItem('clubeDoLeo.cart') ?? '[]')).toMatchObject([{ codigo: '1', quantity: 1 }]);
    await user.click(screen.getByRole('button', { name: /abrir carrinho, 1 item/i }));
    const cartDialog = screen.getByRole('dialog', { name: 'Carrinho de compras' });
    expect(cartDialog).toBeInTheDocument();
    expect(within(cartDialog).getByRole('link', { name: 'Cubo infinito' })).toHaveAttribute('href', '/produto-cubo-infinito-1/');
    await user.click(screen.getByRole('button', { name: /revisar pedido/i }));
    expect(screen.getByRole('dialog', { name: 'Enviar pedido' })).toBeInTheDocument();
  });

  it('busca sem acentos e direciona itens sob consulta ao orçamento', async () => {
    const user = userEvent.setup();
    render(<StorefrontApp />);
    await screen.findByRole('heading', { name: 'Cubo infinito' });
    await user.type(screen.getByRole('searchbox'), 'sensorial');
    expect(screen.getByRole('heading', { name: 'Cubo infinito' })).toBeInTheDocument();
    await user.clear(screen.getByRole('searchbox'));
    await user.type(screen.getByRole('searchbox'), 'jogo');
    expect(screen.getByRole('link', { name: 'Solicitar orçamento' })).toHaveAttribute('href', '/produto-jogo-dino-2/');
    expect(screen.queryByRole('button', { name: 'Adicionar ao carrinho' })).not.toBeInTheDocument();
  });

  it('mostra erro amigável quando o catálogo não pode ser carregado', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Erro' } as Response);
    render(<StorefrontApp />);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar'));
  });
});
