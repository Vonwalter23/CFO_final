# CFO del Hogar - Manual Tecnico Completo

## Descripcion General

**CFO del Hogar** es una aplicacion movil de finanzas personales para Argentina, desarrollada con React Native + Expo. La app permite gestionar ingresos, gastos, objetivos financieros y cuenta con un Agente CFO con IA (Groq) que ofrece asesoramiento financiero personalizado.

**Version**: 1.0.0  
**Paquete Android**: `com.cfohogar.app`  
**Plataforma**: Android

---

## Arquitectura del Proyecto

```
CFO_final/
├── app/                          # Rutas y pantallas (Expo Router)
│   ├── _layout.tsx               # Layout raiz con Auth y Theme providers
│   ├── index.tsx                 # Pantalla de Login
│   ├── balance-historico.tsx     # Pantalla de balance historico
│   └── (tabs)/                   # Pestanas principales
│       ├── dashboard.tsx         # Dashboard principal
│       ├── transactions.tsx      # Lista de transacciones
│       ├── add.tsx              # Agregar transaccion
│       ├── chat.tsx             # Agente CFO con IA
│       └── settings.tsx          # Configuracion
├── android/                      # Configuracion Android nativa
├── assets/                       # Recursos estaticos
├── context/                      # Contextos React
│   ├── AuthContext.tsx           # Autenticacion Google
│   └── ThemeContext.tsx          # Tema (oscuro/claro)
├── constants/                    # Constantes compartidas
│   ├── theme.ts                  # Colores, espaciado, radios
│   └── categories.ts             # Categorias de transacciones
├── services/                     # Servicios y logica de negocio
│   ├── database.ts               # Almacenamiento AsyncStorage
│   └── groq.ts                   # Integracion API Groq
├── docs/                         # Documentacion
│   └── MANUAL.md                 # Este archivo
├── .env                          # Variables de entorno (API Keys)
├── google-services.json          # Firebase (NO modificar)
└── package.json                  # Dependencias
```

---

## Credenciales y APIs

### 1. Google Sign-In (Firebase)

**Archivo**: `android/app/google-services.json`

Este archivo ya esta configurado con el proyecto `cfo-hogar-dd977`. NO modificar.

### 2. API Groq (Agente CFO)

**Archivo**: `.env`

```
EXPO_PUBLIC_GROQ_API_KEY=TU_API_KEY_AQUI
```

**Nota**: Reemplazar `TU_API_KEY_AQUI` con la API key real de Groq.

**Modelo utilizado**: `llama-3.3-70b-versatile`  
**Endpoint**: `https://api.groq.com/openai/v1/chat/completions`

### 3. Keystore Android

**Archivo**: `android/app/cfohogar.jks`

- **Alias**: `cfohogar`
- **Contrasenia keystore**: `cfohogar123`
- **Contrasenia key**: `cfohogar123`

**Importante**: Mantener este archivo seguro y NO subirlo a repositorios publicos.

---

## Estructura de Pantallas

### Pantalla: Login (`app/index.tsx`)
- Login con Google (Firebase Auth)
- Muestra logo, nombre de app y features
- Al autenticarse, redirige al Dashboard

### Pantalla: Dashboard (`app/(tabs)/dashboard.tsx`)
- Saludo personalizado
- Selector de mes/ano
- Card de balance (ingresos - gastos)
- Indicadores: Liquidez, Riesgo, Ahorro, Estres
- Grafico de torta por categoria de gastos
- Objetivos financieros
- Ultimas transacciones (5)
- Boton "Balance Historico" -> Navega a `/balance-historico`

### Pantalla: Balance Historico (`app/balance-historico.tsx`)
- Filtro por ano (dinamico segun transacciones)
- Filtro por periodo (mes inicio - mes fin)
- Card con balance total del periodo
- Grafico lineal con 2 lineas:
  - Verde: Ingresos
  - Rojo: Gastos
- Detalle mensual expandible

### Pantalla: Transacciones (`app/(tabs)/transactions.tsx`)
- Lista de transacciones del mes
- Filtro por tipo (ingreso/gasto)
- Tap para eliminar

### Pantalla: Agregar (`app/(tabs)/add.tsx`)
- Formulario para nueva transaccion
- Campos: Tipo, Categoria, Monto, Descripcion, Fecha
- Validacion de campos

### Pantalla: Chat (`app/(tabs)/chat.tsx`)
- Agente CFO con IA (Groq)
- Historial de conversacion
- Contexto financiero proporcionado automaticamente

### Pantalla: Settings (`app/(tabs)/settings.tsx`)
- Perfil de usuario
- Tema (oscuro/claro)
- Respaldo a Google Drive
- Estadisticas

---

## Almacenamiento de Datos

### AsyncStorage Keys

| Key | Descripcion | Estructura |
|-----|-------------|------------|
| `@transactions` | Lista de transacciones | `Transaction[]` |
| `@objectives` | Objetivos financieros | `Objective[]` |
| `@chat` | Historial del chat | `ChatMessage[]` |
| `@profile` | Perfil del usuario | `UserProfile` |

### Interfaces TypeScript

```typescript
interface Transaction {
  id: string;
  type: "income" | "expense";
  category: string;
  subcategory?: string;
  amount: number;
  description?: string;
  date: string;        // Formato: "YYYY-MM-DD"
  created_at: string;  // ISO timestamp
}

interface Objective {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline?: string;
  created_at: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface UserProfile {
  id: number;
  email: string;
  name: string;
  photo_url?: string;
  financial_profile: string;
  currency: string;
  last_backup?: string;
}
```

---

## Sistema de Temas

**Archivo**: `constants/theme.ts`

### Colores Oscuros (Por defecto)

```typescript
COLORS = {
  background: "#0F1923",     // Fondo principal
  surface: "#1A2635",        // Superficies (cards)
  primary: "#00C896",        // Verde principal
  success: "#00C896",        // Ingresos
  danger: "#FF4D6A",         // Gastos/Alertas
  warning: "#FFB830",        // Advertencias
  textPrimary: "#F0F4F8",    // Texto principal
  textSecondary: "#8A9BB0",  // Texto secundario
  border: "#243447",         // Bordes
  chart: ["#00C896", "#3D8EFF", "#FFB830", "#FF4D6A", ...]
}
```

---

## Configuracion de Compilacion

### EAS Build (`eas.json`)

```json
{
  "build": {
    "preview": {
      "android": { "buildType": "apk", "credentialsSource": "local" }
    },
    "production": {
      "android": { "buildType": "apk", "credentialsSource": "local" }
    }
  }
}
```

### Keystore (`android/app/build.gradle`)

```groovy
signingConfigs {
  release {
    storeFile file('cfohogar.jks')
    storePassword 'cfohogar123'
    keyAlias 'cfohogar'
    keyPassword 'cfohogar123'
  }
}
```

---

## Guia de Desarrollo

### 1. Instalacion de Dependencias

```bash
npm install
```

### 2. Variables de Entorno

Crear archivo `.env`:
```bash
EXPO_PUBLIC_GROQ_API_KEY=tu_api_key_aqui
```

### 3. Ejecutar en Desarrollo

```bash
npx expo start
# o
npm start
```

### 4. Compilar APK

```bash
# Configurar JAVA_HOME y ANDROID_HOME
export JAVA_HOME=/path/to/java
export ANDROID_HOME=/path/to/android-sdk

# Compilar release
cd android
./gradlew assembleRelease
```

---

## Logica de Negocio

### Calculo de Balance

```typescript
// Balance del mes
const income = transactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
const expenses = transactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
const balance = income - expenses;

// Indicadores
const savingRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
const riskLevel = expenses / (income || 1);
```

### Distribucion de Objetivos

```
50% -> Necesidades esenciales
20% -> Ahorro e inversion
10% -> Fondo de emergencia
10% -> Objetivos personales
10% -> Ocio y disfrute
```

### Agente CFO

El agente usa Groq API con el modelo `llama-3.3-70b-versatile`. El sistema:
1. Recibe mensajes del usuario
2. Envia historial + contexto financiero
3. Procesa respuesta con IA
4. Muestra en chat

**Contexto financiero enviado**:
- Ingresos/gastos del mes actual
- Balance
- Objetivos
- Alertas de gastos

---

## Categorias de Transacciones

**Archivo**: `constants/categories.ts`

### Ingresos
- Sueldo
- Freelance
- Inversiones
- Regalo
- Otro

### Gastos Fijos
- Alquiler
- Servicios
- Internet
- Seguro
- Transporte
- Salud

### Gastos Variables
- Supermercado
- Restaurantes
- Delivery
- Compras
- Ocio
- Suscripciones
- Vestimenta
- Otros

---

## Troubleshooting

### Error: "GROQ_API_KEY no configurada"
- Verificar que `.env` existe
- Verificar que `EXPO_PUBLIC_GROQ_API_KEY` esta definida
- Recompilar APK (las variables se embeben en build)

### Error: "DEVELOPER_ERROR" en Google Sign-In
- Verificar `google-services.json` es correcto
- Verificar `googleClientId` en `app.json`
- Verificar SHA del keystore coincide con Firebase

### APK no instala
- Verificar que el paquete es `com.cfohogar.app`
- Verificar permisos de instalacion (origenes desconocidos)
- Verificar espacio en dispositivo

---

## Seguridad

1. **Nunca subir** `.env` a repositorios publicos
2. **Nunca subir** `cfohogar.jks` a repositorios publicos
3. Usar `.gitignore` para excluir archivos sensibles
4. Mantener API keys en variables de entorno
5. En produccion, usar repositorio **PRIVATE**

---

## Contacto y Soporte

- **Desarrollador**: Walter (Vonwalter23)
- **Repositorio**: https://github.com/Vonwalter23/CFO_final

---

**Version del Manual**: 1.0.0  
**Ultima actualizacion**: Junio 2026