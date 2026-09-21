const botao_novacompra = document.getElementById("botao_novacompra")

botao_novacompra.addEventListener("click", function(){
    window.location.href = "novacompra.html"
});



const dados_compra = localStorage.getItem("ultimaCompra");

if (dados_compra) {
    const compra = JSON.parse(dados_compra);

    const divCompra = document.createElement("div");
    divCompra.classList.add("resumo-compra");

    const nomeEl = document.createElement("p");
    nomeEl.textContent = `${compra.nome}`;
    nomeEl.classList.add("nomeEl");

    const dataEl = document.createElement("p");
    dataEl.textContent = `${compra.data}`;
    dataEl.classList.add("dataEl");

    const totalEl = document.createElement("p");
    totalEl.textContent = `Total: R$ ${compra.total.toFixed(2)}`;
    totalEl.classList.add("totalEl");

    const qtdEl = document.createElement("p");
    qtdEl.textContent = `Itens: ${compra.qtd}`;
    qtdEl.classList.add("qtdEl");

    divCompra.append(nomeEl, dataEl, totalEl, qtdEl);

    document.getElementById("container_compras").appendChild(divCompra);

    localStorage.removeItem("ultimaCompra");
}


// ler todas e criar uma div pra cada
const historico = JSON.parse(localStorage.getItem("historicoCompras")) || [];
historico.forEach(compra => {
    // mesma lógica de criar a div acima
});