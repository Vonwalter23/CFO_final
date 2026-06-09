import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SPACING, RADIUS } from "@/constants/theme";
import { getTransactionsByMonth, deleteTransaction, Transaction } from "@/services/database";
import { getCategoryLabel, getCategoryIcon } from "@/constants/categories";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useTheme } from "@/context/ThemeContext";

export default function TransactionsScreen() {
  const { theme } = useTheme();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");

  useFocusEffect(
    useCallback(() => { load(); }, [year, month])
  );

  const load = async () => setTransactions(await getTransactionsByMonth(year, month));

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const handleDelete = (id: string) => {
    Alert.alert("Eliminar", "¿Eliminás este movimiento?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar", style: "destructive",
        onPress: async () => { await deleteTransaction(id); load(); },
      },
    ]);
  };

  const fmt = (n: number) =>
    n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

  const filtered = filter === "all" ? transactions : transactions.filter(t => t.type === filter);
  const income = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const monthLabel = format(new Date(year, month - 1, 1), "MMMM yyyy", { locale: es });

  const renderItem = ({ item }: { item: Transaction }) => (
    <View style={[styles.txCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.txIcon, { backgroundColor: item.type === "income" ? theme.success + "22" : theme.danger + "22" }]}>
        <Ionicons
          name={getCategoryIcon(item.category) as any}
          size={20}
          color={item.type === "income" ? theme.success : theme.danger}
        />
      </View>
      <View style={styles.txInfo}>
        <Text style={[styles.txCat, { color: theme.textPrimary }]}>{getCategoryLabel(item.category)}</Text>
        {item.description ? <Text style={[styles.txDesc, { color: theme.textSecondary }]}>{item.description}</Text> : null}
        <Text style={[styles.txDate, { color: theme.textMuted }]}>{item.date}</Text>
      </View>
      <View style={styles.txRight}>
        <Text style={[styles.txAmount, { color: item.type === "income" ? theme.success : theme.danger }]}>
          {item.type === "income" ? "+" : "-"}{fmt(item.amount)}
        </Text>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={16} color={theme.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Movimientos</Text>
      </View>

      {/* Month selector */}
      <View style={styles.monthRow}>
        <TouchableOpacity onPress={prevMonth} style={styles.monthBtn}>
          <Ionicons name="chevron-back" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.monthLabel, { color: theme.textPrimary }]}>{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.monthBtn}>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Resumen */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="arrow-down-circle" size={16} color={theme.success} />
          <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Ingresos</Text>
          <Text style={[styles.summaryAmount, { color: theme.success }]}>{fmt(income)}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="arrow-up-circle" size={16} color={theme.danger} />
          <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Gastos</Text>
          <Text style={[styles.summaryAmount, { color: theme.danger }]}>{fmt(expenses)}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="wallet" size={16} color={income - expenses >= 0 ? theme.success : theme.danger} />
          <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Balance</Text>
          <Text style={[styles.summaryAmount, { color: income - expenses >= 0 ? theme.success : theme.danger }]}>
            {fmt(income - expenses)}
          </Text>
        </View>
      </View>

      {/* Filtros */}
      <View style={styles.filterRow}>
        {(["all", "income", "expense"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterChip,
              { backgroundColor: theme.surface, borderColor: theme.border },
              filter === f && { backgroundColor: theme.primary, borderColor: theme.primary }
            ]}
            onPress={() => setFilter(f)}
          >
            <Text style={[
              styles.filterText,
              { color: theme.textSecondary },
              filter === f && { color: "#fff" }
            ]}>
              {f === "all" ? "Todos" : f === "income" ? "Ingresos" : "Gastos"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lista */}
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>Sin movimientos</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.sm },
  title: { fontSize: 22, fontWeight: "800" },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: SPACING.sm, gap: SPACING.md },
  monthBtn: { padding: SPACING.xs },
  monthLabel: { fontSize: 15, fontWeight: "700", minWidth: 160, textAlign: "center" },
  summaryRow: { flexDirection: "row", gap: SPACING.sm, paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },
  summaryCard: { flex: 1, borderRadius: RADIUS.md, padding: SPACING.sm, alignItems: "center", gap: 4, borderWidth: 1 },
  summaryLabel: { fontSize: 11 },
  summaryAmount: { fontSize: 13, fontWeight: "800" },
  filterRow: { flexDirection: "row", gap: SPACING.xs, paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },
  filterChip: { paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1 },
  filterText: { fontSize: 13, fontWeight: "600" },
  list: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },
  txCard: { flexDirection: "row", alignItems: "center", borderRadius: RADIUS.md, padding: SPACING.sm, marginBottom: SPACING.xs, gap: SPACING.sm, borderWidth: 1 },
  txIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  txInfo: { flex: 1 },
  txCat: { fontSize: 14, fontWeight: "600" },
  txDesc: { fontSize: 12 },
  txDate: { fontSize: 11 },
  txRight: { alignItems: "flex-end", gap: 4 },
  txAmount: { fontSize: 14, fontWeight: "800" },
  deleteBtn: { padding: 4 },
  empty: { alignItems: "center", paddingVertical: SPACING.xxl },
  emptyText: { fontSize: 15, marginTop: SPACING.md },
});
