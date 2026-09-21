import { db, ref, set, push, update, onValue } from "./firebase-config.js";

const nome_compra = document.getElementById("nome_compra")
const orçamento_compra = document.getElementById("orçamento_compra")
const data_compra = document.getElementById("data_compra")
// se a URL tiver ?id=..., é uma compra compartilhada
const idRemoto = new URLSearchParams(window.location.search).get("id");
const idEditando = localStorage.getItem("compraEditando");



const aviso_orcamento = document.getElementById("aviso_orcamento");
const valor_excedente = document.getElementById("valor_excedente");

//ORÇAMENTO PADRÃO
const orçamento_padrão = document.getElementById("orçamento_padrão");
const CHAVE_ORCAMENTO_PADRAO = "orcamentoPadrao";
const orcamentoPadraoSalvo = localStorage.getItem(CHAVE_ORCAMENTO_PADRAO);

// o interruptor já abre ligado se existe um padrão salvo
orçamento_padrão.checked = orcamentoPadraoSalvo !== null;

orçamento_padrão.addEventListener("change", function(){
    if (orçamento_padrão.checked) {
        if (!orçamento_compra.value.trim()) {
            alert("Digite um valor de orçamento para salvá-lo como padrão");
            orçamento_padrão.checked = false;
            return;
        }
        localStorage.setItem(CHAVE_ORCAMENTO_PADRAO, orçamento_compra.value);
    } else {
        localStorage.removeItem(CHAVE_ORCAMENTO_PADRAO);
    }
});

// com o interruptor ligado, o padrão acompanha o que for digitado
orçamento_compra.addEventListener("input", function(){
    if (!orçamento_padrão.checked) return;

    if (orçamento_compra.value.trim()) {
        localStorage.setItem(CHAVE_ORCAMENTO_PADRAO, orçamento_compra.value);
    } else {
        localStorage.removeItem(CHAVE_ORCAMENTO_PADRAO);
        orçamento_padrão.checked = false;
    }
});



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

//EDIÇÃO DE PRODUTO JÁ ADICIONADO
// indiceEditando = qual produto está com o formulário aberto (null = nenhum)
// rascunho guarda o que foi digitado, para não se perder se a lista for redesenhada
let indiceEditando = null;
let rascunho = { nome: "", preco: "" };

function iniciarEdicao(index) {
    const p = produtos_adicionados[index];
    indiceEditando = index;
    rascunho = { nome: p.nome, preco: p.preco.toFixed(2) };
    desenharProdutos();
    lista_de_compras.querySelector(".input_nome_editar").focus();
}

function cancelarEdicao() {
    indiceEditando = null;
    desenharProdutos();
}

function salvarEdicao(index) {
    const novoNome = rascunho.nome.trim();
    const novoPreco = parseFloat(rascunho.preco);

    if (!novoNome) {
        alert("O nome do produto não pode ficar vazio");
        return;
    }
    if (isNaN(novoPreco) || novoPreco < 0) {
        alert("Preço inválido");
        return;
    }

    indiceEditando = null;

    if (idRemoto) {
        // compartilhada: atualiza no banco; o onValue redesenha a lista sozinho
        const chave = produtos_adicionados[index]._key;
        update(ref(db, `compras/${idRemoto}/produtos/${chave}`), { nome: novoNome, preco: novoPreco });
    } else {
        produtos_adicionados[index].nome = novoNome;
        produtos_adicionados[index].preco = novoPreco;
        desenharProdutos();
    }
}

function criarFormEdicao(index) {
    const form = document.createElement("div");
    form.classList.add("form_editar_produto");

    const input_nome = document.createElement("input");
    input_nome.type = "text";
    input_nome.classList.add("input", "input_nome_editar");
    input_nome.placeholder = "Nome do produto";
    input_nome.value = rascunho.nome;
    input_nome.addEventListener("input", () => { rascunho.nome = input_nome.value; });

    const input_preco = document.createElement("input");
    input_preco.type = "number";
    input_preco.step = "0.01";
    input_preco.min = "0";
    input_preco.classList.add("input", "input_preco_editar");
    input_preco.placeholder = "Preço";
    input_preco.value = rascunho.preco;
    input_preco.addEventListener("input", () => { rascunho.preco = input_preco.value; });

    // Enter salva, Esc cancela
    form.addEventListener("keydown", (e) => {
        if (e.key === "Enter") salvarEdicao(index);
        if (e.key === "Escape") cancelarEdicao();
    });

    const botoes = document.createElement("div");
    botoes.classList.add("botoes_editar_produto");

    const btn_salvar = document.createElement("button");
    btn_salvar.type = "button";
    btn_salvar.classList.add("btn_salvar_produto");
    btn_salvar.textContent = "Salvar";
    btn_salvar.addEventListener("click", () => salvarEdicao(index));

    const btn_cancelar = document.createElement("button");
    btn_cancelar.type = "button";
    btn_cancelar.classList.add("btn_cancelar_produto");
    btn_cancelar.textContent = "Cancelar";
    btn_cancelar.addEventListener("click", cancelarEdicao);

    botoes.append(btn_salvar, btn_cancelar);
    form.append(input_nome, input_preco, botoes);
    return form;
}

// redesenha a lista inteira e os totais a partir do array
function desenharProdutos() {
    lista_de_compras.innerHTML = "";

    produtos_adicionados.forEach((p, index) => {
        const nova_div = document.createElement("div");
        nova_div.classList.add("nova_div_produto");

        // produto em edição: mostra o formulário no lugar dos dados
        if (index === indiceEditando) {
            nova_div.appendChild(criarFormEdicao(index));
            lista_de_compras.appendChild(nova_div);
            return;
        }

        const produto = document.createElement("p");
        produto.classList.add("infoproduto");
        produto.textContent = p.nome;

        const preço = document.createElement("p");
        preço.classList.add("infoproduto");
        preço.textContent = `Preço: R$ ${p.preco.toFixed(2)}`;

        const controle_qtd = document.createElement("div");
        controle_qtd.classList.add("controle_qtd");

        const btn_menos = document.createElement("button");
        btn_menos.type = "button";
        btn_menos.classList.add("btn_qtd");
        btn_menos.textContent = "-";

        const input_qtd = document.createElement("input");
        input_qtd.type = "number";
        input_qtd.classList.add("input_qtd");
        input_qtd.min = "1";
        input_qtd.value = p.qtd;

        const btn_mais = document.createElement("button");
        btn_mais.type = "button";
        btn_mais.classList.add("btn_qtd");
        btn_mais.textContent = "+";

        btn_menos.addEventListener("click", () => alterarQtd(index, p.qtd - 1));
        btn_mais.addEventListener("click", () => alterarQtd(index, p.qtd + 1));
        input_qtd.addEventListener("change", () => alterarQtd(index, parseFloat(input_qtd.value)));

        controle_qtd.append(btn_menos, input_qtd, btn_mais);

        const btn_editar = document.createElement("button");
        btn_editar.type = "button";
        btn_editar.classList.add("btn_editar_produto");
        btn_editar.textContent = "Editar";
        btn_editar.addEventListener("click", () => iniciarEdicao(index));

        const cabecalho_produto = document.createElement("div");
        cabecalho_produto.classList.add("cabecalho_produto_lista");
        cabecalho_produto.append(produto, btn_editar);

        nova_div.append(cabecalho_produto, preço, controle_qtd);
        lista_de_compras.appendChild(nova_div);
    });

    const { qtd, total } = calcularTotais();
    total_qtd.textContent = qtd;
    total_preço.textContent = `R$${total.toFixed(2)}`;
    verificarOrcamento();
}

function alterarQtd(index, novaQtd) {
    if (isNaN(novaQtd) || novaQtd < 1) {
        novaQtd = 1;
    }

    if (idRemoto) {
        // compartilhada: atualiza direto no banco; o onValue redesenha sozinho
        const chave = produtos_adicionados[index]._key;
        update(ref(db, `compras/${idRemoto}/produtos/${chave}`), { qtd: novaQtd });
    } else {
        produtos_adicionados[index].qtd = novaQtd;
        desenharProdutos();
    }
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

    const preço_produto_numero = parseFloat(preço_produto.replace(",", "."));
    const qtd_produto_numero = parseFloat(qtd_produto);

    if (isNaN(preço_produto_numero) || preço_produto_numero < 0) {
        alert("Preço inválido");
        return;
    }

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



//SUGESTÕES DE NOME E PREÇO (a partir de produtos já adicionados)
const campo_nome_produto = document.getElementById("nome_produto");
const campo_preco_produto = document.getElementById("preço_produto");

// mesma regra do produtos.js: "Arroz Prata" e "arroz  prata" são o mesmo produto
function chaveProduto(nome) {
    return (nome || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ");
}

function formatarMoeda(valor) {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// junta os produtos de todas as compras salvas (da mais antiga para a mais nova) + os da compra atual
function coletarProdutosConhecidos() {
    const historico = JSON.parse(localStorage.getItem("historicoCompras")) || [];
    const compras = [...historico].sort((a, b) => (a.data || "").localeCompare(b.data || "") || a.id - b.id);

    const lista = [];
    compras.forEach(compra => (compra.produtos || []).forEach(p => lista.push(p)));
    produtos_adicionados.forEach(p => lista.push(p));

    return lista.filter(p => chaveProduto(p.nome) && !isNaN(Number(p.preco)));
}

// nomes que contêm o que foi digitado; quem COMEÇA com o texto vem primeiro ("ar" -> arroz antes de macarrão)
function sugestoesDeNome(texto) {
    const termo = chaveProduto(texto);
    if (!termo) return [];

    // um item por produto; como a lista vai do mais antigo ao mais novo, o último preço é o mais recente
    const mapa = new Map();
    coletarProdutosConhecidos().forEach(p => {
        mapa.set(chaveProduto(p.nome), { nome: p.nome.trim(), preco: Number(p.preco) });
    });

    return [...mapa.entries()]
        .filter(([chave]) => chave.includes(termo))
        .sort(([a], [b]) => Number(b.startsWith(termo)) - Number(a.startsWith(termo)) || a.localeCompare(b, "pt-BR"))
        .slice(0, 5)
        .map(([, produto]) => ({
            titulo: produto.nome,
            detalhe: formatarMoeda(produto.preco),
            nome: produto.nome,
            preco: produto.preco
        }));
}

// preços que COMEÇAM com o que foi digitado ("12" -> 12,99); se já há um nome, os preços dele vêm primeiro
function sugestoesDePreco(texto) {
    const digitado = texto.trim().replace(",", ".");
    if (!digitado || isNaN(parseFloat(digitado))) return [];

    const chaveNome = chaveProduto(campo_nome_produto.value);

    // um item por combinação produto + preço
    const mapa = new Map();
    coletarProdutosConhecidos().forEach(p => {
        const preco = Number(p.preco);
        mapa.set(`${chaveProduto(p.nome)}|${preco.toFixed(2)}`, { nome: p.nome.trim(), chave: chaveProduto(p.nome), preco });
    });

    return [...mapa.values()]
        .filter(s => s.preco.toFixed(2).startsWith(digitado) && s.preco.toFixed(2) !== digitado)
        .sort((a, b) =>
            Number(chaveNome !== "" && b.chave === chaveNome) - Number(chaveNome !== "" && a.chave === chaveNome)
            || a.preco - b.preco
        )
        .slice(0, 5)
        .map(s => ({
            titulo: formatarMoeda(s.preco),
            detalhe: s.nome,
            preco: s.preco
        }));
}

// cria a caixinha de sugestões embaixo de um input
function criarSugestoes(input, obterSugestoes, aoEscolher) {
    // envolve o input num wrapper (para posicionar a lista logo abaixo dele)
    const wrapper = document.createElement("div");
    wrapper.classList.add("campo_sugestao");
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const lista = document.createElement("div");
    lista.classList.add("lista_sugestoes", "oculto");
    wrapper.appendChild(lista);

    function esconder() {
        lista.classList.add("oculto");
        lista.innerHTML = "";
    }

    function mostrar() {
        const itens = obterSugestoes(input.value);
        lista.innerHTML = "";

        if (itens.length === 0) {
            esconder();
            return;
        }

        itens.forEach(item => {
            const botao = document.createElement("button");
            botao.type = "button";
            botao.classList.add("item_sugestao");

            const principal = document.createElement("span");
            principal.textContent = item.titulo;
            const detalhe = document.createElement("span");
            detalhe.classList.add("detalhe_sugestao");
            detalhe.textContent = item.detalhe;

            botao.append(principal, detalhe);
            botao.addEventListener("click", () => {
                aoEscolher(item);
                esconder(); // depois do aoEscolher, para fechar mesmo se ele mudou o foco
            });
            lista.appendChild(botao);
        });

        lista.classList.remove("oculto");
    }

    input.addEventListener("input", mostrar);
    input.addEventListener("focus", mostrar);
    input.addEventListener("keydown", (e) => {
        if (e.key === "Escape") esconder();
    });
    // clicar fora fecha
    document.addEventListener("click", (e) => {
        if (!wrapper.contains(e.target)) esconder();
    });
}

// escolher um nome: preenche o nome e, se o preço estiver vazio, o último preço pago
criarSugestoes(campo_nome_produto, sugestoesDeNome, (item) => {
    campo_nome_produto.value = item.nome;
    if (!campo_preco_produto.value.trim()) {
        campo_preco_produto.value = item.preco.toFixed(2);
    }
    campo_preco_produto.focus();
});

// escolher um preço: preenche o preço
criarSugestoes(campo_preco_produto, sugestoesDePreco, (item) => {
    campo_preco_produto.value = item.preco.toFixed(2);
});



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
        verificarOrcamento(); 

        produtos_adicionados = Object.entries(dados.produtos || {}).map(([chave, valor]) => ({
            ...valor,
            _key: chave
        }));
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
        orçamento_compra.value = compra.orcamento || ""; // NOVO
        produtos_adicionados = compra.produtos || [];
        desenharProdutos(); // já chama verificarOrcamento() internamente
    }

    botao_finalizar_compra.value = "Salvar Alterações";
} else {
    // compra nova: já vem com o orçamento padrão, se houver
    if (orcamentoPadraoSalvo) {
        orçamento_compra.value = orcamentoPadraoSalvo;
    }
    desenharProdutos(); // já chama verificarOrcamento() internamente
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
        orcamento: orçamento_compra.value,
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



//FIM DO ORÇAMENTO
function verificarOrcamento() {
    const orcamento = parseFloat(orçamento_compra.value);
    const { total } = calcularTotais();

    if (!isNaN(orcamento) && orcamento > 0 && total > orcamento) {
        const excedente = total - orcamento;
        valor_excedente.textContent = `R$ ${excedente.toFixed(2)}`;
        aviso_orcamento.classList.add("visivel");
    } else {
        aviso_orcamento.classList.remove("visivel");
    }
}

orçamento_compra.addEventListener("input", verificarOrcamento);