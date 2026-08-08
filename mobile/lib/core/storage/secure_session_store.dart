import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class StoredSession {
  const StoredSession({
    required this.accessToken,
    required this.refreshToken,
    required this.tenantId,
    required this.role,
    required this.restaurantName,
    required this.userEmail,
    this.deviceSessionId,
  });
  final String accessToken;
  final String refreshToken;
  final String tenantId;
  final String role;
  final String restaurantName;
  final String userEmail;
  final String? deviceSessionId;

  Map<String, dynamic> toJson() => {
    'accessToken': accessToken,
    'refreshToken': refreshToken,
    'tenantId': tenantId,
    'role': role,
    'restaurantName': restaurantName,
    'userEmail': userEmail,
    'deviceSessionId': deviceSessionId,
  };
  factory StoredSession.fromJson(Map<String, dynamic> json) => StoredSession(
    accessToken: json['accessToken'],
    refreshToken: json['refreshToken'],
    tenantId: json['tenantId'],
    role: json['role'],
    restaurantName: json['restaurantName'],
    userEmail: json['userEmail'],
    deviceSessionId: json['deviceSessionId'],
  );
  StoredSession copyWith({
    String? accessToken,
    String? refreshToken,
    String? deviceSessionId,
  }) => StoredSession(
    accessToken: accessToken ?? this.accessToken,
    refreshToken: refreshToken ?? this.refreshToken,
    tenantId: tenantId,
    role: role,
    restaurantName: restaurantName,
    userEmail: userEmail,
    deviceSessionId: deviceSessionId ?? this.deviceSessionId,
  );
}

class SecureSessionStore {
  static const _key = 'obsidian_mobile_session';
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  Future<StoredSession?> read() async {
    final raw = await _storage.read(key: _key);
    return raw == null ? null : StoredSession.fromJson(jsonDecode(raw));
  }

  Future<void> write(StoredSession session) =>
      _storage.write(key: _key, value: jsonEncode(session.toJson()));
  Future<void> clear() => _storage.delete(key: _key);
}
