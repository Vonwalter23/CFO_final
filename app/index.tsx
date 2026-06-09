import React, { useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { COLORS, SPACING, RADIUS } from "@/constants/theme";

export default function LoginScreen() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();
  const redirected = useRef(false);

  useEffect(() => {
    if (!loading && user && !redirected.current) {
      redirected.current = true;
      router.replace("/(tabs)/dashboard");
    }
  }, [user, loading]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={{ color: COLORS.textSecondary, marginTop: SPACING.md }}>
          Cargando...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoCircle}>
          <Ionicons name="stats-chart" size={48} color={COLORS.primary} />
        </View>
        <Text style={styles.appName}>CFO del Hogar</Text>
        <Text style={styles.tagline}>Tu asesor financiero personal</Text>
      </View>

      <View style={styles.features}>
        {[
          { icon: "analytics-outline", text: "Dashboard financiero en tiempo real" },
          { icon: "chatbubble-ellipses-outline", text: "Agente CFO con IA avanzada" },
          { icon: "shield-checkmark-outline", text: "Datos privados en tu teléfono" },
          { icon: "cloud-upload-outline", text: "Backup automático en Google Drive" },
        ].map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <Ionicons name={f.icon as any} size={20} color={COLORS.primary} />
            <Text style={styles.featureText}>{f.text}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.googleBtn} onPress={signIn} activeOpacity={0.85}>
        <Ionicons name="logo-google" size={22} color="#fff" />
        <Text style={styles.googleBtnText}>Ingresar con Google</Text>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        Al ingresar aceptás que tus datos financieros se almacenen localmente en tu dispositivo.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.lg, justifyContent: "center",
  },
  center: {
    flex: 1, justifyContent: "center", alignItems: "center",
    backgroundColor: COLORS.background,
  },
  header: { alignItems: "center", marginBottom: SPACING.xxl },
  logoCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: COLORS.surface,
    justifyContent: "center", alignItems: "center",
    marginBottom: SPACING.md, borderWidth: 2, borderColor: COLORS.primary,
  },
  appName: { fontSize: 32, fontWeight: "800", color: COLORS.textPrimary, letterSpacing: 0.5 },
  tagline: { fontSize: 16, color: COLORS.textSecondary, marginTop: SPACING.xs },
  features: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.xl, gap: SPACING.md,
  },
  featureRow: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  featureText: { color: COLORS.textSecondary, fontSize: 14, flex: 1 },
  googleBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingVertical: SPACING.md, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: SPACING.sm,
  },
  googleBtnText: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
  disclaimer: {
    color: COLORS.textMuted, fontSize: 11, textAlign: "center",
    marginTop: SPACING.md, lineHeight: 16,
  },
});
