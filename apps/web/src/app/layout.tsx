import type { Metadata } from "next";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "@fontsource/oswald/500.css";
import "@fontsource/oswald/600.css";
import { appEnv } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orizon Pass",
  description: "Orizon Pass: plataforma de eventos esportivos Orizon Sports.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        {appEnv !== "prod" && (
          <div className="env-banner" role="note">
            {appEnv === "homolog" ? "Ambiente de homologação: dados de teste" : "Ambiente local de desenvolvimento"}
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
