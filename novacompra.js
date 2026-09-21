const menu_esquerdo = document.querySelector(".menu_esquerdo")

menu_esquerdo.addEventListener("click", function(){
    window.location.href = "index.html"
});




const botao_adicionar_produto = document.getElementById("botao_adicionar_produto")
const lista_de_compras = document.getElementById("lista_de_compras")
const total_qtd = document.getElementById("total_qtd")
const total_preço = document.getElementById("total_preço")

// acumuladores — começam zerados, fora do listener pra persistir entre cliques
let soma_qtd = 0;
let soma_preço = 0;

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

    const nova_div = document.createElement("div")
    nova_div.classList.add("nova_div_produto");
    const produto = document.createElement("p")
    produto.classList.add("infoproduto");
    const preço = document.createElement("p")
    preço.classList.add("infoproduto");
    const qtd = document.createElement("p")
    qtd.classList.add("infoproduto");

    produto.textContent = nome_produto;
    preço.textContent = `Preço: R$ ${preço_produto_numero.toFixed(2)}`;
    qtd.textContent = `Quantidade: ${qtd_produto_numero}`;
    nova_div.append(produto,preço,qtd)
    lista_de_compras.appendChild(nova_div)

    // soma o item atual no total geral
    soma_qtd += qtd_produto_numero;
    soma_preço += preço_produto_numero * qtd_produto_numero; // preço total do item = preço unitário × quantidade

    // atualiza o que aparece na tela
    total_qtd.textContent = soma_qtd;
    total_preço.textContent = `R$${soma_preço.toFixed(2)}`;
})



const botao_finalizar_compra = document.getElementById("botao_finalizar_compra")
botao_finalizar_compra.addEventListener("click", function(){
    const nome = nome_compra.value;
    const data = data_compra.value;

    if (!nome.trim()) {
        alert("Preencha o nome da compra");
        return;
    }

    const compra = {
        nome: nome,
        data: data,
        qtd: soma_qtd,
        total: soma_preço
    };

    localStorage.setItem("ultimaCompra", JSON.stringify(compra));
    // pega o histórico que já existe (ou array vazio se for a primeira compra)
    const historico = JSON.parse(localStorage.getItem("historicoCompras")) || [];
    
    // adiciona a nova compra no final
    historico.push(compra);
    
    // salva o array atualizado de volta
    localStorage.setItem("historicoCompras", JSON.stringify(historico));
    
    window.location.href = "index.html"
})



const nome_compra = document.getElementById("nome_compra")
const data_compra = document.getElementById("data_compra")
const orçamento_compra = document.getElementById("orçamento_compra")