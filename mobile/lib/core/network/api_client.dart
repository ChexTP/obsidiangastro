import 'dart:convert';
import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import '../storage/secure_session_store.dart';
import 'api_exception.dart';

class ApiClient {
  ApiClient(this.store);
  final SecureSessionStore store;

  Future<dynamic> request(
    String path, {
    String method = 'GET',
    Map<String, dynamic>? body,
    bool authenticated = true,
    bool retry = true,
  }) async {
    final session = authenticated ? await store.read() : null;
    final response = http.Request(
      method,
      Uri.parse('${AppConfig.apiBaseUrl}$path'),
    );
    response.headers.addAll({
      'Content-Type': 'application/json',
      if (session != null) 'Authorization': 'Bearer ${session.accessToken}',
      if (session != null) 'X-Tenant-Id': session.tenantId,
    });
    response.body = body == null ? '' : jsonEncode(body);
    final streamed = await response.send();
    final result = await http.Response.fromStream(streamed);
    if (result.statusCode == 401 &&
        authenticated &&
        retry &&
        session != null &&
        await _refresh(session))
      return request(path, method: method, body: body, retry: false);
    final decoded = result.body.isEmpty ? null : jsonDecode(result.body);
    if (result.statusCode < 200 || result.statusCode >= 300)
      throw ApiException(
        decoded?['message'] ??
            decoded?['error'] ??
            'No fue posible completar la solicitud',
        statusCode: result.statusCode,
      );
    return decoded;
  }

  Future<bool> _refresh(StoredSession current) async {
    try {
      final data = await request(
        '/auth/refresh',
        method: 'POST',
        body: {'refreshToken': current.refreshToken},
        authenticated: false,
        retry: false,
      );
      await store.write(
        current.copyWith(
          accessToken: data['session']['accessToken'],
          refreshToken: data['session']['refreshToken'],
        ),
      );
      return true;
    } catch (_) {
      await store.clear();
      return false;
    }
  }
}
