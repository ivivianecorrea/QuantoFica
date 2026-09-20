const menu_esquerdo = document.querySelector(".menu_esquerdo")

menu_esquerdo.addEventListener("click", function(){
    window.location.href = "index.html"
});




const botao_adicionar_produto = document.getElementById("botao_adicionar_produto")
const lista_de_compras = document.getElementById("lista_de_compras")

botao_adicionar_produto.addEventListener("click", function(){
    const nome_produto = document.getElementById("nome_produto").value
    const preço_produto = document.getElementById("preço_produto").value
    const qtd_produto = document.getElementById("qtd_produto").value

    if (!nome_produto.trim()) {
        alert("Preencha o nome do produto");
        return;
        elseif (preço_produto.trim())
        alert("Preencha o preço do produto");
        return;
}

    const nova_div = document.createElement("div")
    const produto = document.createElement("p")
    const preço = document.createElement("p")
    const qtd = document.createElement("p")
    nova_div.append(produto,preço,qtd)
    lista_de_compras.appendChild(nova_div)
})


const nome_compra = document.getElementById("nome_compra")
const data_compra = document.getElementById("data_compra")
const orçamento_compra = document.getElementById("orçamento_compra")