import 'dart:async';

import 'package:flutter/material.dart';

import '../../../app_controller.dart';
import '../../../core/network/api_client.dart';
import '../../../core/realtime/realtime_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../operations/data/operations_repository.dart';
import '../../orders/presentation/order_builder_page.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key, required this.controller});
  final AppController controller;
  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int index = 0;
  int refreshVersion = 0;
  late final OperationsRepository repository;
  late final RealtimeService realtime;
  @override
  void initState() {
    super.initState();
    repository = OperationsRepository(ApiClient(widget.controller.store));
    realtime = RealtimeService(
      store: widget.controller.store,
      onOperationsChanged: () {
        if (mounted) setState(() => refreshVersion++);
      },
    );
    realtime.start();
  }

  @override
  void dispose() {
    realtime.stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      _Overview(
        controller: widget.controller,
        onNavigate: (value) => setState(() => index = value),
      ),
      _Tables(
        repository,
        key: ValueKey('tables-$refreshVersion'),
        onOrderSaved: _orderSaved,
      ),
      _DailyMenu(repository),
      _Orders(repository, key: ValueKey('orders-$refreshVersion')),
    ];
    return Scaffold(
      appBar: AppBar(
        toolbarHeight: 68,
        title: Text(
          widget.controller.session!.restaurantName,
          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
        ),
        actions: [
          IconButton(
            iconSize: 28,
            tooltip: 'Cerrar sesión',
            onPressed: widget.controller.logout,
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: IndexedStack(index: index, children: pages),
      bottomNavigationBar: NavigationBar(
        height: 76,
        selectedIndex: index,
        onDestinationSelected: (value) => setState(() => index = value),
        labelTextStyle: WidgetStateProperty.all(
          const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
        ),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined, size: 27),
            selectedIcon: Icon(Icons.home, size: 27),
            label: 'Inicio',
          ),
          NavigationDestination(
            icon: Icon(Icons.table_restaurant_outlined, size: 27),
            selectedIcon: Icon(Icons.table_restaurant, size: 27),
            label: 'Mesas',
          ),
          NavigationDestination(
            icon: Icon(Icons.restaurant_menu_outlined, size: 27),
            selectedIcon: Icon(Icons.restaurant_menu, size: 27),
            label: 'Menú',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined, size: 27),
            selectedIcon: Icon(Icons.receipt_long, size: 27),
            label: 'Pedidos',
          ),
        ],
      ),
    );
  }

  void _orderSaved() => setState(() {
    refreshVersion++;
    index = 3;
  });
}

class _Overview extends StatelessWidget {
  const _Overview({required this.controller, required this.onNavigate});
  final AppController controller;
  final ValueChanged<int> onNavigate;
  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.all(20),
    children: [
      Text(
        'Hola, ${controller.session!.userEmail.split('@').first}',
        style: Theme.of(context).textTheme.headlineLarge,
      ),
      const SizedBox(height: 8),
      Text(
        'Tu turno en ${controller.session!.restaurantName}',
        style: const TextStyle(fontSize: 17, color: AppTheme.muted),
      ),
      const SizedBox(height: 24),
      _BigAction(
        icon: Icons.add_circle_outline,
        title: 'Tomar un pedido',
        subtitle: 'Selecciona primero una mesa o tipo de servicio',
        onTap: () => onNavigate(1),
      ),
      const SizedBox(height: 14),
      _BigAction(
        icon: Icons.restaurant_menu,
        title: 'Consultar menú del día',
        subtitle: 'Mira rápidamente qué productos están disponibles',
        onTap: () => onNavigate(2),
      ),
      const SizedBox(height: 14),
      _BigAction(
        icon: Icons.receipt_long,
        title: 'Pedidos activos',
        subtitle: 'Consulta el estado de los pedidos enviados',
        onTap: () => onNavigate(3),
      ),
    ],
  );
}

class _BigAction extends StatelessWidget {
  const _BigAction({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });
  final IconData icon;
  final String title, subtitle;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Card(
    child: InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            Container(
              width: 58,
              height: 58,
              decoration: BoxDecoration(
                color: const Color(0xFFDCEBE2),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(icon, size: 31, color: AppTheme.forest),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 5),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 15,
                      color: AppTheme.muted,
                      height: 1.35,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, size: 30),
          ],
        ),
      ),
    ),
  );
}

class _Tables extends StatelessWidget {
  const _Tables(this.repository, {super.key, required this.onOrderSaved});
  final OperationsRepository repository;
  final VoidCallback onOrderSaved;

  Future<void> _open(BuildContext context, Map<String, dynamic>? table) async {
    Map<String, dynamic>? existing;
    if (table?['status'] == 'occupied') {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => const Center(child: CircularProgressIndicator()),
      );
      try {
        final orders = await repository.orders();
        existing = orders.cast<Map<String, dynamic>?>().firstWhere(
          (order) =>
              order?['table_id'] == table?['id'] &&
              !['paid', 'cancelled', 'refunded'].contains(order?['status']),
          orElse: () => null,
        );
      } finally {
        if (context.mounted) Navigator.pop(context);
      }
      if (existing == null && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('No se encontró el pedido activo de esta mesa'),
          ),
        );
        return;
      }
    }
    if (!context.mounted) return;
    final saved = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => OrderBuilderPage(
          repository: repository,
          initialTable: table,
          existingOrder: existing,
        ),
      ),
    );
    if (saved == true) onOrderSaved();
  }

  @override
  Widget build(BuildContext context) => Stack(
    children: [
      _AsyncView(
        refreshEvery: const Duration(seconds: 15),
        loader: repository.tables,
        builder: (data, refresh) => RefreshIndicator(
          onRefresh: refresh,
          child: GridView.builder(
            padding: const EdgeInsets.all(18),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.2,
            ),
            itemCount: data.length,
            itemBuilder: (_, i) {
              final table = data[i], busy = table['status'] == 'occupied';
              return Card(
                color: busy ? const Color(0xFFFFF2EE) : Colors.white,
                child: InkWell(
                  borderRadius: BorderRadius.circular(18),
                  onTap: () => _open(context, Map<String, dynamic>.from(table)),
                  child: Padding(
                    padding: const EdgeInsets.all(17),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          Icons.table_restaurant,
                          size: 31,
                          color: busy ? Colors.deepOrange : AppTheme.forest,
                        ),
                        const Spacer(),
                        Text(
                          table['name'] ?? 'Mesa',
                          style: const TextStyle(
                            fontSize: 21,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          busy ? 'Ocupada' : 'Libre',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: busy ? Colors.deepOrange : AppTheme.forest,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
      Positioned(
        right: 18,
        bottom: 18,
        child: FloatingActionButton.extended(
          onPressed: () => _open(context, null),
          icon: const Icon(Icons.add),
          label: const Text('Nuevo pedido'),
        ),
      ),
    ],
  );
}

class _DailyMenu extends StatefulWidget {
  const _DailyMenu(this.repository);
  final OperationsRepository repository;
  @override
  State<_DailyMenu> createState() => _DailyMenuState();
}

class _DailyMenuState extends State<_DailyMenu> {
  String category = 'Todos';
  @override
  Widget build(BuildContext context) {
    return _AsyncView(
      loader: widget.repository.dailyMenu,
      builder: (raw, refresh) {
        final menu = raw['menu'];
        final items = (menu?['daily_menu_items'] as List? ?? [])
            .where((item) => item['availability'] != 'sold_out')
            .toList();
        final categories = <String>{
          'Todos',
          ...items.map(
            (item) =>
                item['products']?['product_categories']?['name'] ?? 'Otros',
          ),
        }.toList();
        final visible = category == 'Todos'
            ? items
            : items
                  .where(
                    (item) =>
                        (item['products']?['product_categories']?['name'] ??
                            'Otros') ==
                        category,
                  )
                  .toList();
        return RefreshIndicator(
          onRefresh: refresh,
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(18, 18, 18, 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Menú disponible',
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      const SizedBox(height: 14),
                      SizedBox(
                        height: 52,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: categories.length,
                          separatorBuilder: (_, _) => const SizedBox(width: 8),
                          itemBuilder: (_, i) => ChoiceChip(
                            label: Text(
                              categories[i],
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            selected: category == categories[i],
                            onSelected: (_) =>
                                setState(() => category = categories[i]),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 10,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(18, 0, 18, 24),
                sliver: SliverList.separated(
                  itemCount: visible.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (_, i) {
                    final item = visible[i], product = item['products'];
                    return Card(
                      child: ListTile(
                        minVerticalPadding: 16,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 18,
                          vertical: 6,
                        ),
                        title: Text(
                          product?['name'] ?? 'Producto',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        subtitle: Padding(
                          padding: const EdgeInsets.only(top: 5),
                          child: Text(
                            item['remaining_quantity'] == null
                                ? 'Disponible sin límite'
                                : '${item['remaining_quantity']} disponibles',
                            style: const TextStyle(fontSize: 15),
                          ),
                        ),
                        trailing: Text(
                          '\$${Money.simple(product?['price'])}',
                          style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                            color: AppTheme.forest,
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _Orders extends StatelessWidget {
  const _Orders(this.repository, {super.key});
  final OperationsRepository repository;
  @override
  Widget build(BuildContext context) => _AsyncView(
    refreshEvery: const Duration(seconds: 15),
    loader: repository.orders,
    builder: (data, refresh) {
      final active = data
          .where(
            (order) =>
                !['paid', 'cancelled', 'refunded'].contains(order['status']),
          )
          .toList();
      return RefreshIndicator(
        onRefresh: refresh,
        child: ListView.separated(
          padding: const EdgeInsets.all(18),
          itemCount: active.length,
          separatorBuilder: (_, _) => const SizedBox(height: 10),
          itemBuilder: (_, i) {
            final order = active[i];
            return Card(
              child: ListTile(
                onTap:
                    ['paid', 'cancelled', 'refunded'].contains(order['status'])
                    ? null
                    : () async {
                        final saved = await Navigator.push<bool>(
                          context,
                          MaterialPageRoute(
                            builder: (_) => OrderBuilderPage(
                              repository: repository,
                              existingOrder: Map<String, dynamic>.from(order),
                            ),
                          ),
                        );
                        if (saved == true) await refresh();
                      },
                onLongPress:
                    ['paid', 'cancelled', 'refunded'].contains(order['status'])
                    ? null
                    : () async {
                        final confirmed = await showDialog<bool>(
                          context: context,
                          builder: (dialogContext) => AlertDialog(
                            title: Text(
                              'Cancelar pedido #${order['order_number']}',
                            ),
                            content: const Text(
                              'Se liberará la mesa y se devolverán las existencias.',
                            ),
                            actions: [
                              TextButton(
                                onPressed: () =>
                                    Navigator.pop(dialogContext, false),
                                child: const Text('Volver'),
                              ),
                              FilledButton(
                                onPressed: () =>
                                    Navigator.pop(dialogContext, true),
                                child: const Text('Cancelar pedido'),
                              ),
                            ],
                          ),
                        );
                        if (confirmed == true) {
                          try {
                            await repository.cancelOrder('${order['id']}');
                            await refresh();
                          } catch (e) {
                            if (context.mounted)
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text(e.toString())),
                              );
                          }
                        }
                      },
                contentPadding: const EdgeInsets.all(17),
                title: Text(
                  'Pedido #${order['order_number']}',
                  style: const TextStyle(
                    fontSize: 19,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                subtitle: Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                    order['dining_tables']?['name'] ??
                        order['customer_name'] ??
                        'Cliente',
                    style: const TextStyle(fontSize: 16),
                  ),
                ),
                trailing: Text(
                  _status(order['status']),
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: AppTheme.forest,
                  ),
                ),
              ),
            );
          },
        ),
      );
    },
  );
  String _status(dynamic value) => switch (value) {
    'preparing' => 'Preparando',
    'ready' => 'Listo',
    _ => 'Nuevo',
  };
}

class _AsyncView extends StatefulWidget {
  const _AsyncView({
    required this.loader,
    required this.builder,
    this.refreshEvery,
  });
  final Future<dynamic> Function() loader;
  final Widget Function(dynamic, Future<void> Function()) builder;
  final Duration? refreshEvery;
  @override
  State<_AsyncView> createState() => _AsyncViewState();
}

class _AsyncViewState extends State<_AsyncView> {
  dynamic data;
  String? error;
  bool loading = true;
  Timer? timer;
  @override
  void initState() {
    super.initState();
    load();
    if (widget.refreshEvery != null)
      timer = Timer.periodic(widget.refreshEvery!, (_) => load());
  }

  @override
  void dispose() {
    timer?.cancel();
    super.dispose();
  }

  Future<void> load() async {
    try {
      final result = await widget.loader();
      if (mounted)
        setState(() {
          data = result;
          error = null;
          loading = false;
        });
    } catch (e) {
      if (mounted)
        setState(() {
          error = e.toString();
          loading = false;
        });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (loading) return const Center(child: CircularProgressIndicator());
    if (error != null)
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.cloud_off, size: 54, color: AppTheme.muted),
              const SizedBox(height: 14),
              Text(
                error!,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 17),
              ),
              const SizedBox(height: 18),
              FilledButton(onPressed: load, child: const Text('Reintentar')),
            ],
          ),
        ),
      );
    return widget.builder(data, load);
  }
}

abstract final class Money {
  static String simple(dynamic value) =>
      double.tryParse('$value')?.round().toString().replaceAllMapped(
        RegExp(r'\B(?=(\d{3})+(?!\d))'),
        (_) => '.',
      ) ??
      '0';
}
