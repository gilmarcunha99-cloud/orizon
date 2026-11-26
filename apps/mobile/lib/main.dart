import 'package:material_ui/material_ui.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'core/env.dart';
import 'core/theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (Env.supabaseConfigured) {
    await Supabase.initialize(url: Env.supabaseUrl, publishableKey: Env.supabaseAnonKey);
  }
  runApp(const OrizonPassApp());
}

class OrizonPassApp extends StatelessWidget {
  const OrizonPassApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: Env.isProd ? 'Orizon Pass' : 'Orizon Pass HML',
      debugShowCheckedModeBanner: false,
      theme: orizonLight.copyWith(scaffoldBackgroundColor: OzColors.cloudMist),
      builder: (context, child) => Env.isProd
          ? child!
          : Banner(
              message: Env.appEnv == 'homolog' ? 'HML' : 'LOCAL',
              location: BannerLocation.topEnd,
              color: OzColors.energyPulseOrange,
              textStyle: const TextStyle(color: OzColors.deepHorizonBlue, fontWeight: FontWeight.w700, fontSize: 11),
              child: child!,
            ),
      home: const InicioPage(),
    );
  }
}

/// Tela provisória. As telas de login aprovadas (Entrar, digital, Esqueci minha senha,
/// cadastro de Visitante) entram na próxima entrega da Fase 1.
class InicioPage extends StatelessWidget {
  const InicioPage({super.key});

  @override
  Widget build(BuildContext context) {
    final texto = Theme.of(context).textTheme;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SvgPicture.asset('assets/brand/orizon-sports-horizontal.svg', width: 190, semanticsLabel: 'Orizon Sports'),
                    const SizedBox(width: 12),
                    Text('Pass', style: GoogleFonts.oswald(fontSize: 24, fontWeight: FontWeight.w600, color: OzColors.orangeText)),
                  ],
                ),
                const SizedBox(height: 24),
                Text(
                  Env.supabaseConfigured ? 'Conectado ao ambiente ${Env.appEnv}.' : 'Ambiente ainda não configurado.',
                  style: texto.bodyMedium,
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
