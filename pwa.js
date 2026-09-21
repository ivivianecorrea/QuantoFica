// registra o service worker (necessário para o Chrome oferecer "Instalar app")
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch(erro => console.error("Service worker:", erro));
    });
}
