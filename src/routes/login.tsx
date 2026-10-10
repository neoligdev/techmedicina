import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@/features/auth/login-page";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar e criar conta — PlugPix Techmedicina" },
      {
        name: "description",
        content: "Acesse sua conta PlugPix Techmedicina ou cadastre-se com e-mail e Google.",
      },
      { property: "og:title", content: "Entrar e criar conta — PlugPix Techmedicina" },
      {
        property: "og:description",
        content: "Cadastro e acesso seguro à sua conta PlugPix Techmedicina.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});
