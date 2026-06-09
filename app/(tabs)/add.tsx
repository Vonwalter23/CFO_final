import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SPACING, RADIUS } from "@/constants/theme";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from "@/constants/categories";
import { insertTransaction } from "@/services/database";
import uuid from "react-native-uuid";
import { format } from "date-fns";
import { useTheme } from "@/context/ThemeContext";

type TxType = "income" | "expense";

export default function AddScreen() {
  const { theme } = useTheme();
  const [type, setType] = useState<TxType>("expense");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [saving, setSaving] = useState(false);

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSave = async () => {
    if (!category) return Alert.alert("Falta categoría", "Seleccioná una categoría.");
    const amt = parseFloat(amount.replace(",", "."));
    if (!amt || amt <= 0) return Alert.alert("Monto inválido", "Ingresá un monto mayor a 0.");

    setSaving(true);
    try {
      await insertTransaction({
        id: uuid.v4() as string,
        type,
        category,
        amount: amt,
        description: description.trim() || undefined,
        date,
      });
      Alert.alert("✅ Guardado", "El movimiento fue registrado.", [
        { text: "OK", onPress: resetForm },
      ]);
    } catch (e) {
      Alert.alert("Error", "No se pudo guardar el movimiento.");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setCategory("");
    setAmount("");
    setDescription("");
    setDate(format(new Date(), "yyyy-MM-dd"));
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={[styles.title, { color: theme.textPrimary }]}>Registrar movimiento</Text>

        {/* Tipo */}
        <View style={styles.typeRow}>
          {(["expense", "income"] as TxType[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.typeBtn,
                { backgroundColor: theme.surface, borderColor: theme.border },
                type === t && (t === "income" ? { backgroundColor: theme.success, borderColor: theme.success } : { backgroundColor: theme.danger, borderColor: theme.danger })
              ]}
              onPress={() => { setType(t); setCategory(""); }}
              activeOpacity={0.8}
            >
              <Ionicons
                name={t === "income" ? "arrow-down-circle" : "arrow-up-circle"}
                size={20}
                color={type === t ? "#fff" : theme.textMuted}
              />
              <Text style={[
                styles.typeBtnText,
                { color: theme.textMuted },
                type === t && styles.typeBtnTextActive
              ]}>
                {t === "income" ? "Ingreso" : "Gasto"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Monto */}
        <Text style={[styles.label, { color: theme.textSecondary }]}>Monto (ARS)</Text>
        <View style={[styles.amountRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.currency, { color: theme.textSecondary }]}>$</Text>
          <TextInput
            style={[styles.amountInput, { color: theme.textPrimary }]}
            keyboardType="decimal-pad"
            placeholder="0,00"
            placeholderTextColor={theme.textMuted}
            value={amount}
            onChangeText={setAmount}
          />
        </View>

        {/* Categoría */}
        <Text style={[styles.label, { color: theme.textSecondary }]}>Categoría</Text>
        <View style={styles.catGrid}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.catChip,
                { backgroundColor: theme.surface, borderColor: theme.border },
                category === cat.id && { backgroundColor: theme.primary, borderColor: theme.primary }
              ]}
              onPress={() => setCategory(cat.id)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={cat.icon as any}
                size={16}
                color={category === cat.id ? "#fff" : theme.textSecondary}
              />
              <Text style={[
                styles.catChipText,
                { color: theme.textSecondary },
                category === cat.id && styles.catChipTextActive
              ]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Descripción */}
        <Text style={[styles.label, { color: theme.textSecondary }]}>Descripción (opcional)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary }]}
          placeholder="Ej: Supermercado Día, cuota del auto..."
          placeholderTextColor={theme.textMuted}
          value={description}
          onChangeText={setDescription}
          maxLength={120}
        />

        {/* Fecha */}
        <Text style={[styles.label, { color: theme.textSecondary }]}>Fecha</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary }]}
          placeholder="AAAA-MM-DD"
          placeholderTextColor={theme.textMuted}
          value={date}
          onChangeText={setDate}
        />

        {/* Guardar */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: theme.primary }, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
          <Text style={styles.saveBtnText}>Guardar movimiento</Text>
        </TouchableOpacity>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: SPACING.lg },
  title: { fontSize: 22, fontWeight: "800", marginBottom: SPACING.lg },
  typeRow: { flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.lg },
  typeBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: SPACING.xs, paddingVertical: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1,
  },
  typeBtnText: { fontSize: 15, fontWeight: "700" },
  typeBtnTextActive: { color: "#fff" },
  label: { fontSize: 13, fontWeight: "600", marginBottom: SPACING.xs, marginTop: SPACING.sm },
  amountRow: {
    flexDirection: "row", alignItems: "center", borderRadius: RADIUS.md,
    borderWidth: 1, paddingHorizontal: SPACING.md, marginBottom: SPACING.sm,
  },
  currency: { fontSize: 24, fontWeight: "800", marginRight: SPACING.xs },
  amountInput: { flex: 1, fontSize: 28, fontWeight: "800", paddingVertical: SPACING.md },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs, marginBottom: SPACING.sm },
  catChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 6, borderWidth: 1,
  },
  catChipText: { fontSize: 12, fontWeight: "600" },
  catChipTextActive: { color: "#fff" },
  input: {
    borderRadius: RADIUS.md, borderWidth: 1,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, fontSize: 15, marginBottom: SPACING.sm,
  },
  saveBtn: {
    borderRadius: RADIUS.md, paddingVertical: SPACING.md, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: SPACING.sm, marginTop: SPACING.lg,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
