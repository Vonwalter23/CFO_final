import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Modal,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { COLORS, SPACING, RADIUS } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { 
  getAllTransactions, getObjectives, updateLastBackup, getUserProfile, UserProfile,
  insertTransaction, insertObjective, saveUserProfile, clearAllData, clearAllTransactions, clearAllObjectives
} from "@/services/database";

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { isDark, toggleTheme, theme } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoringCSV, setRestoringCSV] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [backupInfo, setBackupInfo] = useState<{id: string, name: string, date: string} | null>(null);

  useFocusEffect(useCallback(() => {
    const load = async () => setProfile(await getUserProfile());
    load();
  }, []));

  // ─── Helper: obtener token ────────────────────────────────────
  const getGoogleToken = async (): Promise<string | null> => {
    try {
      const tokens = await GoogleSignin.getTokens();
      return tokens.accessToken;
    } catch {
      return await AsyncStorage.getItem("@cfo_google_token");
    }
  };

  // ─── Export CSV ─────────────────────────────────────────────
  const exportCSV = async () => {
    setExporting(true);
    try {
      const txs = await getAllTransactions();
      const objs = await getObjectives();
      const currentProfile = await getUserProfile();
      const now = new Date();
      const backupDate = now.toISOString().split('T')[0];
      const backupTime = now.toTimeString().slice(0, 5).replace(':', '-'); // HH-MM
      
      // Header con info del backup
      const infoSection = `CFO del Hogar - Backup CSV\nFecha: ${backupDate}\nHora: ${backupTime}\nUsuario: ${user?.email ?? ""}\nTotal transacciones: ${txs.length}\nTotal objetivos: ${objs.length}\n\n`;
      
      // Transacciones
      const txHeader = "=== TRANSACCIONES ===\nid,tipo,categoria,subcategoria,monto,descripcion,fecha,creado\n";
      const txRows = txs.map(t =>
        `${t.id},${t.type},${t.category},${t.subcategory ?? ""},${t.amount},"${(t.description ?? "").replace(/"/g, '""')}",${t.date},${t.created_at}`
      ).join("\n");
      
      // Objetivos
      const objHeader = "\n\n=== OBJETIVOS ===\nid,nombre,meta,actual,vencimiento,creado\n";
      const objRows = objs.map(o =>
        `${o.id},"${o.name}",${o.target_amount},${o.current_amount},${o.deadline ?? ""},${o.created_at}`
      ).join("\n");
      
      // Perfil
      const profileHeader = "\n\n=== PERFIL ===\nperfil_financiero,moneda\n";
      const profileData = `${currentProfile?.financial_profile ?? "moderado"},${currentProfile?.currency ?? "ARS"}`;
      
      const csv = infoSection + txHeader + txRows + objHeader + objRows + profileHeader + profileData;
      
      // Guardar en Documents/CFO del Hogar con timestamp único
      const folderPath = FileSystem.documentDirectory + "CFO_del_Hogar/";
      const fileName = `cfo_hogar_backup_${backupDate}_${backupTime}.csv`;
      
      // Crear carpeta si no existe
      const folderInfo = await FileSystem.getInfoAsync(folderPath);
      if (!folderInfo.exists) {
        await FileSystem.makeDirectoryAsync(folderPath, { intermediates: true });
      }
      
      const path = folderPath + fileName;
      await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
      
      // Mostrar opciones después de guardar
      Alert.alert(
        "✅ Backup guardado",
        `Archivo: ${fileName}\nCarpeta: Documents/CFO del Hogar`,
        [
          { text: "Compartir", onPress: () => Sharing.shareAsync(path, { mimeType: "text/csv", dialogTitle: "Backup CFO del Hogar" }) },
          { text: "OK", style: "cancel" }
        ]
      );
    } catch (e) {
      Alert.alert("Error", "No se pudo exportar el archivo.");
    } finally {
      setExporting(false);
    }
  };

  // ─── Backup to Google Sheets ─────────────────────────────────
  const backupToSheets = async () => {
    setBackingUp(true);
    try {
      const token = await getGoogleToken();
      if (!token) {
        Alert.alert("Sin sesión", "Volvé a iniciar sesión para hacer backup.");
        return;
      }

      const txs = await getAllTransactions();
      const objs = await getObjectives();
      const currentProfile = await getUserProfile();

      // Create spreadsheet
      const ssTitle = "CFO del Hogar - Backup";
      const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          properties: { title: ssTitle },
          sheets: [
            { properties: { title: "Transacciones" } },
            { properties: { title: "Objetivos" } },
            { properties: { title: "Perfil" } },
          ],
        }),
      });

      if (!createRes.ok) {
        const errorData = await createRes.json().catch(() => ({}));
        throw new Error(`No se pudo crear la planilla: ${errorData.error?.message ?? createRes.status}`);
      }
      const ss = await createRes.json();
      const ssId = ss.spreadsheetId;

      // Write transactions
      const txRows = [
        ["ID", "Tipo", "Categoría", "Subcategoría", "Monto", "Descripción", "Fecha", "Creado"],
        ...txs.map(t => [t.id, t.type, t.category, t.subcategory ?? "", t.amount, t.description ?? "", t.date, t.created_at]),
      ];
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values/Transacciones!A1:H${txRows.length}?valueInputOption=RAW`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values: txRows }),
      });

      // Write objectives
      const objRows = [
        ["ID", "Nombre", "Meta", "Actual", "Vencimiento", "Creado"],
        ...objs.map(o => [o.id, o.name, o.target_amount, o.current_amount, o.deadline ?? "", o.created_at]),
      ];
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values/Objetivos!A1:F${objRows.length}?valueInputOption=RAW`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values: objRows }),
      });

      // Write profile
      const profileRows = [
        ["Configuración", "Valor"],
        ["financial_profile", currentProfile?.financial_profile ?? "moderado"],
        ["currency", currentProfile?.currency ?? "ARS"],
        ["email", user?.email ?? ""],
        ["backup_date", new Date().toISOString()],
      ];
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values/Perfil!A1:B${profileRows.length}?valueInputOption=RAW`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values: profileRows }),
      });

      await updateLastBackup();
      setProfile(await getUserProfile());
      Alert.alert("✅ Backup exitoso", `Tus datos fueron guardados en Google Sheets:\n"${ssTitle}"\n\nIncluye: Transacciones, Objetivos y Perfil`);
    } catch (e: any) {
      Alert.alert("Error en backup", e.message ?? "No se pudo completar el backup.");
    } finally {
      setBackingUp(false);
    }
  };

  // ─── Buscar último backup ─────────────────────────────────────
  const searchBackup = async (): Promise<{id: string, name: string, date: string} | null> => {
    const token = await getGoogleToken();
    if (!token) return null;

    try {
      // Buscar usando la API de archivos de Google Drive
      // Usa contains en lugar de = para mayor flexibilidad
      const query = encodeURIComponent("name contains 'CFO del Hogar' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,createdTime,modifiedTime)&pageSize=20`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (!res.ok) {
        console.log("Drive API error:", res.status, await res.text());
        return null;
      }
      
      const data = await res.json();
      console.log("Backup search result:", JSON.stringify(data));
      
      const files = data.files || [];
      if (files.length === 0) {
        // Intentar búsqueda más broad
        const broadQuery = encodeURIComponent("name contains 'CFO' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
        const broadRes = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=${broadQuery}&fields=files(id,name,createdTime,modifiedTime)&pageSize=20`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (broadRes.ok) {
          const broadData = await broadRes.json();
          const broadFiles = broadData.files || [];
          if (broadFiles.length > 0) {
            console.log("Broad search found:", broadFiles);
          }
        }
      }
      
      // Tomar el más reciente si hay varios
      if (files.length > 0) {
        // Ordenar por fecha de modificación (más reciente primero)
        const sorted = files.sort((a: any, b: any) => 
          new Date(b.modifiedTime || b.createdTime).getTime() - 
          new Date(a.modifiedTime || a.createdTime).getTime()
        );
        const backup = sorted[0];
        return {
          id: backup.id,
          name: backup.name,
          date: backup.modifiedTime || backup.createdTime,
        };
      }
      return null;
    } catch (e) {
      console.log("Search error:", e);
      return null;
    }
  };

  // ─── Restaurar desde Google Sheets ───────────────────────────
  const restoreFromSheets = async () => {
    setRestoring(true);
    try {
      const token = await getGoogleToken();
      if (!token) {
        Alert.alert("Sin sesión", "Volvé a iniciar sesión para restaurar.");
        return;
      }

      // Buscar backup
      const backup = await searchBackup();
      if (!backup) {
        Alert.alert(
          "Sin backup encontrado",
          "No se encontró un backup de Google Sheets. Hacé primero un backup para tener uno disponible.",
          [{ text: "OK" }]
        );
        return;
      }

      // Mostrar opciones
      Alert.alert(
        "Restaurar Backup",
        `Se encontró un backup: "${backup.name}"\n\nElegí cómo restaurar:`,
        [
          { text: "Cancelar", style: "cancel" },
          { 
            text: "Fusionar", 
            onPress: () => performRestore(token, backup.id, "merge")
          },
          { 
            text: "Sobrescribir todo", 
            style: "destructive",
            onPress: () => performRestore(token, backup.id, "replace")
          },
        ]
      );

    } catch (e: any) {
      Alert.alert("Error", e.message ?? "No se pudo buscar el backup.");
    } finally {
      setRestoring(false);
    }
  };

  const performRestore = async (token: string, ssId: string, mode: "merge" | "replace") => {
    try {
      // Leer transacciones
      const txRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values/Transacciones`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Leer objetivos
      const objRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values/Objetivos`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Leer perfil
      const profileRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values/Perfil`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      let restoredTx = 0;
      let restoredObj = 0;

      // Restaurar transacciones
      if (txRes.ok) {
        const txData = await txRes.json();
        const rows = txData.values || [];
        
        // Skip header row
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row.length >= 6) {
            const tx = {
              id: String(row[0]),
              type: row[1] as "income" | "expense",
              category: String(row[2]),
              subcategory: row[3] ? String(row[3]) : undefined,
              amount: parseFloat(String(row[4])) || 0,
              description: row[5] ? String(row[5]) : undefined,
              date: String(row[6]),
            };
            
            if (mode === "replace" || !tx.id.startsWith("TXN_LOCAL_")) {
              await insertTransaction(tx);
              restoredTx++;
            }
          }
        }
      }

      // Restaurar objetivos
      if (objRes.ok) {
        const objData = await objRes.json();
        const rows = objData.values || [];
        
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row.length >= 4) {
            const obj = {
              id: String(row[0]),
              name: String(row[1]),
              target_amount: parseFloat(String(row[2])) || 0,
              current_amount: row[3] ? parseFloat(String(row[3])) : 0,
              deadline: row[4] ? String(row[4]) : undefined,
            };
            
            await insertObjective(obj);
            restoredObj++;
          }
        }
      }

      // Restaurar perfil
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        const rows = profileData.values || [];
        
        const profileUpdates: any = {};
        for (const row of rows) {
          if (row[0] === "financial_profile") profileUpdates.financial_profile = row[1];
          if (row[0] === "currency") profileUpdates.currency = row[1];
        }
        
        if (Object.keys(profileUpdates).length > 0) {
          const currentProfile = await getUserProfile();
          await saveUserProfile({
            email: currentProfile?.email ?? user?.email ?? "",
            name: currentProfile?.name ?? user?.name ?? "",
            photo_url: currentProfile?.photo_url,
          });
          
          // Actualizar campos específicos
          if (profileUpdates.financial_profile) {
            const p = await getUserProfile();
            if (p) {
              p.financial_profile = profileUpdates.financial_profile;
              await AsyncStorage.setItem("@profile", JSON.stringify(p));
            }
          }
          if (profileUpdates.currency) {
            const p = await getUserProfile();
            if (p) {
              p.currency = profileUpdates.currency;
              await AsyncStorage.setItem("@profile", JSON.stringify(p));
            }
          }
        }
      }

      Alert.alert(
        "✅ Restauración completa",
        `Se restauraron:\n• ${restoredTx} transacciones\n• ${restoredObj} objetivos\n• Configuración de perfil`,
        [{ text: "OK" }]
      );

      setProfile(await getUserProfile());

    } catch (e: any) {
      Alert.alert("Error", e.message ?? "No se pudo completar la restauración.");
    }
  };

  // ─── Restaurar desde CSV ─────────────────────────────────────
  const restoreFromCSV = async () => {
    setRestoringCSV(true);
    try {
      // Primero buscar archivos en la carpeta de backup
      const folderPath = FileSystem.documentDirectory + "CFO_del_Hogar/";
      const folderInfo = await FileSystem.getInfoAsync(folderPath);
      
      let csvFiles: string[] = [];
      
      if (folderInfo.exists) {
        const files = await FileSystem.readDirectoryAsync(folderPath);
        csvFiles = files.filter(f => f.endsWith('.csv')).sort().reverse();
      }
      
      if (csvFiles.length > 0) {
        // Mostrar selector de archivos guardados
        const options = [
          ...csvFiles.map(f => ({ text: f, onPress: () => processCSVFile(folderPath + f) })),
          { text: "Elegir otro archivo...", onPress: () => pickExternalCSV() },
          { text: "Cancelar", style: "cancel" as const, onPress: () => setRestoringCSV(false) }
        ];
        
        Alert.alert("Seleccionar backup", `Encontrados ${csvFiles.length} archivo(s) de backup:`, options);
      } else {
        // No hay archivos guardados, ofrecer picker externo
        Alert.alert(
          "Sin backups locales",
          "No se encontraron backups en la carpeta de la app. ¿Querés buscar un archivo externo?",
          [
            { text: "Cancelar", style: "cancel", onPress: () => setRestoringCSV(false) },
            { text: "Buscar archivo", onPress: () => pickExternalCSV() }
          ]
        );
      }
    } catch (e) {
      Alert.alert("Error", "No se pudo acceder a los archivos de backup.");
      setRestoringCSV(false);
    }
  };

  // ─── Seleccionar CSV externo ────────────────────────────────
  const pickExternalCSV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "text/csv",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await processCSVFile(result.assets[0].uri);
      } else {
        setRestoringCSV(false);
      }
    } catch (e) {
      Alert.alert("Error", "No se pudo seleccionar el archivo.");
      setRestoringCSV(false);
    }
  };

  // ─── Procesar archivo CSV ────────────────────────────────────
  const processCSVFile = async (filePath: string) => {
    try {
      // Verificar si hay datos existentes
      const existingTxs = await getAllTransactions();
      const existingObjs = await getObjectives();
      const hasData = existingTxs.length > 0 || existingObjs.length > 0;
      
      // Si hay datos, preguntar si quiere sobreescribir
      if (hasData) {
        Alert.alert(
          "⚠️ Datos existentes",
          `Hay ${existingTxs.length} transacciones y ${existingObjs.length} objetivos en la app.\n\nSi continuás, se eliminarán todos los datos actuales antes de restaurar.`,
          [
            { text: "Cancelar", style: "cancel", onPress: () => setRestoringCSV(false) },
            { 
              text: "Continuar y sobreescribir", 
              style: "destructive",
              onPress: async () => {
                await clearAllData(); // Limpiar datos existentes
                await restoreFromContent(filePath);
              }
            }
          ]
        );
      } else {
        // No hay datos, restaurar directamente
        await restoreFromContent(filePath);
      }
    } catch (e: any) {
      console.log("Restore CSV error:", e);
      Alert.alert("Error", "No se pudo procesar el archivo CSV.");
      setRestoringCSV(false);
    }
  };

  // ─── Restaurar contenido del CSV ───────────────────────────
  const restoreFromContent = async (filePath: string) => {
    try {
      const content = await FileSystem.readAsStringAsync(filePath, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const lines = content.split("\n");
      let restoredTx = 0;
      let restoredObj = 0;
      let profileUpdated = false;

      // Procesar cada línea
      let section = ""; // Track current section: TRANSACCIONES, OBJETIVOS, PERFIL
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Detectar secciones
        if (line.includes("=== TRANSACCIONES ===")) {
          section = "TRANSACCIONES";
          continue;
        }
        if (line.includes("=== OBJETIVOS ===")) {
          section = "OBJETIVOS";
          continue;
        }
        if (line.includes("=== PERFIL ===")) {
          section = "PERFIL";
          continue;
        }

        // Ignorar líneas de información del backup
        if (line.includes("CFO del Hogar") && !line.includes("===")) {
          continue;
        }
        if (line.match(/^(Fecha:|Usuario:|Total |CFO del Hogar)/)) {
          continue;
        }

        // Parsear según la sección
        if (section === "TRANSACCIONES" && line && !line.includes("id,tipo")) {
          const parts = line.split(",");
          if (parts.length >= 7) {
            // Formato: id,tipo,categoria,subcategoria,monto,descripcion,fecha,creado
            const tx = {
              id: parts[0],
              type: parts[1] as "income" | "expense",
              category: parts[2],
              subcategory: parts[3] || undefined,
              amount: parseFloat(parts[4]) || 0,
              description: parts[5] ? parts[5].replace(/^"|"$/g, '').replace(/""/g, '"') : undefined,
              date: parts[6],
            };
            await insertTransaction(tx);
            restoredTx++;
          }
        }
        
        if (section === "OBJETIVOS" && line && !line.includes("id,nombre")) {
          const parts = line.split(",");
          if (parts.length >= 4) {
            // Formato: id,nombre,meta,actual,vencimiento,creado
            const obj = {
              id: parts[0],
              name: parts[1].replace(/^"|"$/g, ''),
              target_amount: parseFloat(parts[2]) || 0,
              current_amount: parts[3] ? parseFloat(parts[3]) : 0,
              deadline: parts[4] || undefined,
            };
            await insertObjective(obj);
            restoredObj++;
          }
        }
        
        if (section === "PERFIL" && line && !line.includes("perfil_financiero")) {
          const parts = line.split(",");
          if (parts.length >= 2) {
            const currentProfile = await getUserProfile();
            await saveUserProfile({
              email: currentProfile?.email ?? user?.email ?? "",
              name: currentProfile?.name ?? user?.name ?? "",
              photo_url: currentProfile?.photo_url,
            });
            
            if (parts[0].trim() === "financial_profile") {
              const p = await getUserProfile();
              if (p) {
                p.financial_profile = parts[1].trim();
                await AsyncStorage.setItem("@profile", JSON.stringify(p));
                profileUpdated = true;
              }
            }
            if (parts[0].trim() === "currency") {
              const p = await getUserProfile();
              if (p) {
                p.currency = parts[1].trim();
                await AsyncStorage.setItem("@profile", JSON.stringify(p));
                profileUpdated = true;
              }
            }
          }
        }
      }

      Alert.alert(
        "✅ Restauración completa",
        `Se restauraron:\n• ${restoredTx} transacciones\n• ${restoredObj} objetivos\n${profileUpdated ? "• Configuración de perfil" : ""}`,
        [{ text: "OK" }]
      );

      setProfile(await getUserProfile());

    } catch (e: any) {
      console.log("Restore CSV error:", e);
      Alert.alert("Error", "No se pudo leer el archivo CSV. Verificá que sea un backup válido de CFO del Hogar.");
    } finally {
      setRestoringCSV(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert("Cerrar sesión", "¿Estás seguro? Tus datos locales se mantienen.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Salir", style: "destructive", onPress: signOut },
    ]);
  };

  const lastBackup = profile?.last_backup
    ? new Date(profile.last_backup).toLocaleString("es-AR")
    : "Nunca";

  return (
    <ScrollView style={[styles.scroll, { backgroundColor: theme.background }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>Perfil y configuración</Text>

      {/* User card */}
      <View style={styles.userCard}>
        <View style={styles.avatarCircle}>
          <Ionicons name="person" size={32} color={theme.primary} />
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: theme.textPrimary }]}>{user?.name ?? "Usuario"}</Text>
          <Text style={[styles.userEmail, { color: theme.textSecondary }]}>{user?.email ?? ""}</Text>
          <View style={[styles.profileBadge, { backgroundColor: theme.primary + "22" }]}>
            <Text style={[styles.profileBadgeText, { color: theme.primary }]}>
              Perfil: {profile?.financial_profile ?? "moderado"}
            </Text>
          </View>
        </View>
      </View>

      {/* Theme Toggle */}
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Apariencia</Text>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <TouchableOpacity style={styles.cardRow} onPress={toggleTheme}>
          <Ionicons 
            name={isDark ? "sunny" : "moon"} 
            size={20} 
            color={theme.primary} 
          />
          <View style={styles.cardRowInfo}>
            <Text style={[styles.cardRowTitle, { color: theme.textPrimary }]}>
              {isDark ? "Modo Claro" : "Modo Oscuro"}
            </Text>
            <Text style={[styles.cardRowSub, { color: theme.textMuted }]}>
              {isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Backup */}
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Respaldo de datos</Text>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardRow}>
          <Ionicons name="cloud-upload-outline" size={20} color={theme.accent} />
          <View style={styles.cardRowInfo}>
            <Text style={[styles.cardRowTitle, { color: theme.textPrimary }]}>Backup en Google Sheets</Text>
            <Text style={[styles.cardRowSub, { color: theme.textMuted }]}>Último: {lastBackup}</Text>
          </View>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.accent }, backingUp && { opacity: 0.6 }]}
            onPress={backupToSheets}
            disabled={backingUp}
          >
            {backingUp
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.actionBtnText}>Hacer backup</Text>}
          </TouchableOpacity>
        </View>
        
        {/* Botón restaurar - Separador */}
        <View style={[styles.separator, { borderTopColor: theme.border }]} />
        
        <TouchableOpacity 
          style={styles.cardRow}
          onPress={restoreFromSheets}
          disabled={restoring}
        >
          <Ionicons name="cloud-download-outline" size={20} color={theme.success} />
          <View style={styles.cardRowInfo}>
            <Text style={[styles.cardRowTitle, { color: theme.textPrimary }]}>Restaurar backup</Text>
            <Text style={[styles.cardRowSub, { color: theme.textMuted }]}>Recuperar datos desde Sheets</Text>
          </View>
          {restoring
            ? <ActivityIndicator size="small" color={theme.primary} />
            : <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />}
        </TouchableOpacity>
      </View>

      {/* Export */}
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Exportar datos</Text>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <TouchableOpacity style={styles.cardRow} onPress={exportCSV} disabled={exporting}>
          <Ionicons name="document-text-outline" size={20} color={theme.success} />
          <View style={styles.cardRowInfo}>
            <Text style={[styles.cardRowTitle, { color: theme.textPrimary }]}>Exportar como CSV</Text>
            <Text style={[styles.cardRowSub, { color: theme.textMuted }]}>Guardar backup local</Text>
          </View>
          {exporting
            ? <ActivityIndicator size="small" color={theme.primary} />
            : <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />}
        </TouchableOpacity>
        
        {/* Botón restaurar CSV - Separador */}
        <View style={[styles.separator, { borderTopColor: theme.border }]} />
        
        <TouchableOpacity 
          style={styles.cardRow}
          onPress={restoreFromCSV}
          disabled={restoringCSV}
        >
          <Ionicons name="folder-open-outline" size={20} color={theme.warning} />
          <View style={styles.cardRowInfo}>
            <Text style={[styles.cardRowTitle, { color: theme.textPrimary }]}>Restaurar desde CSV</Text>
            <Text style={[styles.cardRowSub, { color: theme.textMuted }]}>Recuperar backup local</Text>
          </View>
          {restoringCSV
            ? <ActivityIndicator size="small" color={theme.primary} />
            : <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />}
        </TouchableOpacity>
      </View>

      {/* Info */}
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Información</Text>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {[
          { icon: "shield-checkmark-outline", label: "Datos almacenados localmente", color: theme.success },
          { icon: "lock-closed-outline", label: "Agente IA con contexto privado", color: theme.accent },
          { icon: "flag-outline", label: "Optimizado para Argentina", color: theme.warning },
        ].map((item, i) => (
          <View key={i} style={[styles.cardRow, i > 0 && { borderTopWidth: 1, borderTopColor: theme.border, marginTop: SPACING.sm, paddingTop: SPACING.sm }]}>
            <Ionicons name={item.icon as any} size={20} color={item.color} />
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Sign out */}
      <TouchableOpacity style={[styles.signOutBtn, { borderColor: theme.danger + "55" }]} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={20} color={theme.danger} />
        <Text style={[styles.signOutText, { color: theme.danger }]}>Cerrar sesión</Text>
      </TouchableOpacity>

      <Text style={[styles.version, { color: theme.textMuted }]}>CFO del Hogar v1.0.0 · Solo uso personal</Text>
      <View style={{ height: SPACING.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: SPACING.lg },
  title: { fontSize: 22, fontWeight: "800", marginBottom: SPACING.lg },
  userCard: {
    flexDirection: "row", alignItems: "center", gap: SPACING.md,
    backgroundColor: "#1A2635", borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.lg,
    borderWidth: 1, borderColor: "#243447",
  },
  avatarCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "rgba(0, 200, 150, 0.13)",
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "#00C896",
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 17, fontWeight: "800" },
  userEmail: { fontSize: 13, marginTop: 2 },
  profileBadge: { marginTop: 6, backgroundColor: "rgba(0, 200, 150, 0.13)", borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 3, alignSelf: "flex-start" },
  profileBadgeText: { fontSize: 11, fontWeight: "700" },
  sectionTitle: { fontSize: 13, fontWeight: "700", marginBottom: SPACING.sm, marginTop: SPACING.md, textTransform: "uppercase", letterSpacing: 0.8 },
  card: { backgroundColor: "#1A2635", borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: "#243447", marginBottom: SPACING.sm },
  cardRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  cardRowInfo: { flex: 1 },
  cardRowTitle: { fontSize: 14, fontWeight: "600" },
  cardRowSub: { fontSize: 12, marginTop: 2 },
  actionBtn: { borderRadius: RADIUS.md, paddingHorizontal: SPACING.sm, paddingVertical: 6 },
  actionBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  infoText: { fontSize: 14, flex: 1 },
  separator: { borderTopWidth: 1, marginTop: SPACING.md, paddingTop: SPACING.md },
  signOutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: SPACING.sm,
    borderWidth: 1,
    borderRadius: RADIUS.md, padding: SPACING.md, marginTop: SPACING.lg,
  },
  signOutText: { fontSize: 15, fontWeight: "700" },
  version: { textAlign: "center", fontSize: 12, marginTop: SPACING.lg },
});
