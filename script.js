const botao_novacompra = document.getElementById("botao_novacompra")

botao_novacompra.addEventListener("click", function(){
    localStorage.removeItem("compraEditando");
    window.location.href = "novacompra.html"
});



const icon_lixeira = document.getElementById("icon_lixeira");
const botao_apagar_selecionadas = document.getElementById("botao_apagar_selecionadas");
const container_compras = document.getElementById("container_compras");

let modoExclusao = false;
let comprasSelecionadas = new Set();

// liga/desliga o modo de exclusão
icon_lixeira.addEventListener("click", function(){
    modoExclusao = !modoExclusao;
    comprasSelecionadas.clear();

    icon_lixeira.classList.toggle("ativo", modoExclusao);
    botao_apagar_selecionadas.classList.toggle("visivel", modoExclusao);

    // remove destaque visual de seleções antigas ao sair do modo
    document.querySelectorAll(".resumo-compra.selecionada").forEach(div => {
        div.classList.remove("selecionada");
    });
});

// apaga as compras marcadas
botao_apagar_selecionadas.addEventListener("click", function(){
    if (comprasSelecionadas.size === 0) {
        alert("Selecione ao menos uma compra para apagar");
        return;
    }

    const confirmar = confirm(`Deseja apagar ${comprasSelecionadas.size} compra(s) selecionada(s)? Essa ação não pode ser desfeita.`);

    if (confirmar) {
        let historico = JSON.parse(localStorage.getItem("historicoCompras")) || [];
        historico = historico.filter(compra => !comprasSelecionadas.has(compra.id));
        localStorage.setItem("historicoCompras", JSON.stringify(historico));
        location.reload();
    }
});



//ORDENAÇÃO
const icon_ordem = document.getElementById("icon_ordem");
const menu_ordem = document.getElementById("menu_ordem");
const opcoes_ordem = document.querySelectorAll(".opcao_ordem");

const ordenacoes = {
    "nome-asc":   (a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }),
    "nome-desc":  (a, b) => b.nome.localeCompare(a.nome, "pt-BR", { sensitivity: "base" }),
    // datas estão em "AAAA-MM-DD", então comparar como texto funciona; o id (timestamp) desempata
    "data-desc":  (a, b) => (b.data || "").localeCompare(a.data || "") || b.id - a.id,
    "data-asc":   (a, b) => (a.data || "").localeCompare(b.data || "") || a.id - b.id,
    "preco-desc": (a, b) => b.total - a.total,
    "preco-asc":  (a, b) => a.total - b.total,
    "itens-desc": (a, b) => b.qtd - a.qtd,
    "itens-asc":  (a, b) => a.qtd - b.qtd
};

// recupera a última ordem escolhida (padrão: mais recente primeiro)
let ordemAtual = localStorage.getItem("ordemCompras");
if (!ordenacoes[ordemAtual]) {
    ordemAtual = "data-desc";
}

function atualizarMenuOrdem() {
    opcoes_ordem.forEach(opcao => {
        opcao.classList.toggle("ativa", opcao.dataset.ordem === ordemAtual);
    });
}

function fecharMenuOrdem() {
    menu_ordem.classList.remove("visivel");
    icon_ordem.classList.remove("ativo");
}

// abre/fecha o menu
icon_ordem.addEventListener("click", function(){
    const aberto = menu_ordem.classList.toggle("visivel");
    icon_ordem.classList.toggle("ativo", aberto);
});

// clicar fora fecha o menu
document.addEventListener("click", function(e){
    if (!icon_ordem.contains(e.target) && !menu_ordem.contains(e.target)) {
        fecharMenuOrdem();
    }
});

// escolher uma opção
opcoes_ordem.forEach(opcao => {
    opcao.addEventListener("click", function(){
        ordemAtual = opcao.dataset.ordem;
        localStorage.setItem("ordemCompras", ordemAtual);
        atualizarMenuOrdem();
        renderizarCompras();
        fecharMenuOrdem();
    });
});



//LISTA DE COMPRAS
const historico = JSON.parse(localStorage.getItem("historicoCompras")) || [];

function renderizarCompras() {
    container_compras.innerHTML = "";

    const ordenadas = [...historico].sort(ordenacoes[ordemAtual]);

    ordenadas.forEach(compra => {
        const divCompra = document.createElement("div");
        divCompra.classList.add("resumo-compra");

        // mantém a seleção se o modo de exclusão estiver ativo e a lista for reordenada
        if (comprasSelecionadas.has(compra.id)) {
            divCompra.classList.add("selecionada");
        }

        const nomeEl = document.createElement("p");
        nomeEl.textContent = `${compra.nome}`;
        nomeEl.classList.add("nomeEl");

        const dataEl = document.createElement("p");
        dataEl.textContent = `${compra.data}`;
        dataEl.classList.add("dataEl");

        const qtdEl = document.createElement("p");
        qtdEl.textContent = `Itens: ${compra.qtd}`;
        qtdEl.classList.add("qtdEl");

        const totalEl = document.createElement("p");
        totalEl.textContent = `Total: R$ ${compra.total.toFixed(2)}`;
        totalEl.classList.add("totalEl");

        divCompra.append(nomeEl, dataEl, qtdEl, totalEl);
        container_compras.appendChild(divCompra);

        // clique se comporta diferente dependendo do modo
        divCompra.addEventListener("click", () => {
            if (modoExclusao) {
                divCompra.classList.toggle("selecionada");
                if (comprasSelecionadas.has(compra.id)) {
                    comprasSelecionadas.delete(compra.id);
                } else {
                    comprasSelecionadas.add(compra.id);
                }
            } else {
                localStorage.setItem("compraEditando", compra.id);
                window.location.href = "novacompra.html";
            }
        });
    });
}

atualizarMenuOrdem();
renderizarCompras();