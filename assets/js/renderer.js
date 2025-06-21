import { produtos } from "./store.js";

const renderStore = (arr) => {
  const insertAt = document.querySelector("#produtos");
  document.querySelectorAll("#produtos .produto")?.forEach((c) => c.remove());

  arr.forEach((p) => {
    const article = document.createElement("template");

    const produto = `
      <article class="produto">
        <figure>
            <img src="${p.imagem}" alt="${p.nome}" width="250" height="250" />
        </figure>
        <section>
            <p class="nome">${p.nome.toLocaleUpperCase()}</p>
            <p class="descricao">${p.descricao}</p>
            <p class="valor">R$ <span>${p.valor.toFixed(2)}</span></p>
        </section>          
      </article>
    `;

    article.innerHTML = produto;
    insertAt.append(article.content.children[0]);
  });
};

export const handleCategoriaClick = (ev) => {
  const categoria = ev.target.dataset.tipoProduto;

  renderStore(produtos[categoria]);

  const links = document.querySelectorAll("nav section a");
  links.forEach((l) => {
    const active = l.dataset.tipoProduto === categoria;

    l.setAttribute("class", active ? "active" : "");
  });
};
