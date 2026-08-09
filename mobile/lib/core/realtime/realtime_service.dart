import 'dart:async';
import 'dart:convert';

import 'package:web_socket_channel/web_socket_channel.dart';

import '../config/app_config.dart';
import '../storage/secure_session_store.dart';

class RealtimeService {
  RealtimeService({required this.store, required this.onOperationsChanged});
  final SecureSessionStore store;
  final void Function() onOperationsChanged;
  WebSocketChannel? _channel;
  StreamSubscription? _subscription;
  Timer? _retry;
  bool _stopped = false;

  Future<void> start() async {
    _stopped = false;
    await _connect();
  }

  Future<void> _connect() async {
    if (_stopped) return;
    final session = await store.read();
    if (session == null) return;
    final api = Uri.parse(AppConfig.apiBaseUrl);
    final uri = api.replace(
      scheme: api.scheme == 'https' ? 'wss' : 'ws',
      path: '/realtime',
      query: null,
    );
    try {
      final channel = WebSocketChannel.connect(uri);
      _channel = channel;
      await channel.ready;
      channel.sink.add(
        jsonEncode({
          'type': 'auth',
          'accessToken': session.accessToken,
          'tenantId': session.tenantId,
        }),
      );
      _subscription = channel.stream.listen(
        (raw) {
          try {
            final message = jsonDecode('$raw');
            if (message['type'] == 'operations.changed') onOperationsChanged();
          } catch (_) {}
        },
        onDone: _scheduleReconnect,
        onError: (_) => _scheduleReconnect(),
        cancelOnError: true,
      );
    } catch (_) {
      _scheduleReconnect();
    }
  }

  void _scheduleReconnect() {
    _subscription?.cancel();
    _channel = null;
    if (_stopped || _retry?.isActive == true) return;
    _retry = Timer(const Duration(seconds: 3), _connect);
  }

  Future<void> stop() async {
    _stopped = true;
    _retry?.cancel();
    await _subscription?.cancel();
    await _channel?.sink.close();
  }
}
