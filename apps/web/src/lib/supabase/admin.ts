import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lib/env";

/**
 * Cliente com a chave secreta, só no servidor: usado para enviar o convite que cria a conta.
 * Retorna null quando a chave não está configurada na Vercel.
 */
export function createAdminClient() {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !chave) return null;
  return createClient(supabaseUrl, chave, { auth: { autoRefreshToken: false, persistSession: false } });
}
