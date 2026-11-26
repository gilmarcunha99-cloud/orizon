export function ConfigPending() {
  return (
    <p className="notice" role="status">
      O banco deste ambiente ainda não foi configurado. As variáveis do Supabase precisam ser cadastradas na Vercel.
    </p>
  );
}
