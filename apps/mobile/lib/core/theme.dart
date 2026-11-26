// ORIZON SPORTS — tema Flutter derivado do BrandBook (cópia de orizon-brand/tokens/orizon_theme.dart).
import 'package:material_ui/material_ui.dart';
import 'package:google_fonts/google_fonts.dart';

class OzColors {
  static const deepHorizonBlue = Color(0xFF003E49);
  static const energyPulseOrange = Color(0xFFE48519);
  static const steelGray = Color(0xFF6C7A7A);
  static const cloudMist = Color(0xFFE4E7E7);
  static const cloudMistWarm = Color(0xFFEDE7DB);
  static const orangeText = Color(0xFF945610); // laranja para texto em fundo claro
  static const blue900 = Color(0xFF00161A);
  static const blue800 = Color(0xFF001F24);
  static const gray50 = Color(0xFFF3F4F4);
  static const gray600 = Color(0xFF566262);
  static const success = Color(0xFF1B7A4F);
  static const warning = Color(0xFF946200);
  static const danger = Color(0xFFC8372D);
}

TextTheme _text(Color c) {
  final h = GoogleFonts.poppinsTextTheme().apply(bodyColor: c, displayColor: c);
  return h.copyWith(
    displaySmall: GoogleFonts.poppins(fontSize: 32, fontWeight: FontWeight.w800, color: c),
    headlineSmall: GoogleFonts.poppins(fontSize: 24, fontWeight: FontWeight.w700, color: c),
    titleLarge: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.w700, color: c),
    titleMedium: GoogleFonts.oswald(fontSize: 16, fontWeight: FontWeight.w700, letterSpacing: 0.5, color: c),
    bodyLarge: GoogleFonts.poppins(fontSize: 16, color: c),
    bodyMedium: GoogleFonts.poppins(fontSize: 14, color: c),
  );
}

final orizonLight = ThemeData(
  useMaterial3: true,
  colorScheme: const ColorScheme.light(
    primary: OzColors.deepHorizonBlue, onPrimary: Colors.white,
    secondary: OzColors.energyPulseOrange, onSecondary: OzColors.deepHorizonBlue,
    surface: Colors.white, onSurface: OzColors.deepHorizonBlue,
    surfaceContainerHighest: OzColors.cloudMistWarm,
    outline: Color(0xFFC4CACA), error: OzColors.danger,
  ),
  scaffoldBackgroundColor: OzColors.gray50,
  textTheme: _text(OzColors.deepHorizonBlue),
);

final orizonDark = ThemeData(
  useMaterial3: true,
  colorScheme: const ColorScheme.dark(
    primary: OzColors.energyPulseOrange, onPrimary: OzColors.deepHorizonBlue,
    secondary: OzColors.energyPulseOrange, onSecondary: OzColors.deepHorizonBlue,
    surface: OzColors.blue800, onSurface: Colors.white,
    outline: Color(0xFF33656D), error: Color(0xFFF08A80),
  ),
  scaffoldBackgroundColor: OzColors.blue900,
  textTheme: _text(Colors.white),
);
