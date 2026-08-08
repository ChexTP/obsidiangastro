# Obsidian Gastro móvil

Aplicación Android para meseros. Las cuentas se crean desde el panel web de Administración y deben tener rol `waiter`, `admin` u `owner`. La app no ofrece registro público y nunca guarda la contraseña; conserva tokens en el almacenamiento seguro del dispositivo.

## Ejecutar

Para usar el backend local desde el emulador Android:

```bash
flutter run
```

Para conectarse al backend desplegado:

```bash
flutter run --dart-define=API_BASE_URL=https://TU-BACKEND.onrender.com/api
```

La misma variable debe proporcionarse al generar el APK de producción.
