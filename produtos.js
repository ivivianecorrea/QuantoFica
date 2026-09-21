import { db, ref, update } from "./firebase-config.js";

const container_produtos = document.getElementById("container_produtos");
const busca_produto = document.getElementById("busca_produto");

let historico = JSON.parse(localStorage.getItem("historicoCompras")) || [];

function salvarHistorico() {
    localStorage.setItem("historicoCompras", JSON.stringify(historico));
}

// "Arroz Prata" e "arroz  prata" são o mesmo produto; "Arroz Carijó" não
function chaveProduto(nome) {
    return (nome || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ");
}

function formatarData(data) {
    if (!data) return "";
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
}

// cada item reúne as ocorrências (uma por compra) daquele produto.
// guardar compraIndex/prodIndex é o que permite editar de volta no historico certo.
function reunirProdutos() {
    const mapa = new Map();

    historico.forEach((compra, compraIndex) => {
        (compra.produtos || []).forEach((p, prodIndex) => {
            const chave = chaveProduto(p.nome);
            if (!chave) return;

            let item = mapa.get(chave);
            if (!item) {
                item = { nome: (p.nome || "").trim(), ocorrencias: [] };
                mapa.set(chave, item);
            }

            item.ocorrencias.push({
                compraIndex,
                prodIndex,
                compraNome: compra.nome || "Sem nome",
                compraData: compra.data || "",
                idRemoto: compra.idRemoto || null,
                remotoKey: p._key || null,
                nome: p.nome,
                preco: Number(p.preco) || 0,
                qtd: Number(p.qtd) || 0
            });
        });
    });

    return [...mapa.values()].sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })
    );
}

let produtos = reunirProdutos();

// grava a alteração no localStorage e, se a compra for compartilhada, no Firebase também
function salvarOcorrencia(occ, novoNome, novoPreco) {
    const produto = historico[occ.compraIndex].produtos[occ.prodIndex];
    produto.nome = novoNome;
    if (novoPreco !== null) produto.preco = novoPreco;
    salvarHistorico();

    if (occ.idRemoto && occ.remotoKey) {
        const dados = { nome: novoNome };
        if (novoPreco !== null) dados.preco = novoPreco;
        update(ref(db, `compras/${occ.idRemoto}/produtos/${occ.remotoKey}`), dados)
            .catch(erro => console.error(erro));
    }
}

function salvarEmTodasOcorrencias(item, novoNome, novoPreco) {
    item.ocorrencias.forEach(occ => salvarOcorrencia(occ, novoNome, novoPreco));
}

// remove o produto de todas as compras: no localStorage e, nas compras compartilhadas, no Firebase
function excluirDeTodasCompras(item) {
    const chave = chaveProduto(item.nome);

    // Firebase: gravar null numa chave apaga aquele produto (só as compras compartilhadas têm idRemoto)
    item.ocorrencias.forEach(occ => {
        if (occ.idRemoto && occ.remotoKey) {
            update(ref(db, `compras/${occ.idRemoto}/produtos`), { [occ.remotoKey]: null })
                .catch(erro => console.error(erro));
        }
    });

    // localStorage: só mexe nas compras que tinham o produto
    const comprasAfetadas = new Set(item.ocorrencias.map(occ => occ.compraIndex));

    comprasAfetadas.forEach(compraIndex => {
        const compra = historico[compraIndex];
        compra.produtos = (compra.produtos || []).filter(p => chaveProduto(p.nome) !== chave);

        // a tela inicial mostra "Itens" e "Total" salvos na compra, então precisam ser recalculados
        compra.qtd = compra.produtos.reduce((soma, p) => soma + (Number(p.qtd) || 0), 0);
        compra.total = compra.produtos.reduce((soma, p) => soma + (Number(p.preco) || 0) * (Number(p.qtd) || 0), 0);
    });

    salvarHistorico();
}

function criarDado(texto) {
    const p = document.createElement("p");
    p.classList.add("dado_produto");
    p.textContent = texto;
    return p;
}

function criarFormulario(nomeInicial, precoInicial, produtoIdx, tipo, ocorrenciaIdx) {
    const form = document.createElement("div");
    form.classList.add("form_editar", "oculto");
    form.dataset.produtoIdx = produtoIdx;
    form.dataset.tipo = tipo;
    if (ocorrenciaIdx !== undefined) form.dataset.ocorrenciaIdx = ocorrenciaIdx;

    const inputNome = document.createElement("input");
    inputNome.type = "text";
    inputNome.classList.add("input_nome_editar", "input");
    inputNome.value = nomeInicial;
    inputNome.placeholder = "Nome do produto";

    const inputPreco = document.createElement("input");
    inputPreco.type = "number";
    inputPreco.step = "0.01";
    inputPreco.classList.add("input_preco_editar", "input");
    inputPreco.value = precoInicial;
    inputPreco.placeholder = tipo === "todas" ? "Preço (opcional, aplica a todas)" : "Preço";

    const botoes = document.createElement("div");
    botoes.classList.add("botoes_form_editar");

    const btnSalvar = document.createElement("button");
    btnSalvar.type = "button";
    btnSalvar.classList.add("btn_salvar_editar");
    btnSalvar.textContent = "Salvar";

    const btnCancelar = document.createElement("button");
    btnCancelar.type = "button";
    btnCancelar.classList.add("btn_cancelar_editar");
    btnCancelar.textContent = "Cancelar";

    botoes.append(btnSalvar, btnCancelar);
    form.append(inputNome, inputPreco, botoes);
    return form;
}

function renderizarProdutos() {
    const termo = chaveProduto(busca_produto.value);
    container_produtos.innerHTML = "";

    const lista = produtos.filter(item => !termo || chaveProduto(item.nome).includes(termo));

    if (lista.length === 0) {
        const aviso = document.createElement("p");
        aviso.id = "aviso_vazio";
        aviso.textContent = produtos.length === 0
            ? "Nenhum produto ainda. Crie uma compra e adicione itens para vê-los aqui."
            : "Nenhum produto com esse nome.";
        container_produtos.appendChild(aviso);
        return;
    }

    lista.forEach((item) => {
        const produtoIdx = produtos.indexOf(item);
        const card = document.createElement("div");
        card.classList.add("card_produto");
        card.dataset.produtoIdx = produtoIdx;

        const cabecalho = document.createElement("div");
        cabecalho.classList.add("cabecalho_produto");

        const nome = document.createElement("p");
        nome.classList.add("nome_produto");
        nome.textContent = item.nome;

        const btnEditarTodos = document.createElement("button");
        btnEditarTodos.type = "button";
        btnEditarTodos.classList.add("btn_editar_todos");
        btnEditarTodos.textContent = "Editar em todas";

        const btnExcluirTodos = document.createElement("button");
        btnExcluirTodos.type = "button";
        btnExcluirTodos.classList.add("btn_excluir_todos");
        btnExcluirTodos.textContent = "Excluir de todas";

        const acoes = document.createElement("div");
        acoes.classList.add("acoes_produto");
        acoes.append(btnEditarTodos, btnExcluirTodos);

        cabecalho.append(nome, acoes);
        card.appendChild(cabecalho);

        const dados = document.createElement("div");
        dados.classList.add("dados_produto");
        const vezes = item.ocorrencias.length;
        const qtdTotal = item.ocorrencias.reduce((s, o) => s + o.qtd, 0);
        dados.appendChild(criarDado(vezes === 1 ? "Em 1 compra" : `Em ${vezes} compras`));
        dados.appendChild(criarDado(`${qtdTotal} unidade(s) no total`));
        card.appendChild(dados);

        card.appendChild(criarFormulario(item.nome, "", produtoIdx, "todas"));

        const listaOcorrencias = document.createElement("div");
        listaOcorrencias.classList.add("lista_ocorrencias");

        item.ocorrencias.forEach((occ, ocorrenciaIdx) => {
            const linha = document.createElement("div");
            linha.classList.add("ocorrencia");

            const info = document.createElement("div");
            info.classList.add("info_ocorrencia");

            const pCompra = document.createElement("p");
            pCompra.textContent = `${occ.compraNome}${occ.compraData ? " · " + formatarData(occ.compraData) : ""}`;

            const pValores = document.createElement("p");
            pValores.textContent = `Qtd ${occ.qtd} · R$ ${occ.preco.toFixed(2)}`;

            info.append(pCompra, pValores);

            const btnEditar = document.createElement("button");
            btnEditar.type = "button";
            btnEditar.classList.add("btn_editar_ocorrencia");
            btnEditar.textContent = "Editar";

            linha.append(info, btnEditar);
            listaOcorrencias.appendChild(linha);
            listaOcorrencias.appendChild(
                criarFormulario(occ.nome, occ.preco.toFixed(2), produtoIdx, "ocorrencia", ocorrenciaIdx)
            );
        });

        card.appendChild(listaOcorrencias);
        container_produtos.appendChild(card);
    });
}

// delegação de eventos: um único listener cuida de abrir formulários, cancelar e salvar
container_produtos.addEventListener("click", function(e){
    const alvo = e.target;

    if (alvo.classList.contains("btn_editar_todos")) {
        alvo.closest(".card_produto").querySelector('.form_editar[data-tipo="todas"]').classList.toggle("oculto");
        return;
    }

    if (alvo.classList.contains("btn_excluir_todos")) {
        const item = produtos[Number(alvo.closest(".card_produto").dataset.produtoIdx)];
        const vezes = item.ocorrencias.length;

        const confirmar = confirm(
            `Excluir "${item.nome}" de ${vezes === 1 ? "1 compra" : vezes + " compras"}? Essa ação não pode ser desfeita.`
        );
        if (!confirmar) return;

        excluirDeTodasCompras(item);
        produtos = reunirProdutos();
        renderizarProdutos();
        return;
    }

    if (alvo.classList.contains("btn_editar_ocorrencia")) {
        alvo.closest(".ocorrencia").nextElementSibling.classList.toggle("oculto");
        return;
    }

    if (alvo.classList.contains("btn_cancelar_editar")) {
        alvo.closest(".form_editar").classList.add("oculto");
        return;
    }

    if (alvo.classList.contains("btn_salvar_editar")) {
        const form = alvo.closest(".form_editar");
        const produtoIdx = Number(form.dataset.produtoIdx);
        const tipo = form.dataset.tipo;
        const item = produtos[produtoIdx];

        const novoNome = form.querySelector(".input_nome_editar").value.trim();
        const precoTexto = form.querySelector(".input_preco_editar").value;
        const novoPreco = precoTexto.trim() === "" ? null : parseFloat(precoTexto);

        if (!novoNome) {
            alert("O nome do produto não pode ficar vazio");
            return;
        }
        if (precoTexto.trim() !== "" && (isNaN(novoPreco) || novoPreco < 0)) {
            alert("Preço inválido");
            return;
        }
        if (tipo === "ocorrencia" && novoPreco === null) {
            alert("Informe o preço");
            return;
        }

        if (tipo === "todas") {
            salvarEmTodasOcorrencias(item, novoNome, novoPreco);
        } else {
            salvarOcorrencia(item.ocorrencias[Number(form.dataset.ocorrenciaIdx)], novoNome, novoPreco);
        }

        produtos = reunirProdutos();
        renderizarProdutos();
    }
});

busca_produto.addEventListener("input", renderizarProdutos);
renderizarProdutos();