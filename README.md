# CFO del Hogar

Aplicación móvil de finanzas personales para Argentina con Agente CFO con IA (Groq).

## 📱 Funcionalidades

### Core
- **Dashboard financiero** en tiempo real
- **Balance histórico** con gráficos interactivos
- **Agente CFO con IA** (Groq) para análisis y consejos
- **Autenticación Google** (Firebase)
- **Tema oscuro/claro**

### Gestión de Transacciones
- Agregar ingresos y gastos
- Categorización automática
- Historial completo con filtros

### Respaldo y Restauración (NUEVO v1.0.0)
- **Backup en Google Sheets**: Guarda transacciones, objetivos y perfil
- **Restaurar backup**: Recupera datos desde Google Sheets
- **Exportar como CSV**: Backup local completo

### Objetivos de Ahorro
- Crear metas de ahorro
- Seguimiento de progreso
- Fechas de vencimiento

---

## 🚀 Instalación

```bash
# Clonar repositorio
git clone https://github.com/Vonwalter23/CFO_11-06-26.git
cd CFO_11-06-26

# Instalar dependencias
npm install

# Iniciar desarrollo
npx expo start
```

---

## ⚙️ Configuración

### 1. Variables de Entorno

Crear archivo `.env` en la raíz del proyecto:
```bash
EXPO_PUBLIC_GROQ_API_KEY=tu_api_key_de_groq
```

### 2. Firebase/Google Cloud

1. Ir a [Firebase Console](https://console.firebase.google.com/)
2. Crear proyecto o usar existente: `cfo-hogar-dd977`
3. Registrar app Android:
   - Package name: `com.cfohogar.app`
   - Agregar SHA-1 del certificado de firma
4. Descargar `google-services.json`
5. Reemplazar en:
   - `android/app/google-services.json`
   - `google-services.json` (raíz)

### 3. Google OAuth Scopes

En Google Cloud Console, configurar los siguientes scopes:
- `https://www.googleapis.com/auth/spreadsheets`
- `https://www.googleapis.com/auth/drive.file`
- `https://www.googleapis.com/auth/drive.readonly`

### 4. Compilar APK

```bash
# Asegurar keystore
cp /ruta/backup/cfohogar.jks android/app/cfohogar.jks

# Prebuild (si es necesario)
npx expo prebuild --platform android

# Compilar release
cd android
./gradlew assembleRelease
```

---

## 📋 Permisos OAuth Requeridos

| Scope | Uso |
|-------|-----|
| `spreadsheets` | Crear y escribir backups en Google Sheets |
| `drive.file` | Acceso limitado a archivos creados por la app |
| `drive.readonly` | Buscar backups existentes en Google Drive |

---

## 🔑 Credenciales del Proyecto

| Item | Valor |
|------|-------|
| Package name | `com.cfohogar.app` |
| Keystore | `android/app/cfohogar.jks` |
| Contraseña keystore | `cfohogar123` |
| Alias | `cfohogar` |
| SHA-1 | `51:AD:61:6E:29:45:23:3E:A3:F0:8D:16:68:3D:73:AB:A4:0C:21:CF` |
| webClientId | `909029635799-1u27mgg14huhto1u845b9uijs1v1id82.apps.googleusercontent.com` |
| Proyecto Firebase | `cfo-hogar-dd977` |

---

## 📂 Estructura del Proyecto

```
CFO_11-06-26/
├── app/                    # Pantallas (Expo Router)
│   ├── (tabs)/            # Tabs de navegación
│   │   ├── dashboard.tsx  # Dashboard principal
│   │   ├── add.tsx        # Agregar transacción
│   │   ├── transactions.tsx # Historial
│   │   ├── chat.tsx       # Agente CFO con IA
│   │   └── settings.tsx   # Perfil y configuración
│   └── index.tsx          # Login
├── context/               # Contextos de React
│   └── AuthContext.tsx    # Autenticación Google
├── services/              # Servicios
│   └── database.ts        # Almacenamiento local
├── constants/             # Constantes
│   └── theme.ts           # Temas y estilos
├── android/               # Proyecto Android nativo
│   └── app/
│       ├── build.gradle   # Configuración de compilación
│       └── cfohogar.jks   # Keystore de producción
├── google-services.json   # Firebase config
├── app.json               # Configuración Expo
└── package.json           # Dependencias
```

---

## 📦 Datos Respaldados

### Google Sheets
El backup incluye:
- **Transacciones**: ID, tipo, categoría, subcategoría, monto, descripción, fecha, creado
- **Objetivos**: ID, nombre, meta, actual, vencimiento, creado
- **Perfil**: perfil_financiero, moneda, email, fecha_backup

### CSV Export
El export local incluye:
- Información del backup (fecha, usuario, totales)
- Todas las transacciones con fechas completas
- Todos los objetivos
- Configuración del perfil

---

## 🔧 Guía de Errores y Soluciones

### 1. ERROR: DEVELOPER_ERROR (Google Sign-In)

**Síntoma:** Al intentar iniciar sesión con Google, aparece el error "DEVELOPER_ERROR" o código 10.

**Causas posibles:**

#### Causa 1: SHA-1 del certificado no coincide con Firebase

El APK está firmado con un keystore cuyo SHA-1 NO está registrado en Firebase Console.

**Verificación:**
```bash
# Obtener SHA-1 del keystore usado
keytool -list -v -keystore android/app/cfohogar.jks -alias cfohogar -storepass cfohogar123 -keypass cfohogar123 | grep SHA1
```

**Solución:**
1. Ir a [Firebase Console](https://console.firebase.google.com/)
2. Seleccionar proyecto `cfo-hogar-dd977`
3. Ir a **Configuración** → **General**
4. En "Huellas digitales del certificado SHA", agregar el SHA-1 del keystore
5. Descargar el `google-services.json` actualizado
6. Reemplazar en `android/app/google-services.json`
7. Recompilar el APK

#### Causa 2: APK firmado con keystore incorrecto

El APK release está siendo firmado con `debug.keystore` en lugar del keystore de producción.

**Verificación:**
```bash
# Verificar SHA-1 del APK
keytool -printcert -jarfile android/app/build/outputs/apk/release/app-release.apk | grep SHA1
```

**Solución:**
Modificar `android/app/build.gradle` para usar el keystore correcto en release:

```gradle
signingConfigs {
    release {
        storeFile file('cfohogar.jks')
        storePassword 'cfohogar123'
        keyAlias 'cfohogar'
        keyPassword 'cfohogar123'
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
    }
}
```

#### Causa 3: google-services.json desincronizado

El archivo `google-services.json` tiene SHA-1 que no están en Firebase Console, o faltan SHA-1 que están en Firebase.

**Verificación:**
Comparar SHA-1 en `google-services.json` con los registrados en Firebase Console.

**Solución:**
1. En Firebase Console, dejar SOLO los SHA-1 correspondientes al keystore de producción
2. Descargar `google-services.json` nuevo desde Firebase
3. Reemplazar en `android/app/google-services.json`

---

### 2. ERROR: Keystore perdido durante expo prebuild

**Síntoma:** Después de ejecutar `expo prebuild --clean`, el keystore `cfohogar.jks` desaparece del directorio `android/app/`.

**Solución:**
1. Mantener backup del keystore fuera del directorio android
2. Copiar el keystore después de cada `expo prebuild`:
```bash
cp /ruta/backup/cfohogar.jks android/app/cfohogar.jks
```

---

### 3. ERROR: WebClientId incorrecto

**Síntoma:** Error de autenticación aunque los SHA-1 coincidan.

**Verificación:**
```bash
# En AuthContext.tsx
grep "webClientId" context/AuthContext.tsx

# En google-services.json (debe ser type: 3)
cat android/app/google-services.json | grep -A2 '"client_type": 3'
```

**Solución:**
Asegurarse que el `webClientId` en `AuthContext.tsx` coincida con el `client_id` de tipo 3 en `google-services.json`.

---

### 4. ERROR: google-services.json no encontrado

**Síntoma:** La app no puede inicializar Firebase.

**Solución:**
1. Verificar que `google-services.json` exista en:
   - `android/app/google-services.json`
   - `google-services.json` (raíz del proyecto)

2. Verificar en `app.json`:
```json
{
  "expo": {
    "android": {
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

3. Regenerar proyecto Android:
```bash
npx expo prebuild --platform android
```

---

### 5. Verificaciones Pre-Compilación

Antes de compilar el APK release, ejecutar estas verificaciones:

```bash
# 1. Verificar keystore existe
ls -la android/app/cfohogar.jks

# 2. Verificar SHA-1 del keystore
keytool -list -v -keystore android/app/cfohogar.jks -alias cfohogar -storepass cfohogar123 | grep SHA1

# 3. Verificar SHA-1 en google-services.json coincide
grep "certificate_hash" android/app/google-services.json

# 4. Verificar APK firmado con keystore correcto
keytool -printcert -jarfile android/app/build/outputs/apk/release/app-release.apk | grep SHA1

# 5. Comparar ambos SHA-1 (deben ser idénticos)
```

---

### 6. Configuración de Keystore en build.gradle

**IMPORTANTE:** El APK release DEBE usar `cfohogar.jks`, NO `debug.keystore`.

Configuración correcta en `android/app/build.gradle`:

```gradle
signingConfigs {
    debug {
        storeFile file('debug.keystore')
        storePassword 'android'
        keyAlias 'androiddebugkey'
        keyPassword 'android'
    }
    release {
        storeFile file('cfohogar.jks')
        storePassword 'cfohogar123'
        keyAlias 'cfohogar'
        keyPassword 'cfohogar123'
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
    }
}
```

---

### 7. Checklist de Configuración Firebase

| Item | Valor esperado |
|------|----------------|
| Package name | `com.cfohogar.app` |
| SHA-1 del keystore release | `51:AD:61:6E:29:45:23:3E:A3:F0:8D:16:68:3D:73:AB:A4:0C:21:CF` |
| webClientId | `909029635799-1u27mgg14huhto1u845b9uijs1v1id82.apps.googleusercontent.com` |
| Proyecto ID | `cfo-hogar-dd977` |

---

## 📋 Pasos para Compilar APK Release

```bash
# 1. Asegurarse que el keystore existe
cp /ruta/backup/cfohogar.jks android/app/cfohogar.jks

# 2. Regenerar proyecto Android (si es necesario)
npx expo prebuild --platform android

# 3. Verificar configuración de signing en build.gradle

# 4. Compilar APK release
cd android
./gradlew assembleRelease

# 5. Verificar firma del APK
keytool -printcert -jarfile app/build/outputs/apk/release/app-release.apk | grep SHA1

# 6. Comparar con SHA-1 en Firebase
# Los SHA-1 deben coincidir exactamente
```

---

## 🔑 Credenciales Necesarias

| Credencial | Ubicación |
|------------|-----------|
| Keystore | `android/app/cfohogar.jks` |
| Contraseña keystore | `cfohogar123` |
| Alias | `cfohogar` |
| SHA-1 | `51:AD:61:6E:29:45:23:3E:A3:F0:8D:16:68:3D:73:AB:A4:0C:21:CF` |
| google-services.json | `android/app/google-services.json` |
| webClientId | `909029635799-1u27mgg14huhto1u845b9uijs1v1id82.apps.googleusercontent.com` |
| GROQ API Key | Variable de entorno `EXPO_PUBLIC_GROQ_API_KEY` |