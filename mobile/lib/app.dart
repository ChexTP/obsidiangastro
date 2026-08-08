import 'package:flutter/material.dart';
import 'app_controller.dart';
import 'core/storage/secure_session_store.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/presentation/login_page.dart';
import 'features/home/presentation/home_shell.dart';

class ObsidianGastroApp extends StatefulWidget {
  const ObsidianGastroApp({super.key});
  @override
  State<ObsidianGastroApp> createState() => _ObsidianGastroAppState();
}

class _ObsidianGastroAppState extends State<ObsidianGastroApp> {
  late final AppController controller;
  @override
  void initState() {
    super.initState();
    controller = AppController(SecureSessionStore())..addListener(_refresh);
    controller.initialize();
  }

  void _refresh() => setState(() {});
  @override
  void dispose() {
    controller.removeListener(_refresh);
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => MaterialApp(
    debugShowCheckedModeBanner: false,
    title: 'Obsidian Gastro',
    theme: AppTheme.light,
    home: switch (controller.status) {
      AppStatus.loading => const _Splash(),
      AppStatus.signedOut => LoginPage(controller: controller),
      AppStatus.signedIn => HomeShell(controller: controller),
    },
  );
}

class _Splash extends StatelessWidget {
  const _Splash();
  @override
  Widget build(BuildContext context) => const Scaffold(
    body: Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircularProgressIndicator(),
          SizedBox(height: 18),
          Text(
            'Preparando tu turno',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
          ),
        ],
      ),
    ),
  );
}
