import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { COLORS, SPACING, RADIUS } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { getAllTransactions, getObjectives, updateLastBackup, getUserProfile, UserProfile } from "@/services/database";

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { isDark, toggleTheme, theme } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [backingUp, setBackingUp] = useState(false);
  const [exporting, setExporting] = useState(false);

  useFocusEffect(useCallback(() => {
    const load = async () => setProfile(await getUserProfile());
    load();
  }, []));

  // ─── Export CSV ─────────────────────────────────────────────
  const exportCSV = async () => {
    setExporting(true);
    try {
      const txs = await getAllTransactions();
      const header = "id,tipo,categoria,subcategoria,monto,descripcion,fecha\n";
      const rows = txs.map(t =>
        `${t.id},${t.type},${t.category},${t.subcategory ?? ""},${t.amount},"${t.description ?? ""}",${t.date}`
      ).join("\n");
      const csv = header + rows;
      const path = FileSystem.documentDirectory + "cfo_hogar_export.csv";
      await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(path, { mimeType: "text/csv", dialogTitle: "Exportar transacciones" });
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
      // Obtener tokens frescos de Google Sign-In
      let token: string | null = null;
      try {
        const tokens = await GoogleSignin.getTokens();
        token = tokens.accessToken;
      } catch (e) {
        // Si falla getTokens, intentar con el token guardado
        token = await AsyncStorage.getItem("@cfo_google_token");
      }
      
      if (!token) {
        Alert.alert("Sin sesión", "Volvé a iniciar sesión para hacer backup.");
        return;
      }

      const txs = await getAllTransactions();
      const objs = await getObjectives();

      // Verificar que el token funcione probando la API de Sheets
      const testRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets?title=CFO%20del%20Hogar%20Test", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!testRes.ok && testRes.status !== 404) {
        const errorData = await testRes.json().catch(() => ({}));
        throw new Error(`Token inválido (${testRes.status}): ${errorData.error?.message ?? "Verificá los permisos de Google en la app"}`);
      }

      // Create or find spreadsheet
      const ssTitle = "CFO del Hogar - Backup";
      const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          properties: { title: ssTitle },
          sheets: [
            { properties: { title: "Transacciones" } },
            { properties: { title: "Objetivos" } },
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
        ["ID", "Tipo", "Categoría", "Monto", "Descripción", "Fecha"],
        ...txs.map(t => [t.id, t.type, t.category, t.amount, t.description ?? "", t.date]),
      ];
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values/Transacciones!A1:F${txRows.length}?valueInputOption=RAW`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values: txRows }),
      });

      // Write objectives
      const objRows = [
        ["ID", "Nombre", "Meta", "Actual", "Vencimiento"],
        ...objs.map(o => [o.id, o.name, o.target_amount, o.current_amount, o.deadline ?? ""]),
      ];
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values/Objetivos!A1:E${objRows.length}?valueInputOption=RAW`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values: objRows }),
      });

      await updateLastBackup();
      setProfile(await getUserProfile());
      Alert.alert("✅ Backup exitoso", `Tus datos fueron guardados en Google Sheets:\n"${ssTitle}"`);
    } catch (e: any) {
      Alert.alert("Error en backup", e.message ?? "No se pudo completar el backup.");
    } finally {
      setBackingUp(false);
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
      </View>

      {/* Export */}
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Exportar datos</Text>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <TouchableOpacity style={styles.cardRow} onPress={exportCSV} disabled={exporting}>
          <Ionicons name="document-text-outline" size={20} color={theme.success} />
          <View style={styles.cardRowInfo}>
            <Text style={[styles.cardRowTitle, { color: theme.textPrimary }]}>Exportar como CSV</Text>
            <Text style={[styles.cardRowSub, { color: theme.textMuted }]}>Todas las transacciones</Text>
          </View>
          {exporting
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
  signOutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: SPACING.sm,
    borderWidth: 1,
    borderRadius: RADIUS.md, padding: SPACING.md, marginTop: SPACING.lg,
  },
  signOutText: { fontSize: 15, fontWeight: "700" },
  version: { textAlign: "center", fontSize: 12, marginTop: SPACING.lg },
});
