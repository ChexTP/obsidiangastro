import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../../operations/data/operations_repository.dart';

class OrderBuilderPage extends StatefulWidget {
  const OrderBuilderPage({
    super.key,
    required this.repository,
    this.initialTable,
    this.existingOrder,
  });
  final OperationsRepository repository;
  final Map<String, dynamic>? initialTable;
  final Map<String, dynamic>? existingOrder;

  @override
  State<OrderBuilderPage> createState() => _OrderBuilderPageState();
}

class _OrderBuilderPageState extends State<OrderBuilderPage> {
  bool loading = true, saving = false;
  String? error;
  int step = 1, activePreparation = 0;
  String serviceType = 'table', tableId = '', category = 'Todos', search = '';
  final customer = TextEditingController();
  final notes = TextEditingController();
  final fee = TextEditingController(text: '0');
  List<dynamic> tables = [], products = [], templates = [];
  List<List<String>> preparations = [];
  Map<String, int> individuals = {}, previousUsage = {};

  @override
  void initState() {
    super.initState();
    final order = widget.existingOrder;
    serviceType =
        order?['service_type'] ??
        (widget.initialTable == null ? 'table' : 'table');
    tableId = order?['table_id'] ?? widget.initialTable?['id'] ?? '';
    customer.text = order?['customer_name'] ?? '';
    notes.text = order?['notes'] ?? '';
    fee.text = '${order?['service_fee'] ?? 0}';
    _load();
  }

  Future<void> _load() async {
    try {
      final result = await Future.wait([
        widget.repository.tables(),
        widget.repository.dailyMenu(),
        widget.repository.templates(),
      ]);
      tables = result[0] as List;
      final menu = (result[1] as Map<String, dynamic>)['menu'];
      products = (menu?['daily_menu_items'] as List? ?? [])
          .where(
            (item) =>
                item['availability'] == 'available' &&
                item['products']?['is_active'] == true &&
                item['products']?['product_type'] != 'composite',
          )
          .map(
            (item) => <String, dynamic>{
              ...Map<String, dynamic>.from(item['products']),
              'price': item['price_override'] ?? item['products']['price'],
              'remainingQuantity': item['remaining_quantity'],
            },
          )
          .toList();
      templates = result[2] as List;
      _restoreOrder();
      if (mounted) setState(() => loading = false);
    } catch (e) {
      if (mounted)
        setState(() {
          error = e.toString();
          loading = false;
        });
    }
  }

  void _restoreOrder() {
    final items = widget.existingOrder?['order_items'] as List? ?? [];
    preparations = items
        .where((item) => item['line_type'] == 'preparation')
        .map(
          (item) => (item['selections'] as List? ?? [])
              .map((selection) => '${selection['productId']}')
              .toList(),
        )
        .toList();
    individuals = {
      for (final item in items.where(
        (item) =>
            item['line_type'] != 'preparation' && item['product_id'] != null,
      ))
        '${item['product_id']}': int.tryParse('${item['quantity']}') ?? 0,
    };
    previousUsage = {...individuals};
    for (final preparation in preparations) {
      for (final id in preparation)
        previousUsage[id] = (previousUsage[id] ?? 0) + 1;
    }
    if (preparations.isEmpty) preparations = [[]];
  }

  List<String> get categories => <String>{
    'Todos',
    ...products.map((p) => p['product_categories']?['name'] ?? 'Otros'),
  }.toList();
  List<dynamic> get visibleProducts => products.where((p) {
    final name = '${p['name']}'.toLowerCase();
    final productCategory = p['product_categories']?['name'] ?? 'Otros';
    return (category == 'Todos' || category == productCategory) &&
        name.contains(search.toLowerCase());
  }).toList();
  int used(String id) =>
      (individuals[id] ?? 0) +
      preparations.expand((e) => e).where((item) => item == id).length;
  int? capacity(String id) {
    final product = products.cast<Map<String, dynamic>?>().firstWhere(
      (p) => p?['id'] == id,
      orElse: () => null,
    );
    if (product?['remainingQuantity'] == null) return null;
    return (int.tryParse('${product?['remainingQuantity']}') ?? 0) +
        (previousUsage[id] ?? 0);
  }

  bool canAdd(String id) => capacity(id) == null || used(id) < capacity(id)!;

  Map<String, dynamic> recognize(List<String> ids) {
    final ingredients = ids
        .map(
          (id) => products.cast<Map<String, dynamic>?>().firstWhere(
            (p) => p?['id'] == id,
            orElse: () => null,
          ),
        )
        .whereType<Map<String, dynamic>>()
        .toList();
    final matches =
        templates
            .where(
              (template) =>
                  template['is_active'] == true &&
                  (template['template_requirements'] as List? ?? []).every(
                    (requirement) =>
                        ingredients
                            .where(
                              (p) =>
                                  p['category_id'] ==
                                  requirement['category_id'],
                            )
                            .length >=
                        (num.tryParse('${requirement['quantity']}') ?? 0),
                  ),
            )
            .toList()
          ..sort(
            (a, b) => (b['template_requirements'] as List).length.compareTo(
              (a['template_requirements'] as List).length,
            ),
          );
    final template = matches.isEmpty ? null : matches.first;
    final included = <int>{};
    if (template != null) {
      for (final requirement
          in (template['template_requirements'] as List)..sort(
            (a, b) => (a['sort_order'] ?? 0).compareTo(b['sort_order'] ?? 0),
          )) {
        var remaining = int.tryParse('${requirement['quantity']}') ?? 0;
        for (var i = 0; i < ingredients.length && remaining > 0; i++) {
          if (!included.contains(i) &&
              ingredients[i]['category_id'] == requirement['category_id']) {
            included.add(i);
            remaining--;
          }
        }
      }
    }
    var total = template == null
        ? 0.0
        : double.tryParse('${template['base_price']}') ?? 0;
    for (var i = 0; i < ingredients.length; i++) {
      total +=
          double.tryParse(
            '${template != null && included.contains(i) ? ingredients[i]['template_surcharge'] : ingredients[i]['price']}',
          ) ??
          0;
    }
    return {
      'name': template?['name'] ?? 'Selección individual',
      'ingredients': ingredients,
      'total': total,
    };
  }

  double get total {
    var value = preparations
        .where((p) => p.isNotEmpty)
        .fold<double>(0, (sum, p) => sum + (recognize(p)['total'] as double));
    individuals.forEach((id, quantity) {
      final product = products.cast<Map<String, dynamic>?>().firstWhere(
        (p) => p?['id'] == id,
        orElse: () => null,
      );
      value += (double.tryParse('${product?['price']}') ?? 0) * quantity;
    });
    if (serviceType != 'table') value += double.tryParse(fee.text) ?? 0;
    return value;
  }

  void toggleIngredient(String id) {
    if (preparations.isEmpty) preparations.add([]);
    final selected = preparations[activePreparation].contains(id);
    if (!selected && !canAdd(id))
      return _message('No quedan unidades disponibles');
    setState(
      () => selected
          ? preparations[activePreparation].remove(id)
          : preparations[activePreparation].add(id),
    );
  }

  void changeIndividual(String id, int change) {
    if (change > 0 && !canAdd(id))
      return _message('No quedan unidades disponibles');
    setState(
      () => individuals[id] = ((individuals[id] ?? 0) + change).clamp(0, 999),
    );
  }

  void _message(String value) => ScaffoldMessenger.of(
    context,
  ).showSnackBar(SnackBar(content: Text(value)));

  Future<void> save() async {
    final nonempty = preparations.where((p) => p.isNotEmpty).toList();
    final itemPayload = individuals.entries
        .where((e) => e.value > 0)
        .map((e) => {'productId': e.key, 'quantity': e.value})
        .toList();
    if (nonempty.isEmpty && itemPayload.isEmpty)
      return _message('Agrega al menos un producto');
    if (serviceType == 'table' && tableId.isEmpty)
      return _message('Selecciona una mesa');
    setState(() => saving = true);
    final payload = {
      'serviceType': serviceType,
      'tableId': serviceType == 'table' ? tableId : null,
      'customerName': customer.text.trim().isEmpty
          ? null
          : customer.text.trim(),
      'notes': notes.text.trim().isEmpty ? null : notes.text.trim(),
      'serviceFee': serviceType == 'table' ? 0 : double.tryParse(fee.text) ?? 0,
      'preparations': nonempty.map((p) => {'ingredientIds': p}).toList(),
      'items': itemPayload,
    };
    try {
      if (widget.existingOrder == null) {
        await widget.repository.createOrder(payload);
      } else {
        await widget.repository.updateOrder(
          '${widget.existingOrder!['id']}',
          payload,
        );
      }
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) {
        setState(() => saving = false);
        _message(e.toString());
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (loading)
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.existingOrder == null
              ? 'Nuevo pedido'
              : 'Editar pedido #${widget.existingOrder!['order_number']}',
        ),
      ),
      body: error != null
          ? _errorView()
          : step == 1
          ? _serviceStep()
          : _productsStep(),
    );
  }

  Widget _errorView() => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            error!,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 17),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: () {
              setState(() {
                loading = true;
                error = null;
              });
              _load();
            },
            child: const Text('Reintentar'),
          ),
        ],
      ),
    ),
  );

  Widget _serviceStep() => ListView(
    padding: const EdgeInsets.all(18),
    children: [
      Text(
        '¿Cómo se entregará?',
        style: Theme.of(context).textTheme.headlineSmall,
      ),
      const SizedBox(height: 16),
      SegmentedButton<String>(
        segments: const [
          ButtonSegment(
            value: 'table',
            label: Text('Mesa'),
            icon: Icon(Icons.table_restaurant),
          ),
          ButtonSegment(
            value: 'takeaway',
            label: Text('Llevar'),
            icon: Icon(Icons.shopping_bag_outlined),
          ),
          ButtonSegment(
            value: 'delivery',
            label: Text('Domicilio'),
            icon: Icon(Icons.delivery_dining),
          ),
        ],
        selected: {serviceType},
        onSelectionChanged: (value) =>
            setState(() => serviceType = value.first),
        showSelectedIcon: false,
      ),
      const SizedBox(height: 20),
      if (serviceType == 'table') ...[
        const Text(
          'Mesa disponible',
          style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 9,
          runSpacing: 9,
          children: tables
              .where(
                (table) =>
                    table['status'] == 'free' ||
                    table['id'] == widget.existingOrder?['table_id'],
              )
              .map(
                (table) => ChoiceChip(
                  label: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Text(
                      table['name'],
                      style: const TextStyle(fontSize: 17),
                    ),
                  ),
                  selected: tableId == table['id'],
                  onSelected: (_) => setState(() => tableId = table['id']),
                ),
              )
              .toList(),
        ),
      ] else ...[
        TextField(
          controller: customer,
          decoration: const InputDecoration(labelText: 'Nombre del cliente'),
        ),
        const SizedBox(height: 14),
        TextField(
          controller: fee,
          keyboardType: TextInputType.number,
          decoration: InputDecoration(
            labelText: serviceType == 'delivery'
                ? 'Costo de domicilio'
                : 'Costo de empaque',
            prefixText: r'$ ',
          ),
        ),
      ],
      const SizedBox(height: 14),
      TextField(
        controller: notes,
        minLines: 2,
        maxLines: 4,
        decoration: InputDecoration(
          labelText: serviceType == 'delivery'
              ? 'Dirección y observaciones'
              : 'Observaciones',
        ),
      ),
      const SizedBox(height: 22),
      FilledButton(
        onPressed: () {
          if (serviceType == 'table' && tableId.isEmpty)
            return _message('Selecciona una mesa disponible');
          setState(() => step = 2);
        },
        child: const Text('Continuar al menú'),
      ),
    ],
  );

  Widget _productsStep() => Column(
    children: [
      SizedBox(
        height: 54,
        child: ListView.separated(
          padding: const EdgeInsets.fromLTRB(14, 7, 14, 5),
          scrollDirection: Axis.horizontal,
          itemCount: categories.length,
          separatorBuilder: (_, _) => const SizedBox(width: 7),
          itemBuilder: (_, i) => ChoiceChip(
            label: Text(categories[i]),
            selected: category == categories[i],
            onSelected: (_) => setState(() => category = categories[i]),
          ),
        ),
      ),
      Padding(
        padding: const EdgeInsets.fromLTRB(14, 7, 14, 8),
        child: TextField(
          onChanged: (value) => setState(() => search = value),
          decoration: const InputDecoration(
            labelText: 'Buscar en el menú',
            prefixIcon: Icon(Icons.search),
          ),
        ),
      ),
      SizedBox(
        height: 74,
        child: ListView.separated(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
          scrollDirection: Axis.horizontal,
          itemCount: preparations.length + 1,
          separatorBuilder: (_, _) => const SizedBox(width: 8),
          itemBuilder: (_, i) {
            if (i == preparations.length)
              return OutlinedButton.icon(
                onPressed: () => setState(() {
                  preparations.add([]);
                  activePreparation = preparations.length - 1;
                }),
                icon: const Icon(Icons.add),
                label: const Text('Otra preparación'),
              );
            final info = recognize(preparations[i]);
            return InputChip(
              label: Text('${i + 1}. ${info['name']}'),
              selected: activePreparation == i,
              onSelected: (_) => setState(() => activePreparation = i),
              deleteIcon: preparations.length > 1
                  ? const Icon(Icons.close, size: 18)
                  : null,
              onDeleted: preparations.length > 1
                  ? () => setState(() {
                      preparations.removeAt(i);
                      activePreparation = 0;
                    })
                  : null,
            );
          },
        ),
      ),
      Expanded(
        child: visibleProducts.isEmpty
            ? const Center(
                child: Text(
                  'No hay productos disponibles',
                  style: TextStyle(fontSize: 17),
                ),
              )
            : GridView.builder(
                padding: const EdgeInsets.fromLTRB(14, 6, 14, 120),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 10,
                  mainAxisSpacing: 10,
                  childAspectRatio: .88,
                ),
                itemCount: visibleProducts.length,
                itemBuilder: (_, i) {
                  final product = visibleProducts[i],
                      id = '${product['id']}',
                      selected = preparations[activePreparation].contains(id),
                      extras = individuals[id] ?? 0;
                  return Card(
                    color: selected ? const Color(0xFFDCEBE2) : Colors.white,
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Expanded(
                            child: InkWell(
                              onTap: () => toggleIngredient(id),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    product['name'],
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                  const SizedBox(height: 5),
                                  Text(
                                    product['product_categories']?['name'] ??
                                        'Otros',
                                    style: const TextStyle(
                                      color: AppTheme.muted,
                                    ),
                                  ),
                                  const Spacer(),
                                  if (product['remainingQuantity'] != null)
                                    Text(
                                      '${product['remainingQuantity']} disponibles',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  Text(
                                    '\$${_money(product['price'])}',
                                    style: const TextStyle(
                                      fontSize: 17,
                                      fontWeight: FontWeight.w800,
                                      color: AppTheme.forest,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const Divider(),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              IconButton(
                                onPressed: extras > 0
                                    ? () => changeIndividual(id, -1)
                                    : null,
                                icon: const Icon(Icons.remove_circle_outline),
                              ),
                              Text(
                                '$extras extra',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              IconButton(
                                onPressed: canAdd(id)
                                    ? () => changeIndividual(id, 1)
                                    : null,
                                icon: const Icon(Icons.add_circle_outline),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
      ),
      Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: Color(0xFFD8E1DC))),
        ),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        child: SafeArea(
          top: false,
          child: Row(
            children: [
              OutlinedButton(
                onPressed: () => setState(() => step = 1),
                child: const Text('Atrás'),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton(
                  onPressed: saving ? null : save,
                  child: Text(
                    saving ? 'Enviando...' : 'Enviar · \$${_money(total)}',
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    ],
  );

  String _money(dynamic value) => (double.tryParse('$value') ?? 0)
      .round()
      .toString()
      .replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => '.');
}
