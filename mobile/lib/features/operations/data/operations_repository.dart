import '../../../core/network/api_client.dart';

class OperationsRepository {
  OperationsRepository(this.api);
  final ApiClient api;
  Future<List<dynamic>> tables() async =>
      (await api.request('/operations/tables') as List? ?? []);
  Future<List<dynamic>> orders() async =>
      (await api.request('/operations/orders') as List? ?? []);
  Future<Map<String, dynamic>> dailyMenu() async {
    final now = DateTime.now();
    final date =
        '${now.year.toString().padLeft(4, '0')}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
    return Map<String, dynamic>.from(
      await api.request('/operations/daily-menu?date=$date'),
    );
  }
}
