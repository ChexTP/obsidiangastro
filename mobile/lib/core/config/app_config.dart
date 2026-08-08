abstract final class AppConfig {
  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    // Produccion por defecto: el APK instalado nunca depende de localhost.
    // Para desarrollo local se puede sobrescribir con --dart-define.
    defaultValue: 'https://obsidiangastro.onrender.com/api',
  );
}
