/** Configuração por ambiente. Os valores vêm das variáveis da Vercel (ou de .env.local). */
export type AppEnv = "local" | "homolog" | "prod";

export const appEnv: AppEnv = (process.env.NEXT_PUBLIC_APP_ENV as AppEnv) || "local";

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** false enquanto o projeto Supabase do ambiente não estiver configurado. */
export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0";
