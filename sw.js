// Sempre que você mudar algum arquivo do site, troque o número da versão
// para o celular baixar tudo de novo.
const VERSAO = "quantofica-v1";

// arquivos guardados para o app abrir mesmo sem internet
const ARQUIVOS = [
    "./",
    "index.html",
    "produtos.html",
    "gastos.html",
    "novacompra.html",
    "style.css",
    "nav.css",
    "produtos.css",
    "gastos.css",
    "novacompra.css",
    "script.js",
    "produtos.js",
    "gastos.js",
    "novacompra.js",
    "firebase-config.js",
    "pwa.js",
    "imagens/logo_cesta.svg",
    "imagens/icon-192.png",
    "imagens/icon-512.png",
    "fontes/Poppins/Poppins-Regular.ttf",
    "fontes/Poppins/Poppins-Bold.ttf",
    "fontes/Poppins/Poppins-ExtraBold.ttf"
];

self.addEventListener("install", (evento) => {
    evento.waitUntil(
        caches.open(VERSAO).then(cache =>
            // um por um: se algum arquivo não existir, os outros continuam sendo guardados
            Promise.allSettled(ARQUIVOS.map(arquivo => cache.add(arquivo)))
        ).then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (evento) => {
    // apaga versões antigas do cache
    evento.waitUntil(
        caches.keys()
            .then(nomes => Promise.all(nomes.filter(n => n !== VERSAO).map(n => caches.delete(n))))
            .then(() => self.clients.claim())
    );
});

// tenta a internet primeiro (você sempre vê a versão mais nova); se falhar, usa o que foi guardado
self.addEventListener("fetch", (evento) => {
    const pedido = evento.request;
    if (pedido.method !== "GET") return;

    // só arquivos do próprio site; o Firebase e outros endereços seguem direto para a internet
    if (new URL(pedido.url).origin !== self.location.origin) return;

    evento.respondWith(
        fetch(pedido)
            .then(resposta => {
                if (resposta.ok) {
                    const copia = resposta.clone();
                    caches.open(VERSAO).then(cache => cache.put(pedido, copia));
                }
                return resposta;
            })
            .catch(() => caches.match(pedido, { ignoreSearch: true }))
    );
});
