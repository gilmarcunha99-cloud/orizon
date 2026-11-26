/// Configuração do ambiente, passada na compilação:
///   flutter run --flavor homolog --dart-define-from-file=env/homolog.json
class Env {
  static const appEnv = String.fromEnvironment('APP_ENV', defaultValue: 'local');
  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

  static bool get isProd => appEnv == 'prod';
  static bool get supabaseConfigured => supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;
}
