import type { Metadata } from "next";
import { Oswald, Poppins } from "next/font/google";
import { appEnv } from "@/lib/env";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "Orizon Pass",
  description: "Orizon Pass: plataforma de eventos esportivos Orizon Sports.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${poppins.variable} ${oswald.variable}`}>
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
