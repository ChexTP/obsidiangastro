import 'dart:async';
import 'package:flutter/foundation.dart';

import 'core/storage/secure_session_store.dart';
import 'features/auth/data/auth_repository.dart';

enum AppStatus { loading, signedOut, signedIn }

class AppController extends ChangeNotifier {
  AppController(this.store) : auth = AuthRepository(store);
  final SecureSessionStore store;
  final AuthRepository auth;
  AppStatus status = AppStatus.loading;
  StoredSession? session;
  String? error;
  Timer? _heartbeat;

  Future<void> initialize() async {
    session = await store.read();
    status = session == null ? AppStatus.signedOut : AppStatus.signedIn;
    if (session != null) _startHeartbeat();
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    error = null;
    notifyListeners();
    try {
      session = await auth.login(email, password);
      status = AppStatus.signedIn;
      _startHeartbeat();
    } catch (e) {
      error = e.toString();
      status = AppStatus.signedOut;
      rethrow;
    } finally {
      notifyListeners();
    }
  }

  Future<void> logout() async {
    _heartbeat?.cancel();
    await auth.logout(session);
    session = null;
    status = AppStatus.signedOut;
    notifyListeners();
  }

  void _startHeartbeat() {
    _heartbeat?.cancel();
    _heartbeat = Timer.periodic(
      const Duration(minutes: 2),
      (_) => auth.heartbeat(session!).catchError((_) {}),
    );
  }

  @override
  void dispose() {
    _heartbeat?.cancel();
    super.dispose();
  }
}
