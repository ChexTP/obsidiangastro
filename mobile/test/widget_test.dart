import 'package:flutter_test/flutter_test.dart';
import 'package:obsidian_gastro_mobile/app.dart';

void main() {
  testWidgets('muestra la aplicación', (tester) async {
    await tester.pumpWidget(const ObsidianGastroApp());
    expect(find.text('Preparando tu turno'), findsOneWidget);
  });
}
