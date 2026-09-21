import { db, ref, set, push, update, onValue } from "./firebase-config.js";

const nome_compra = document.getElementById("nome_compra")
const orçamento_compra = document.getElementById("orçamento_compra")
const data_compra = document.getElementById("data_compra")

// se a URL tiver ?id=..., é uma compra compartilhada
const idRemoto = new URLSearchParams(window.location.search).get("id");
const idEditando = localStorage.getItem("compraEditando");



//BOTÃO DE VOLTAR
const menu_esquerdo = document.querySelector(".menu_esquerdo")

menu_esquerdo.addEventListener("click", function(){
    localStorage.removeItem("compraEditando"); 
    window.location.href = "index.html"
});



//ADICIONA DATA DE HOJE AUTOMATICAMENTE
const hoje = new Date();
const ano = hoje.getFullYear();
const mes = String(hoje.getMonth() + 1).padStart(2, "0");
const dia = String(hoje.getDate()).padStart(2, "0");

data_compra.value = `${ano}-${mes}-${dia}`;



//LISTA DE PRODUTOS
const botao_adicionar_produto = document.getElementById("botao_adicionar_produto")
const lista_de_compras = document.getElementById("lista_de_compras")
const total_qtd = document.getElementById("total_qtd")
const total_preço = document.getElementById("total_preço")
const botao_finalizar_compra = document.getElementById("botao_finalizar_compra")

let produtos_adicionados = [];

function calcularTotais() {
    let qtd = 0;
    let total = 0;
    produtos_adicionados.forEach(p => {
        qtd += p.qtd;
        total += p.preco * p.qtd;
    });
    return { qtd, total };
}

// redesenha a lista inteira e os totais a partir do array
function desenharProdutos() {
    lista_de_compras.innerHTML = "";

    produtos_adicionados.forEach(p => {
        const nova_div = document.createElement("div");
        nova_div.classList.add("nova_div_produto");
        const produto = document.createElement("p");
        produto.classList.add("infoproduto");
        const preço = document.createElement("p");
        preço.classList.add("infoproduto");
        const qtd = document.createElement("p");
        qtd.classList.add("infoproduto");

        produto.textContent = p.nome;
        preço.textContent = `Preço: R$ ${p.preco.toFixed(2)}`;
        qtd.textContent = `Quantidade: ${p.qtd}`;

        nova_div.append(produto, preço, qtd);
        lista_de_compras.appendChild(nova_div);
    });

    const { qtd, total } = calcularTotais();
    total_qtd.textContent = qtd;
    total_preço.textContent = `R$${total.toFixed(2)}`;
}

botao_adicionar_produto.addEventListener("click", function(){
    const nome_produto = document.getElementById("nome_produto").value
    const preço_produto = document.getElementById("preço_produto").value
    const qtd_produto = document.getElementById("qtd_produto").value

    if (!nome_produto.trim()) {
        alert("Preencha o nome do produto");
        return;
    }
    if (!preço_produto.trim()) {
        alert("Preencha o preço do produto");
        return;
    }

    const preço_produto_numero = parseFloat(preço_produto.replace(/[^\d,-]/g, "").replace(".", "").replace(",", ".")) / 100;
    const qtd_produto_numero = parseFloat(qtd_produto);

    const produto = {
        nome: nome_produto,
        preco: preço_produto_numero,
        qtd: qtd_produto_numero
    };

    if (idRemoto) {
        // compartilhada: manda pro banco; o listener (abaixo) redesenha a tela
        push(ref(db, `compras/${idRemoto}/produtos`), produto);
    } else {
        produtos_adicionados.push(produto);
        desenharProdutos();
    }
})



//COMPRA COMPARTILHADA: ESCUTA O BANCO EM TEMPO REAL
function salvarCopiaLocal(dados) {
    // mantém a compra na lista da tela inicial (também para quem abriu pelo link)
    const historico = JSON.parse(localStorage.getItem("historicoCompras")) || [];
    const { qtd, total } = calcularTotais();

    let compra = historico.find(c => c.idRemoto === idRemoto);
    if (!compra) {
        compra = { id: Date.now(), idRemoto: idRemoto };
        historico.push(compra);
    }

    compra.nome = dados.nome || "";
    compra.data = dados.data || "";
    compra.qtd = qtd;
    compra.total = total;
    compra.produtos = produtos_adicionados;

    localStorage.setItem("historicoCompras", JSON.stringify(historico));
}

if (idRemoto) {
    botao_finalizar_compra.value = "Voltar ao início";

    onValue(ref(db, `compras/${idRemoto}`), (snapshot) => {
        const dados = snapshot.val();

        if (!dados) {
            alert("Compra não encontrada. Confira o link.");
            window.location.href = "index.html";
            return;
        }

        // não sobrescreve o campo que a pessoa está digitando agora
        if (document.activeElement !== nome_compra) nome_compra.value = dados.nome || "";
        if (document.activeElement !== data_compra) data_compra.value = dados.data || "";
        if (document.activeElement !== orçamento_compra) orçamento_compra.value = dados.orcamento ?? "";

        produtos_adicionados = Object.values(dados.produtos || {});
        desenharProdutos();
        salvarCopiaLocal(dados);
    }, (erro) => {
        console.error(erro);
        alert("Não foi possível conectar ao banco de dados.");
    });

    // alterações nos campos da compra vão para o banco
    nome_compra.addEventListener("input", () => update(ref(db, `compras/${idRemoto}`), { nome: nome_compra.value }));
    data_compra.addEventListener("change", () => update(ref(db, `compras/${idRemoto}`), { data: data_compra.value }));
    orçamento_compra.addEventListener("input", () => update(ref(db, `compras/${idRemoto}`), { orcamento: orçamento_compra.value }));

} else if (idEditando) {
    // compra local sendo editada (igual ao que você já tinha)
    const historico = JSON.parse(localStorage.getItem("historicoCompras")) || [];
    const compra = historico.find(c => c.id === Number(idEditando));

    if (compra) {
        nome_compra.value = compra.nome;
        data_compra.value = compra.data;
        produtos_adicionados = compra.produtos || [];
        desenharProdutos();
    }

    botao_finalizar_compra.value = "Salvar Alterações";
} else {
    desenharProdutos();
}



//BOTÃO COMPARTILHAR
const menu_direito = document.querySelector(".menu_direito")

function gerarId() {
    // 24 caracteres aleatórios; impossível de adivinhar
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

async function mostrarLink(link) {
    try {
        await navigator.clipboard.writeText(link);
        alert("Link copiado! Envie para quem vai editar junto:\n\n" + link);
    } catch (erro) {
        prompt("Copie o link e envie para quem vai editar junto:", link);
    }
}

menu_direito.addEventListener("click", async function(){
    // já é compartilhada: só copia o link
    if (idRemoto) {
        mostrarLink(window.location.href);
        return;
    }

    // compra local: sobe para o banco e vira compartilhada
    if (!nome_compra.value.trim()) {
        alert("Preencha o nome da compra antes de compartilhar");
        return;
    }

    const novoId = gerarId();

    // cada produto ganha uma chave própria (é o que permite dois usuários adicionarem ao mesmo tempo)
    const produtosObj = {};
    produtos_adicionados.forEach(p => {
        const chave = push(ref(db, `compras/${novoId}/produtos`)).key;
        produtosObj[chave] = p;
    });

    try {
        await set(ref(db, `compras/${novoId}`), {
            nome: nome_compra.value,
            data: data_compra.value,
            orcamento: orçamento_compra.value || "",
            produtos: produtosObj
        });
    } catch (erro) {
        console.error(erro);
        alert("Não foi possível compartilhar. Verifique sua conexão.");
        return;
    }

    // se a compra já existia na lista, liga ela ao ID remoto (evita duplicar)
    if (idEditando) {
        const historico = JSON.parse(localStorage.getItem("historicoCompras")) || [];
        const compra = historico.find(c => c.id === Number(idEditando));
        if (compra) {
            compra.idRemoto = novoId;
            localStorage.setItem("historicoCompras", JSON.stringify(historico));
        }
        localStorage.removeItem("compraEditando");
    }

    const link = `${window.location.origin}${window.location.pathname}?id=${novoId}`;
    await mostrarLink(link);
    window.location.href = `novacompra.html?id=${novoId}`;
});



//FUNÇÃO FINALIZAR COMPRA
botao_finalizar_compra.addEventListener("click", function(){
    // compartilhada: tudo já foi salvo em tempo real, só volta
    if (idRemoto) {
        window.location.href = "index.html";
        return;
    }

    const nome = nome_compra.value;
    const data = data_compra.value;

    if (!nome.trim()) {
        alert("Preencha o nome da compra");
        return;
    }

    const historico = JSON.parse(localStorage.getItem("historicoCompras")) || [];
    const { qtd, total } = calcularTotais();

    const compra = {
        id: idEditando ? Number(idEditando) : Date.now(),
        nome: nome,
        data: data,
        qtd: qtd,
        total: total,
        produtos: produtos_adicionados
    };

    if (idEditando) {
        const index = historico.findIndex(c => c.id === Number(idEditando));
        historico[index] = compra;
        localStorage.removeItem("compraEditando");
    } else {
        historico.push(compra);
    }

    localStorage.setItem("historicoCompras", JSON.stringify(historico));
    window.location.href = "index.html"
})