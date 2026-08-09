import '../../../core/network/api_client.dart';

class OperationsRepository {
  OperationsRepository(this.api);
  final ApiClient api;
  Future<List<dynamic>> tables() async =>
      (await api.request('/operations/tables') as List? ?? []);
  Future<List<dynamic>> orders() async =>
      (await api.request('/operations/orders') as List? ?? []);
  Future<List<dynamic>> templates() async =>
      (await api.request('/operations/templates') as List? ?? []);
  Future<dynamic> createOrder(Map<String, dynamic> data) =>
      api.request('/operations/orders', method: 'POST', body: data);
  Future<dynamic> updateOrder(String id, Map<String, dynamic> data) =>
      api.request('/operations/orders/$id', method: 'PUT', body: data);
  Future<dynamic> cancelOrder(String id) =>
      api.request('/operations/orders/$id/cancel', method: 'POST', body: {});
  Future<Map<String, dynamic>> dailyMenu() async {
    final now = DateTime.now();
    final date =
        '${now.year.toString().padLeft(4, '0')}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
    return Map<String, dynamic>.from(
      await api.request('/operations/daily-menu?date=$date'),
    );
  }
}
