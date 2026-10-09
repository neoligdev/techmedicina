// Network only: never cache health screens, API responses, preferences or credentials.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  if (
    event.request.mode !== "navigate" ||
    new URL(event.request.url).origin !== self.location.origin ||
    !/^\/app(?:\/|$)/.test(new URL(event.request.url).pathname)
  )
    return;
  event.respondWith(
    fetch(event.request, { cache: "no-store" }).catch(
      () =>
        new Response(
          '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Techmedicina · sem conexão</title><body style="margin:0;background:#061321;color:#f3f7fc;font:16px system-ui;padding:32px"><h1>Você está sem conexão</h1><p>Conecte-se à internet para abrir o aplicativo. Nenhum dado de saúde foi guardado para acesso offline.</p><a href="/app/" style="color:#b9d85d">Tentar novamente</a></body></html>',
          { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 },
        ),
    ),
  );
});
