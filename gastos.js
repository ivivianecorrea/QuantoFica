// ---------- DADOS ----------
let historico = [];
try {
    historico = JSON.parse(localStorage.getItem("historicoCompras")) || [];
} catch (erro) {
    historico = [];
}
if (!Array.isArray(historico)) historico = [];

const sec_vazio = document.getElementById("sec_vazio");
const conteudo_gastos = document.getElementById("conteudo_gastos");
const hero_gasto = document.getElementById("hero_gasto");
const kpis_gastos = document.getElementById("kpis_gastos");
const grafico_meses = document.getElementById("grafico_meses");
const insight_grafico = document.getElementById("insight_grafico");
const lista_meses = document.getElementById("lista_meses");
const filtros_produtos = document.getElementById("filtros_produtos");
const lista_diferencas = document.getElementById("lista_diferencas");

const NOMES_MESES = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
];

// medidas do gráfico de colunas (precisam bater com o gastos.css)
const ALTURA_BARRA = 150;
const ALTURA_ROTULO = 24;



// ---------- FUNÇÕES AUXILIARES ----------

// cria um elemento com classe e texto em uma linha só
function el(tag, classe, texto) {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto !== undefined) e.textContent = texto;
    return e;
}

// mesma regra do produtos.js: "Arroz Prata" e "arroz  prata" são o mesmo produto
function chaveProduto(nome) {
    return (nome || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ");
}

function moeda(valor) {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function moedaInteira(valor) {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

// 12.3456 -> "12%"; 4.56 -> "4,6%"
function pct(valor) {
    const a = Math.abs(valor);
    return (a < 10 ? a.toFixed(1) : String(Math.round(a))).replace(".", ",") + "%";
}

function plural(n, singular, pluralTxt) {
    return `${n} ${n === 1 ? singular : pluralTxt}`;
}

function capitalizar(texto) {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// chave do mês é "AAAA-MM"
function partesDoMes(chave) {
    const [ano, mes] = chave.split("-");
    return { ano, mes: Number(mes) };
}
const mesMinusculo = chave => NOMES_MESES[partesDoMes(chave).mes - 1];             // "setembro"
const mesCompleto = chave => `${capitalizar(mesMinusculo(chave))} de ${partesDoMes(chave).ano}`; // "Setembro de 2026"
const mesAbreviado = chave => `${mesMinusculo(chave).slice(0, 3)}/${partesDoMes(chave).ano.slice(2)}`; // "set/26"

function chaveMesAtual() {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

// soma preço x quantidade; se a compra não tiver produtos, usa o total salvo
function totalDaCompra(compra) {
    const produtos = compra.produtos || [];
    if (produtos.length === 0) return Number(compra.total) || 0;
    return produtos.reduce((soma, p) => soma + (Number(p.preco) || 0) * (Number(p.qtd) || 0), 0);
}



// ---------- 1. AGRUPAR AS COMPRAS POR MÊS ----------
function agruparPorMes() {
    const mapa = new Map();

    historico.forEach(compra => {
        // a data é "AAAA-MM-DD"; os 7 primeiros caracteres identificam o mês
        if (!compra.data || !/^\d{4}-\d{2}/.test(compra.data)) return;

        const chave = compra.data.slice(0, 7);
        let mes = mapa.get(chave);

        if (!mes) {
            mes = {
                chave,
                total: 0,
                compras: 0,
                itens: 0,
                orcamento: 0,           // soma dos orçamentos das compras que tinham orçamento
                gastoComOrcamento: 0,   // quanto foi gasto nessas mesmas compras
                produtos: new Map()
            };
            mapa.set(chave, mes);
        }

        const total = totalDaCompra(compra);
        mes.total += total;
        mes.compras++;

        const orcamento = parseFloat(compra.orcamento);
        if (!isNaN(orcamento) && orcamento > 0) {
            mes.orcamento += orcamento;
            mes.gastoComOrcamento += total;
        }

        (compra.produtos || []).forEach(p => {
            const chaveP = chaveProduto(p.nome);
            mes.itens += Number(p.qtd) || 0;
            if (!chaveP) return;

            let prod = mes.produtos.get(chaveP);
            if (!prod) {
                prod = { nome: (p.nome || "").trim(), somaPrecos: 0, vezes: 0 };
                mes.produtos.set(chaveP, prod);
            }
            prod.somaPrecos += Number(p.preco) || 0;
            prod.vezes++;
        });
    });

    // ordem cronológica: "AAAA-MM" ordena certo como texto
    return [...mapa.values()].sort((a, b) => a.chave.localeCompare(b.chave));
}

const meses = agruparPorMes();

// economia = orçamento - gasto (positivo = sobrou, negativo = estourou); null se não teve orçamento
function economiaDoMes(mes) {
    return mes.orcamento > 0 ? mes.orcamento - mes.gastoComOrcamento : null;
}

// números usados em vários lugares
function calcularResumo() {
    const soma = meses.reduce((s, m) => s + m.total, 0);
    const temComparacao = meses.length > 1;
    return {
        media: soma / meses.length,
        maisBarato: temComparacao ? meses.reduce((a, b) => (b.total < a.total ? b : a)) : null,
        maisCaro: temComparacao ? meses.reduce((a, b) => (b.total > a.total ? b : a)) : null,
        compras: meses.reduce((s, m) => s + m.compras, 0),
        itens: meses.reduce((s, m) => s + m.itens, 0)
    };
}



// ---------- 2. DESTAQUE: O ÚLTIMO MÊS EM UMA FRASE ----------
function renderizarDestaque() {
    const ultimo = meses[meses.length - 1];
    const anterior = meses.length > 1 ? meses[meses.length - 2] : null;
    const emAndamento = ultimo.chave === chaveMesAtual();

    hero_gasto.innerHTML = "";
    hero_gasto.append(
        el("p", "hero_rotulo", emAndamento ? "Neste mês você já gastou" : `Em ${mesMinusculo(ultimo.chave)} você gastou`),
        el("p", "hero_valor", moeda(ultimo.total))
    );

    if (!anterior) {
        hero_gasto.appendChild(el("p", "hero_frase", "Este é o seu primeiro mês registrado. Com compras em outro mês, você poderá comparar."));
        return;
    }

    const diferenca = ultimo.total - anterior.total;

    if (Math.abs(diferenca) < 0.005) {
        hero_gasto.appendChild(el("p", "hero_frase", `Exatamente o mesmo valor de ${mesMinusculo(anterior.chave)}.`));
        return;
    }

    const gastouMenos = diferenca < 0;

    if (anterior.total > 0) {
        hero_gasto.appendChild(
            el("span", `hero_chip ${gastouMenos ? "desce" : "sobe"}`,
                `${gastouMenos ? "↓" : "↑"} ${pct((diferenca / anterior.total) * 100)} ${gastouMenos ? "menos" : "mais"} que em ${mesMinusculo(anterior.chave)}`)
        );
    }

    let frase = `Isso é ${moeda(Math.abs(diferenca))} a ${gastouMenos ? "menos" : "mais"} do que você gastou em ${mesMinusculo(anterior.chave)}.`;
    if (emAndamento) frase += " O mês ainda não terminou, então o valor pode mudar.";
    hero_gasto.appendChild(el("p", "hero_frase", frase));
}



// ---------- 3. CARTÕES DE RESUMO ----------
function criarKpi(rotulo, valor, apoio, tom) {
    const card = el("div", `card_kpi ${tom || ""}`);
    card.append(el("p", "kpi_rotulo", rotulo), el("p", "kpi_valor", valor), el("p", "kpi_apoio", apoio));
    return card;
}

function renderizarResumo() {
    const r = calcularResumo();
    kpis_gastos.innerHTML = "";

    kpis_gastos.appendChild(
        criarKpi("Média por mês", moeda(r.media), `Tudo o que você gastou dividido por ${plural(meses.length, "mês", "meses")}.`)
    );

    if (r.maisBarato) {
        kpis_gastos.appendChild(criarKpi("Mês mais econômico", moeda(r.maisBarato.total), mesCompleto(r.maisBarato.chave), "bom"));
        kpis_gastos.appendChild(criarKpi("Mês mais caro", moeda(r.maisCaro.total), mesCompleto(r.maisCaro.chave), "ruim"));
    }

    // 4º cartão: economia no orçamento (se o usuário usa orçamento) ou quantidade de compras
    const mesesComOrcamento = meses.filter(m => economiaDoMes(m) !== null);
    if (mesesComOrcamento.length > 0) {
        const economiaTotal = mesesComOrcamento.reduce((s, m) => s + economiaDoMes(m), 0);
        kpis_gastos.appendChild(
            criarKpi(
                "Economia no orçamento",
                moeda(Math.abs(economiaTotal)),
                economiaTotal >= 0
                    ? "sobraram dos seus limites, somando todos os meses."
                    : "acima dos seus limites, somando todos os meses.",
                economiaTotal >= 0 ? "bom" : "ruim"
            )
        );
    } else {
        kpis_gastos.appendChild(
            criarKpi("Compras registradas", String(r.compras), `${plural(r.itens, "item", "itens")} no total.`)
        );
    }
}



// ---------- 4. GRÁFICO DE COLUNAS: GASTO POR MÊS ----------
function renderizarGrafico() {
    const r = calcularResumo();
    const maximo = Math.max(...meses.map(m => m.total)) || 1;

    grafico_meses.innerHTML = "";
    const rolagem = el("div", "grafico_rolagem");
    rolagem.setAttribute("role", "img");
    rolagem.setAttribute("aria-label", "Gráfico de colunas com o gasto total de cada mês");

    const interno = el("div", "grafico_interno");

    meses.forEach(mes => {
        const coluna = el("div", "coluna_grafico");

        const barra = el("div", "barra_coluna");
        if (mes === r.maisBarato) barra.classList.add("barata");
        if (mes === r.maisCaro) barra.classList.add("cara");
        barra.style.height = `${Math.max(4, (mes.total / maximo) * ALTURA_BARRA)}px`;

        coluna.append(el("p", "valor_coluna", moedaInteira(mes.total)), barra, el("p", "rotulo_coluna", mesAbreviado(mes.chave)));
        interno.appendChild(coluna);
    });

    // linha tracejada da média
    const linha = el("div", "linha_media");
    linha.style.bottom = `${ALTURA_ROTULO + (r.media / maximo) * ALTURA_BARRA}px`;
    linha.appendChild(el("span", "rotulo_media", `média ${moedaInteira(r.media)}`));
    interno.appendChild(linha);

    rolagem.appendChild(interno);
    grafico_meses.appendChild(rolagem);

    // com muitos meses o gráfico rola; começa mostrando os meses mais recentes
    rolagem.scrollLeft = rolagem.scrollWidth;

    if (r.maisBarato) {
        insight_grafico.textContent =
            `Em média, você gasta ${moeda(r.media)} por mês. ` +
            `O mês mais barato foi ${mesMinusculo(r.maisBarato.chave)} (${moeda(r.maisBarato.total)}) ` +
            `e o mais caro foi ${mesMinusculo(r.maisCaro.chave)} (${moeda(r.maisCaro.total)}).`;
    } else {
        insight_grafico.textContent = "Faça compras em outros meses para ver a comparação entre eles.";
    }
}



// ---------- 5. MÊS CONTRA MÊS ----------
function renderizarMeses() {
    const r = calcularResumo();
    lista_meses.innerHTML = "";

    // do mais recente para o mais antigo
    [...meses].reverse().forEach(mes => {
        const indice = meses.indexOf(mes);
        const anterior = indice > 0 ? meses[indice - 1] : null;

        const card = el("div", "cartao card_mes");

        // título + selos
        const cabecalho = el("div", "cabecalho_mes");
        const esquerda = el("div", "titulo_mes_bloco");
        esquerda.appendChild(el("p", "nome_mes", mesCompleto(mes.chave)));
        if (mes === r.maisBarato) esquerda.appendChild(el("span", "selo verde", "Mais barato"));
        if (mes === r.maisCaro) esquerda.appendChild(el("span", "selo vermelho", "Mais caro"));
        cabecalho.append(esquerda, el("p", "total_mes", moeda(mes.total)));
        card.appendChild(cabecalho);

        card.appendChild(el("p", "meta_mes", `${plural(mes.compras, "compra", "compras")} · ${plural(mes.itens, "item", "itens")}`));

        // comparação com o mês anterior
        if (anterior && anterior.total > 0) {
            const diferenca = mes.total - anterior.total;
            if (Math.abs(diferenca) < 0.005) {
                card.appendChild(el("span", "chip_variacao igual", `Igual a ${mesMinusculo(anterior.chave)}`));
            } else {
                const menos = diferenca < 0;
                card.appendChild(
                    el("span", `chip_variacao ${menos ? "desce" : "sobe"}`,
                        `${menos ? "↓" : "↑"} ${pct((diferenca / anterior.total) * 100)} ${menos ? "menos" : "mais"} que em ${mesMinusculo(anterior.chave)}`)
                );
                card.appendChild(el("p", "detalhe_variacao", `${moeda(Math.abs(diferenca))} a ${menos ? "menos" : "mais"}`));
            }
        } else if (!anterior) {
            card.appendChild(el("p", "detalhe_variacao", "Primeiro mês registrado"));
        }

        // orçamento: quanto do limite foi usado
        const economia = economiaDoMes(mes);
        if (economia !== null) {
            const usado = (mes.gastoComOrcamento / mes.orcamento) * 100;
            const estourou = economia < 0;

            const bloco = el("div", "bloco_orcamento");

            const linha = el("div", "linha_orcamento");
            linha.append(
                el("span", "", "Orçamento usado"),
                el("span", "orcamento_valores", `${moeda(mes.gastoComOrcamento)} de ${moeda(mes.orcamento)}`)
            );

            const trilho = el("div", "trilho_orcamento");
            const preenchimento = el("div", `preenchimento_orcamento ${estourou ? "estourou" : "ok"}`);
            preenchimento.style.width = `${Math.min(100, usado)}%`;
            trilho.appendChild(preenchimento);

            bloco.append(
                linha,
                trilho,
                el("p", `texto_orcamento ${estourou ? "sobe" : "desce"}`,
                    estourou ? `Passou ${moeda(Math.abs(economia))} do limite` : `Sobraram ${moeda(economia)} do limite`),
                el("p", "nota_orcamento", "Considera só as compras em que você definiu um orçamento.")
            );
            card.appendChild(bloco);
        }

        lista_meses.appendChild(card);
    });
}



// ---------- 6. PRODUTOS QUE MUDARAM DE PREÇO ----------
function produtosComDiferenca() {
    const mapa = new Map();

    // meses já estão em ordem cronológica; guarda o preço médio de cada produto em cada mês
    meses.forEach(mes => {
        mes.produtos.forEach((prod, chave) => {
            let item = mapa.get(chave);
            if (!item) {
                item = { nome: prod.nome, precos: [] };
                mapa.set(chave, item);
            }
            item.precos.push({ mes: mes.chave, preco: prod.somaPrecos / prod.vezes });
        });
    });

    return [...mapa.values()]
        .filter(item => item.precos.length >= 2) // precisa ter aparecido em 2 meses ou mais
        .map(item => {
            const valores = item.precos.map(p => p.preco);
            item.min = Math.min(...valores);
            item.max = Math.max(...valores);
            item.diferenca = item.max - item.min;
            item.primeiro = item.precos[0];
            item.ultimo = item.precos[item.precos.length - 1];

            const mudanca = item.ultimo.preco - item.primeiro.preco;
            item.variacaoPct = item.primeiro.preco > 0 ? (mudanca / item.primeiro.preco) * 100 : 0;
            item.direcao = mudanca > 0.005 ? "subiu" : mudanca < -0.005 ? "caiu" : "oscilou";
            return item;
        })
        .filter(item => item.diferenca > 0.005) // ignora produtos que nunca mudaram de preço
        .sort((a, b) => b.diferenca - a.diferenca);
}

// mini gráfico de linha (SVG) com o preço do produto mês a mês
const SVG_NS = "http://www.w3.org/2000/svg";

function elSvg(tag, atributos) {
    const e = document.createElementNS(SVG_NS, tag);
    Object.keys(atributos).forEach(nome => e.setAttribute(nome, atributos[nome]));
    return e;
}

function criarGraficoPreco(item) {
    const W = 320, H = 124, margemX = 30, topo = 30, base = 26;
    const n = item.precos.length;
    const faixa = (item.max - item.min) || 1;

    const px = i => (n === 1 ? W / 2 : margemX + i * ((W - 2 * margemX) / (n - 1)));
    const py = v => topo + (1 - (v - item.min) / faixa) * (H - topo - base);

    const svg = elSvg("svg", {
        viewBox: `0 0 ${W} ${H}`,
        class: "grafico_preco",
        role: "img",
        "aria-label": `Preço de ${item.nome} mês a mês`
    });

    svg.appendChild(elSvg("line", { x1: 10, x2: W - 10, y1: H - base + 6, y2: H - base + 6, class: "eixo_preco" }));
    svg.appendChild(elSvg("polyline", {
        points: item.precos.map((p, i) => `${px(i)},${py(p.preco)}`).join(" "),
        class: "linha_preco_grafico"
    }));

    // com muitos meses, só rotula o primeiro, o último, o menor e o maior preço
    const idxMin = item.precos.findIndex(p => p.preco === item.min);
    const idxMax = item.precos.findIndex(p => p.preco === item.max);
    const rotulados = n <= 6 ? null : new Set([0, n - 1, idxMin, idxMax]);

    item.precos.forEach((p, i) => {
        const classe = p.preco === item.min ? "ponto_barato" : p.preco === item.max ? "ponto_caro" : "ponto_neutro";
        svg.appendChild(elSvg("circle", { cx: px(i), cy: py(p.preco), r: 5, class: classe }));

        if (!rotulados || rotulados.has(i)) {
            const preco = elSvg("text", { x: px(i), y: py(p.preco) - 10, "text-anchor": "middle", class: "rotulo_preco_grafico" });
            preco.textContent = moeda(p.preco);
            const mes = elSvg("text", { x: px(i), y: H - 6, "text-anchor": "middle", class: "rotulo_mes_grafico" });
            mes.textContent = mesAbreviado(p.mes);
            svg.append(preco, mes);
        }
    });

    return svg;
}

let filtroProdutos = "todos"; // "todos" | "subiu" | "caiu"
let listaDiferencas = [];

function desenharListaProdutos() {
    lista_diferencas.innerHTML = "";

    const lista = listaDiferencas.filter(item => filtroProdutos === "todos" || item.direcao === filtroProdutos);

    if (lista.length === 0) {
        lista_diferencas.appendChild(el("p", "aviso_gastos", "Nenhum produto nessa situação."));
        return;
    }

    lista.forEach(item => {
        const card = el("div", "cartao card_diferenca");

        const cabecalho = el("div", "cabecalho_mes");
        cabecalho.appendChild(el("p", "nome_mes", item.nome));

        const chip = item.direcao === "subiu"
            ? el("span", "chip_variacao sobe", `↑ Subiu ${pct(item.variacaoPct)}`)
            : item.direcao === "caiu"
                ? el("span", "chip_variacao desce", `↓ Caiu ${pct(item.variacaoPct)}`)
                : el("span", "chip_variacao igual", "Oscilou");
        cabecalho.appendChild(chip);
        card.appendChild(cabecalho);

        card.appendChild(
            el("p", "meta_mes",
                `De ${moeda(item.primeiro.preco)} em ${mesAbreviado(item.primeiro.mes)} para ${moeda(item.ultimo.preco)} em ${mesAbreviado(item.ultimo.mes)}`)
        );

        card.appendChild(criarGraficoPreco(item));

        // dica prática: onde estava mais barato / mais caro (o mês mais recente, se houver empate)
        const mesBarato = [...item.precos].reverse().find(p => p.preco === item.min);
        const mesCaro = [...item.precos].reverse().find(p => p.preco === item.max);
        const dicas = el("div", "dicas_preco");
        dicas.append(
            el("p", "dica_barata", `Mais barato em ${mesMinusculo(mesBarato.mes)}: ${moeda(item.min)}`),
            el("p", "dica_cara", `Mais caro em ${mesMinusculo(mesCaro.mes)}: ${moeda(item.max)}`)
        );
        card.appendChild(dicas);

        lista_diferencas.appendChild(card);
    });
}

function renderizarProdutos() {
    listaDiferencas = produtosComDiferenca();
    filtros_produtos.innerHTML = "";
    lista_diferencas.innerHTML = "";

    if (meses.length < 2) {
        lista_diferencas.appendChild(el("p", "aviso_gastos", "Precisamos de compras em pelo menos 2 meses para comparar os preços."));
        return;
    }
    if (listaDiferencas.length === 0) {
        lista_diferencas.appendChild(el("p", "aviso_gastos", "Nenhum produto teve preço diferente entre os meses. Boa notícia!"));
        return;
    }

    const subiram = listaDiferencas.filter(i => i.direcao === "subiu").length;
    const cairam = listaDiferencas.filter(i => i.direcao === "caiu").length;

    const opcoes = [
        ["todos", `Todos (${listaDiferencas.length})`],
        ["subiu", `Ficaram mais caros (${subiram})`],
        ["caiu", `Ficaram mais baratos (${cairam})`]
    ];

    const botoes = opcoes.map(([valor, texto]) => {
        const botao = el("button", "filtro_produto", texto);
        botao.type = "button";
        botao.addEventListener("click", () => {
            filtroProdutos = valor;
            botoes.forEach((b, i) => {
                const ativo = opcoes[i][0] === valor;
                b.classList.toggle("ativo", ativo);
                b.setAttribute("aria-pressed", String(ativo));
            });
            desenharListaProdutos();
        });
        return botao;
    });

    botoes.forEach((b, i) => {
        const ativo = opcoes[i][0] === filtroProdutos;
        b.classList.toggle("ativo", ativo);
        b.setAttribute("aria-pressed", String(ativo));
        filtros_produtos.appendChild(b);
    });

    desenharListaProdutos();
}



// ---------- INÍCIO ----------
if (meses.length === 0) {
    sec_vazio.hidden = false;
} else {
    conteudo_gastos.hidden = false;
    renderizarDestaque();
    renderizarResumo();
    renderizarGrafico();
    renderizarMeses();
    renderizarProdutos();
}