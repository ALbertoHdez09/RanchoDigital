# RanchoDigital — Documentación Completa

> Guía completa del proyecto: arquitectura, flujos de funcionamiento y referencia técnica.
> Escrita para que cualquier persona pueda entenderla, aunque no sepa programar.

---

## ¿Qué es RanchoDigital?

Una aplicación móvil para Android que ayuda a los ganaderos a administrar su rancho desde el celular. Permite registrar animales, llevar el historial médico, controlar el inventario de medicamentos, generar reportes en PDF y escanear aretes con la cámara.

**Funciona con o sin internet.** Cuando no hay señal, los datos se guardan en el celular y se sincronizan automáticamente cuando regresa la conexión.

**Objetivo principal:** Que el ranchero en el campo pueda escanear el arete de un animal y ver al instante toda su información — tratamientos pendientes, historial médico, peso, genealogía — sin necesitar computadora, Excel ni señal de internet.

---

## Flujos de funcionamiento

### Flujo 1 — Registro e inicio de sesión

```
Usuario abre la app por primera vez
        ↓
Pantalla de Login
        ↓
¿Tiene cuenta?
    ├── SÍ → Ingresa correo y contraseña → Entra al Inicio
    └── NO → Toca "Regístrate aquí"
              ↓
              Llena: nombre del rancho, correo, contraseña
              (Requisitos: 8+ caracteres, mayúscula, minúscula, número)
              ↓
              Supabase envía email de confirmación
              ↓
              Usuario confirma → puede iniciar sesión

¿Olvidó la contraseña?
    → Toca "¿Olvidaste tu contraseña?"
    → Ingresa su correo
    → Recibe email con link de reset
    → Toca el link → abre la app → crea nueva contraseña
```

---

### Flujo 2 — Registrar un animal nuevo

```
Desde el Inicio → "Agregar Nuevo Animal"
        ↓
Formulario de registro:
  - Número de arete (obligatorio)
  - Nombre (opcional)
  - Raza (obligatorio)
  - Peso inicial
  - Género (Macho/Hembra)
  - Etapa/Estado
  - Fin productivo
  - Fecha de nacimiento (selector con día/mes/año)
  - Genealogía: padre y madre (opcional, busca por arete)
        ↓
¿Hay internet?
    ├── SÍ → Guarda en Supabase → actualiza caché local
    └── NO → Guarda en caché local → encola para sincronizar
        ↓
Regresa al inventario con el animal registrado
```

---

### Flujo 3 — Escanear un arete (flujo principal)

```
Desde el Inicio → "Escanear"
        ↓
Se abre la cámara
        ↓
Modo QR/Código de barras (predeterminado):
    → Apunta al código del arete
    → Detecta automáticamente
    → Busca el número en el inventario
        ↓
Modo Detección IA:
    → Apunta la cámara al arete
    → Toca "Detectar Arete"
    → ML Kit lee el texto del arete en el dispositivo (sin internet)
    → Busca el número en el inventario
        ↓
¿Encontró el animal?
    ├── SÍ → Muestra su perfil completo
    │         (General, Pesos, Salud)
    └── NO → Ofrece registrarlo con el número prellenado

¿Hay internet para la búsqueda?
    ├── SÍ → Busca en Supabase
    └── NO → Busca en el caché local del celular
```

---

### Flujo 4 — Ver perfil de un animal

```
Toca cualquier animal en la lista
        ↓
Pantalla de perfil con 3 pestañas:

PESTAÑA GENERAL:
  - Datos básicos (arete, nombre, raza, género, peso, estado, propósito)
  - Fecha de nacimiento y edad calculada automáticamente
  - Banner amarillo si la etapa no coincide con la edad
    → Toca el banner para actualizar la etapa automáticamente
  - Genealogía: padre y madre (tocables para ver su perfil)
  - Descendencia: lista de crías registradas
  - Botón de opciones (⋮): editar datos, eliminar animal

PESTAÑA PESOS:
  - Peso actual y ganancia desde el último pesaje
  - Botón "Registrar Nuevo Peso"
  - Historial completo de pesajes con fechas

PESTAÑA SALUD:
  - Historial médico completo
  - Filtros: Todos / Pendiente / Completado
  - Cada tratamiento tiene opciones (⋮):
    → Marcar como Completado
    → Marcar como Pendiente
    → Eliminar
  - Todo funciona offline
```

---

### Flujo 5 — Programar un tratamiento médico

```
Desde Actividades → "Nueva Actividad"
        ↓
Seleccionar animal (buscar por arete o nombre)
        ↓
Elegir tipo:
    ├── RUTINA (preventivo):
    │     - Agregar productos (vacunas, vitaminas)
    │     - Fecha y hora para cada dosis
    │     - Se pueden agregar múltiples dosis
    │
    └── ENFERMEDAD (tratamiento):
          - Diagnóstico
          - Medicamento y número de días
          - Fecha de inicio
        ↓
Al guardar:
  1. Se crea el plan médico en la BD
  2. Se descuenta automáticamente del inventario de medicamentos
  3. Se programan notificaciones locales para cada dosis
  4. Si no hay internet → se encola para sincronizar
        ↓
Aparece en la pantalla de Actividades con indicador de urgencia:
  🔴 Rojo = ya venció
  🟡 Amarillo = vence en 3 días o menos
  🟢 Verde = hay tiempo
```

---

### Flujo 6 — Inventario de medicamentos

```
Pestaña Inventario
        ↓
Lista ordenada por urgencia:
  1. Sin stock (cantidad = 0)
  2. Stock bajo (cantidad ≤ límite mínimo configurado)
  3. Disponible
        ↓
Cada medicamento muestra:
  - Nombre y tipo (color por tipo)
  - Cantidad disponible y unidad
  - Badge de estado (Sin stock / Stock bajo / Disponible)
        ↓
Agregar nuevo medicamento → FAB (+):
  - Nombre, tipo, unidad
  - Cantidad disponible
  - Cantidad mínima de alerta
  - Descripción opcional
        ↓
Editar → toca cualquier medicamento
Eliminar → desde el formulario de edición (ícono de basura)

DESCUENTO AUTOMÁTICO:
  Cuando se crea un tratamiento con un medicamento,
  el sistema busca ese medicamento en el inventario
  y descuenta la cantidad automáticamente.
  Si queda por debajo del mínimo → alerta de stock bajo.
```

---

### Flujo 7 — Generar un reporte PDF

```
Pestaña Reportes
        ↓
Dos opciones:

REPORTE GENERAL (todos los animales):
  → Toca "Todos los Animales"
  → Selecciona período: 1 día / 1 semana / 1 mes /
    3 meses / 6 meses / 1 año / Todo el historial
  → Se genera PDF con:
    - Resumen (total animales, pesajes, tratamientos)
    - Tabla de inventario completo
    - Historial de pesajes del período
    - Historial de tratamientos del período
  → Se abre el menú de compartir (WhatsApp, email, etc.)

REPORTE POR ANIMAL:
  → Busca el arete en la lista
  → Selecciona el animal
  → Selecciona período
  → PDF con toda la información de ese animal en ese período
  → Compartir

NOTA: Los reportes requieren internet para obtener datos completos.
```

---

### Flujo 8 — Funcionamiento offline completo

```
El celular pierde señal
        ↓
Banner rojo aparece en la parte superior:
"Modo Sin Conexión (Datos Locales)"
        ↓
La app sigue funcionando con el caché local:
  - Ver todos los animales registrados
  - Ver historial médico y pesajes
  - Registrar nuevos animales
  - Crear tratamientos
  - Marcar dosis como completadas
  - Registrar nuevos pesajes
  - Gestionar inventario de medicamentos
        ↓
Cada operación se guarda en la "cola de espera" (sync_queue)
        ↓
Regresa la señal
        ↓
SyncManager detecta la reconexión automáticamente
        ↓
Envía todas las operaciones pendientes a Supabase en orden
        ↓
Indicador en el header del Inicio:
  ✓ Verde = todo sincronizado
  🔄 Badge con número = X operaciones pendientes
  ⚠ Amarillo = sin internet
        ↓
Cola limpia → datos sincronizados
```

---

### Flujo 9 — Etapas automáticas por edad

```
El sistema calcula la etapa esperada según edad y género:

HEMBRAS:
  0-12 meses   → Becerro / Becerra
  12-24 meses  → Vaquilla
  24+ meses    → Vientre / Producción

MACHOS:
  0-12 meses   → Becerro / Becerra
  12-24 meses  → Torete / Novillo
  24+ meses    → Torete / Novillo

Estados que NO cambian automáticamente (decisión del ganadero):
  Vaca Seca, Cargada, Enferma, Vacía, Semental
        ↓
Cuando el ganadero abre el perfil de un animal:
  Si la etapa registrada ≠ etapa esperada por edad
        ↓
  Aparece banner amarillo:
  "Etapa desactualizada — con X meses, debería ser Y"
        ↓
  Toca el banner → actualiza automáticamente (offline-first)
```

---

### Flujo 10 — Configuración del rancho

```
Pestaña Ajustes
        ↓
MI GANADERÍA:
  - Cambiar nombre del rancho (se guarda en nube y localmente)
  - Ver correo de la cuenta
  - Subir logo del rancho (aparece en la pantalla de Inicio)

APARIENCIA:
  - 6 colores predefinidos
  - Color personalizado con selector de tono/saturación/brillo
  - Input HEX manual

PREFERENCIAS:
  - Notificaciones de salud (on/off)
  - Peso en libras (on/off)

INVENTARIO:
  - Límite mínimo de alerta (número de unidades)

DATOS:
  - Limpiar caché local (borra datos del celular, se recargan con internet)

CUENTA:
  - Contactar soporte → abre email prellenado a ranchodigital.desarrollo@gmail.com
  - Cerrar sesión
```

---

## Estructura de carpetas

```
RanchoDigital/
├── app/                          ← Pantallas de la app
│   ├── (tabs)/                   ← Las 5 pestañas del menú inferior
│   │   ├── index.tsx             ← Inicio (dashboard)
│   │   ├── inventario.tsx        ← Inventario de medicamentos
│   │   ├── salud.tsx             ← Actividades / tratamientos
│   │   ├── reportes.tsx          ← Generación de reportes PDF
│   │   ├── ajustes.tsx           ← Configuración
│   │   └── _layout.tsx           ← Configuración del menú
│   ├── animal/[id].tsx           ← Perfil detallado de un animal
│   ├── detalle-salud/[id].tsx    ← Tratamientos de un animal
│   ├── lista-animales.tsx        ← Lista filtrada (todos/machos/hembras)
│   ├── nuevo-animal.tsx          ← Formulario nuevo animal
│   ├── nuevo-registro-medico.tsx ← Programar tratamiento/rutina
│   ├── nuevo-tratamiento.tsx     ← Registro médico rápido
│   ├── nuevo-plan.tsx            ← Plan médico con múltiples dosis
│   ├── escaner.tsx               ← Cámara para escanear aretes
│   ├── login.tsx                 ← Inicio de sesión
│   ├── registro.tsx              ← Registro de cuenta nueva
│   ├── recuperar-contrasena.tsx  ← Recuperación de contraseña
│   └── _layout.tsx               ← Configuración raíz (sesión, red, sync)
│
├── src/
│   ├── components/               ← Piezas reutilizables de la interfaz
│   │   ├── DatePickerModal.tsx   ← Selector de fecha con scroll
│   │   ├── FormularioVaca.tsx    ← Formulario completo de animal
│   │   ├── ModalAlerta.tsx       ← Alertas personalizadas
│   │   ├── FormularioAnimal/     ← Secciones del formulario
│   │   └── PerfilAnimal/         ← Pestañas del perfil
│   ├── context/                  ← Estado global
│   │   ├── ThemeContext.tsx      ← Color de la app
│   │   └── NetworkContext.tsx    ← Estado de la red
│   ├── services/                 ← Conexiones con servicios externos
│   │   ├── supabase.ts           ← Base de datos en la nube (con Fast-Fail Timeout)
│   │   ├── localDB.ts            ← Base de datos SQLite ultrarrápida para caché
│   │   ├── offlineService.ts     ← Gestor de caché asistido por localDB
│   │   ├── syncService.ts        ← Sincronización automática
│   │   ├── authService.ts        ← Autenticación
│   │   ├── inventarioService.ts  ← Descuento automático de stock
│   │   └── areteScannerService.ts← Detección de aretes con IA
│   ├── types/                    ← Definiciones de tipos de datos
│   │   └── index.ts
│   └── utils/                    ← Herramientas auxiliares
│       └── etapaAnimal.ts        ← Cálculo de etapas por edad
│
├── assets/
│   ├── images/                   ← Íconos e imágenes
│   └── models/                   ← Modelo de IA (arete_detector.tflite)
│
├── .env                          ← Credenciales privadas (NO subir a GitHub)
├── app.json                      ← Configuración de la app
├── eas.json                      ← Configuración de builds
└── DOCUMENTACION.md              ← Este archivo
```

---

## Servicios

### `supabase.ts` — Base de datos en la nube
Conexión con Supabase (PostgreSQL + Auth). La sesión segura se custodia en el celular. Implementamos una estrategia de **"Fast-Fail" a los 4 segundos** en redes débiles para que la app aborte las llamadas "trabadas" de internet y caiga inmediatamente a mostrar los datos offline, evitando que parezca congelada en granjas.

### `localDB.ts` y `offlineService.ts` — Caché veloz en SQLite
Se reemplazó el obsoleto AsyncStorage por un puente con `expo-sqlite`. Esto permite guardar miles de animales e historiales en el teléfono de manera ultrarrápida sin que la app colapse la memoria RAM. `offlineService.ts` asiste para decidir cuándo un dato "expiró" en base a sus minutos de viejo.

### `syncService.ts` — Sincronización automática a prueba de balas
Cuando el usuario hace cambios sin internet, los guarda en una "cola de espera". Al regresar la señal, se suben a la nube. Está protegido con la política **"Last-Write-Wins"**: si alguien editó el mismo animal desde otra cuenta en la nube mientras tú estabas offline, el motor de sincronismo compara quién tiene el dato más fresco y respeta el último en guardarse sin destrozar la base de datos de los demás.
Maneja casos especiales:
- Planes médicos con múltiples dosis (los desempaca antes de enviar)
- Resolución de Conflictos vía `updated_at`

### `inventarioService.ts` — Descuento de stock
Cuando se crea un tratamiento, busca el medicamento por nombre en el inventario y descuenta la cantidad. Funciona offline — descuenta del caché y encola el UPDATE para sincronizar. Retorna qué medicamentos quedaron con stock bajo.

### `areteScannerService.ts` — Detección de aretes con IA
Usa Google ML Kit Text Recognition que corre 100% en el dispositivo (sin internet, sin límites, sin costo). Lee el texto visible en la imagen, filtra los patrones que parecen números de arete (3-8 dígitos) y devuelve el más probable.

### `authService.ts` — Autenticación
- Login con email y contraseña
- Login con Google (OAuth — requiere configuración adicional en producción)
- Registro con validación: 8+ caracteres, mayúscula, minúscula, número
- Recuperación de contraseña vía email

---

## Tipos de datos

| Tipo | Descripción |
|------|-------------|
| `Animal` | Un animal del rancho (arete, raza, género, peso, estado, etc.) |
| `Pesaje` | Un registro de peso de un animal en una fecha |
| `DosisMedica` | Una dosis de medicamento programada |
| `PlanMedico` | Un plan de tratamiento que agrupa varias dosis |
| `Medicamento` | Un medicamento en el inventario |
| `TareaSync` | Una operación pendiente de sincronizar |
| `CacheEntry<T>` | Un dato guardado localmente con su timestamp |
| `EstadoAnimal` | Etapa del animal (Becerro, Vaquilla, Vientre, etc.) |
| `TipoMedicamento` | Categoría del medicamento (Vacuna, Vitamina, etc.) |

---

## Base de datos (tablas en Supabase)

| Tabla | Qué guarda |
|-------|-----------|
| `animales` | Todos los animales registrados |
| `pesajes` | Historial de pesos por animal |
| `planes_medicos` | Planes de tratamiento |
| `dosis_medicas` | Dosis individuales de cada plan |
| `medicamentos` | Inventario de medicamentos |
| `perfiles` | Configuración del usuario (nombre rancho, color, logo, etc.) |
| `registros_salud` | Registros médicos rápidos |

---

## Variables de entorno (`.env`)

Archivo con las "llaves" para conectarse a los servicios externos. **Nunca debe subirse a GitHub.**

| Variable | Para qué sirve |
|----------|----------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Dirección del servidor de base de datos |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Llave pública de Supabase |
| `EXPO_PUBLIC_ROBOFLOW_API_KEY` | Llave de la API de Roboflow (detección de aretes) |
| `EXPO_PUBLIC_GOOGLE_VISION_KEY` | Llave de Google Vision para OCR |

---

## Etapas del ganado bovino por edad

Basado en literatura veterinaria bovina:

| Etapa | Género | Rango de edad |
|-------|--------|---------------|
| Becerro / Becerra | Ambos | 0 — 12 meses |
| Vaquilla | Hembra | 12 — 24 meses |
| Torete / Novillo | Macho | 12 — 24+ meses |
| Vientre / Producción | Hembra | 24+ meses |
| Semental | Macho | Decisión del ganadero |
| Vaca Seca | Hembra | Decisión del ganadero |
| Cargada / Enferma / Vacía | Ambos | Decisión del ganadero |

---

## Tecnologías usadas

| Tecnología | Para qué |
|-----------|---------|
| React Native 0.81 | Base de la app móvil |
| Expo 54 | Herramientas y módulos nativos |
| Expo Router 6 | Navegación entre pantallas |
| Supabase | Base de datos y autenticación en la nube |
| expo-sqlite | Base de datos local robusta (offline-first) |
| ML Kit Text Recognition | Lectura de texto en imágenes (IA, on-device) |
| expo-image-manipulator | Procesamiento de imágenes |
| expo-image-picker | Selección de fotos de la galería |
| expo-print + expo-sharing | Generación y compartición de PDFs |
| expo-notifications | Notificaciones locales programadas |
| lucide-react-native | Íconos de la interfaz |
| FlashList | Listas de alto rendimiento |
| LinearGradient | Fondos degradados en login/registro |

---

## Guía de build y despliegue

### APK para pruebas (EAS Build)

```bash
# 1. Instalar EAS CLI
npm install -g eas-cli

# 2. Iniciar sesión en expo.dev
eas login

# 3. Desde la carpeta del proyecto
cd RanchoDigital
eas build -p android --profile preview
```

El build tarda 10-20 minutos en los servidores de Expo. Al terminar entrega un link de descarga del APK.

### Para Play Store (producción)

```bash
eas build -p android --profile production
```

Genera un AAB firmado listo para subir a Google Play Console.

---

## Configuraciones necesarias en Supabase

### Redirect URL para recuperación de contraseña
`Authentication → URL Configuration → Redirect URLs`
Agregar: `ranchodigital://reset-password`

### Buckets de Storage
- `scans` — público — para imágenes temporales del escáner IA
- `logos` — público — para logos de ranchos

### Columnas adicionales en `perfiles`
```sql
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS color_preferido TEXT;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS notificaciones_on BOOLEAN DEFAULT true;
```

### Índices recomendados para rendimiento
```sql
CREATE INDEX IF NOT EXISTS idx_animales_user_id ON animales(user_id);
CREATE INDEX IF NOT EXISTS idx_animales_arete ON animales(arete_siniiga);
CREATE INDEX IF NOT EXISTS idx_dosis_estado ON dosis_medicas(estado);
CREATE INDEX IF NOT EXISTS idx_planes_animal_id ON planes_medicos(animal_id);
CREATE INDEX IF NOT EXISTS idx_pesajes_animal_id ON pesajes(animal_id);
```

---

## Contacto y soporte

**Email de soporte:** ranchodigital.desarrollo@gmail.com

El botón "Contactar a Soporte" en Ajustes abre automáticamente el cliente de email con el asunto y el correo de la cuenta prellenados.
