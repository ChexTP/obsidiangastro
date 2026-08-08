import 'dart:convert';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:http/http.dart' as http;

import '../../../core/config/app_config.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/storage/secure_session_store.dart';

class AuthRepository {
  AuthRepository(this.store) : api = ApiClient(store);
  final SecureSessionStore store;
  final ApiClient api;

  Future<StoredSession> login(String identifier, String password) async {
    final loginResponse = await _publicPost('/auth/login', {
      'identifier': identifier.trim().toLowerCase(),
      'password': password,
    });
    final token = loginResponse['session']?['accessToken'];
    if (token == null)
      throw const ApiException('No se recibió una sesión válida');
    final profileResponse = await http.get(
      Uri.parse('${AppConfig.apiBaseUrl}/auth/me'),
      headers: {'Authorization': 'Bearer $token'},
    );
    final profile = jsonDecode(profileResponse.body);
    if (profileResponse.statusCode != 200)
      throw ApiException(
        profile['message'] ?? 'No fue posible consultar el empleado',
      );
    final memberships = (profile['memberships'] as List? ?? [])
        .where((item) => ['owner', 'admin', 'waiter'].contains(item['role']))
        .toList();
    if (memberships.isEmpty)
      throw const ApiException(
        'Esta cuenta no tiene acceso como mesero. Revisa el rol desde Administración.',
      );
    final membership = memberships.first;
    final tenant = membership['tenants'];
    var session = StoredSession(
      accessToken: token,
      refreshToken: loginResponse['session']['refreshToken'],
      tenantId: membership['tenant_id'],
      role: membership['role'],
      restaurantName: tenant?['business_name'] ?? 'Mi restaurante',
      userEmail: identifier,
    );
    await store.write(session);
    try {
      final android = await DeviceInfoPlugin().androidInfo;
      final opened = await api.request(
        '/sessions',
        method: 'POST',
        body: {
          'kind': 'mobile',
          'deviceFingerprint': 'android-${android.id}-${android.model}'
              .replaceAll(' ', '-'),
          'deviceName': '${android.manufacturer} ${android.model}',
        },
      );
      session = session.copyWith(deviceSessionId: opened['data']?['sessionId']);
      await store.write(session);
      return session;
    } catch (error) {
      await store.clear();
      rethrow;
    }
  }

  Future<void> heartbeat(StoredSession session) async {
    if (session.deviceSessionId != null)
      await api.request(
        '/sessions/${session.deviceSessionId}/heartbeat',
        method: 'POST',
      );
  }

  Future<void> logout(StoredSession? session) async {
    try {
      if (session?.deviceSessionId != null)
        await api.request(
          '/sessions/${session!.deviceSessionId}',
          method: 'DELETE',
        );
    } finally {
      await store.clear();
    }
  }

  Future<dynamic> _publicPost(String path, Map<String, dynamic> body) async {
    final response = await http.post(
      Uri.parse('${AppConfig.apiBaseUrl}$path'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300)
      throw ApiException(
        data['message'] ?? data['error'] ?? 'No fue posible iniciar sesión',
        statusCode: response.statusCode,
      );
    return data;
  }
}
