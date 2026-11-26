import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:orizon_pass/main.dart';

void main() {
  setUpAll(() => GoogleFonts.config.allowRuntimeFetching = false);

  testWidgets('abre a tela inicial e avisa que o ambiente não está configurado', (tester) async {
    await tester.pumpWidget(const OrizonPassApp());
    expect(find.text('Ambiente ainda não configurado.'), findsOneWidget);
  });
}
