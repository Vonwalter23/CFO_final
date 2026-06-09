import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PieChart } from "react-native-chart-kit";
import { SPACING, RADIUS } from "@/constants/theme";
import { getTransactionsByMonth, getObjectives, Transaction, Objective } from "@/services/database";
import { getCategoryLabel } from "@/constants/categories";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

const W = Dimensions.get("window").width;

export default function DashboardScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [year, month])
  );

  const loadData = async () => {
    setTransactions(await getTransactionsByMonth(year, month));
    setObjectives(await getObjectives());
  };

  const income = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = income - expenses;
  const savingRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;

  // Pie chart data por categoría
  const expByCategory: Record<string, number> = {};
  transactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      expByCategory[t.category] = (expByCategory[t.category] ?? 0) + t.amount;
    });
  const pieData = Object.entries(expByCategory).map(([cat, val], i) => ({
    name: getCategoryLabel(cat),
    amount: val,
    color: theme.chart[i % theme.chart.length],
    legendFontColor: theme.textSecondary,
    legendFontSize: 12,
  }));

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const fmt = (n: number) =>
    n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

  const riskLevel = expenses / (income || 1);
  const riskScore = Math.min(10, Math.round(riskLevel * 10));
  const liquidity = savingRate > 20 ? "Alta" : savingRate > 5 ? "Media" : "Baja";
  const stress = riskScore >= 8 ? "Alto" : riskScore >= 5 ? "Medio" : "Bajo";
  const liquidityColor = liquidity === "Alta" ? theme.success : liquidity === "Media" ? theme.warning : theme.danger;
  const stressColor = stress === "Bajo" ? theme.success : stress === "Medio" ? theme.warning : theme.danger;

  const monthLabel = format(new Date(year, month - 1, 1), "MMMM yyyy", { locale: es });

  return (
    <ScrollView style={[styles.scroll, { backgroundColor: theme.background }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: theme.textPrimary }]}>Hola, {user?.name?.split(" ")[0] ?? "usuario"} 👋</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Tu estado financiero</Text>
        </View>
        <View style={[styles.avatarCircle, { backgroundColor: theme.surface, borderColor: theme.primary }]}>
          <Ionicons name="person" size={22} color={theme.primary} />
        </View>
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

      {/* Balance card */}
      <View style={[styles.balanceCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>Balance del mes</Text>
        <Text style={[styles.balanceAmount, { color: balance >= 0 ? theme.success : theme.danger }]}>
          {fmt(balance)}
        </Text>
        <View style={styles.incExpRow}>
          <View style={styles.incExpItem}>
            <Ionicons name="arrow-down-circle" size={18} color={theme.success} />
            <Text style={[styles.incExpLabel, { color: theme.textSecondary }]}>Ingresos</Text>
            <Text style={[styles.incExpAmount, { color: theme.success }]}>{fmt(income)}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.incExpItem}>
            <Ionicons name="arrow-up-circle" size={18} color={theme.danger} />
            <Text style={[styles.incExpLabel, { color: theme.textSecondary }]}>Gastos</Text>
            <Text style={[styles.incExpAmount, { color: theme.danger }]}>{fmt(expenses)}</Text>
          </View>
        </View>
      </View>

      {/* Indicadores CFO */}
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>💰 Estado Financiero</Text>
      <View style={styles.indicatorsRow}>
        <View style={[styles.indicatorCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.indicatorLabel, { color: theme.textSecondary }]}>Liquidez</Text>
          <Text style={[styles.indicatorValue, { color: liquidityColor }]}>{liquidity}</Text>
        </View>
        <View style={[styles.indicatorCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.indicatorLabel, { color: theme.textSecondary }]}>Riesgo</Text>
          <Text style={[styles.indicatorValue, { color: riskScore >= 7 ? theme.danger : riskScore >= 4 ? theme.warning : theme.success }]}>
            {riskScore}/10
          </Text>
        </View>
        <View style={[styles.indicatorCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.indicatorLabel, { color: theme.textSecondary }]}>Ahorro</Text>
          <Text style={[styles.indicatorValue, { color: savingRate >= 20 ? theme.success : savingRate >= 10 ? theme.warning : theme.danger }]}>
            {savingRate}%
          </Text>
        </View>
        <View style={[styles.indicatorCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.indicatorLabel, { color: theme.textSecondary }]}>Estrés</Text>
          <Text style={[styles.indicatorValue, { color: stressColor }]}>{stress}</Text>
        </View>
      </View>

      {/* Pie chart */}
      {pieData.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>📊 Gastos por categoría</Text>
          <View style={[styles.chartCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <PieChart
              data={pieData}
              width={W - SPACING.lg * 2 - SPACING.md * 2}
              height={180}
              chartConfig={{ color: () => theme.textPrimary }}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="0"
              hasLegend={true}
            />
          </View>
        </>
      )}

      {/* Objetivos */}
      {objectives.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>🎯 Objetivos financieros</Text>
          {objectives.slice(0, 3).map((obj) => {
            const pct = Math.min(100, Math.round((obj.current_amount / obj.target_amount) * 100));
            return (
              <View key={obj.id} style={[styles.objectiveCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.objHeader}>
                  <Text style={[styles.objName, { color: theme.textPrimary }]}>{obj.name}</Text>
                  <Text style={[styles.objPct, { color: theme.primary }]}>{pct}%</Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
                  <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: theme.primary }]} />
                </View>
                <Text style={[styles.objAmounts, { color: theme.textSecondary }]}>
                  {fmt(obj.current_amount)} / {fmt(obj.target_amount)}
                </Text>
              </View>
            );
          })}
        </>
      )}

      {/* Últimas transacciones */}
      {transactions.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>🕐 Últimos movimientos</Text>
          {transactions.slice(0, 5).map((t) => (
            <View key={t.id} style={[styles.txRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={[styles.txIcon, { backgroundColor: t.type === "income" ? theme.success + "22" : theme.danger + "22" }]}>
                <Ionicons
                  name={t.type === "income" ? "arrow-down" : "arrow-up"}
                  size={16}
                  color={t.type === "income" ? theme.success : theme.danger}
                />
              </View>
              <View style={styles.txInfo}>
                <Text style={[styles.txCat, { color: theme.textPrimary }]}>{getCategoryLabel(t.category)}</Text>
                <Text style={[styles.txDate, { color: theme.textMuted }]}>{t.date}</Text>
              </View>
              <Text style={[styles.txAmount, { color: t.type === "income" ? theme.success : theme.danger }]}>
                {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
              </Text>
            </View>
          ))}
        </>
      )}

      {/* Botón Balance Histórico */}
      <TouchableOpacity
        style={[styles.balanceHistoricoBtn, { backgroundColor: theme.primary + "15", borderColor: theme.primary }]}
        onPress={() => router.push("/balance-historico")}
        activeOpacity={0.85}
      >
        <View style={[styles.balanceHistoricoIcon, { backgroundColor: theme.primary + "22" }]}>
          <Ionicons name="analytics" size={22} color={theme.primary} />
        </View>
        <View style={styles.balanceHistoricoContent}>
          <Text style={[styles.balanceHistoricoTitle, { color: theme.textPrimary }]}>Balance Histórico</Text>
          <Text style={[styles.balanceHistoricoSubtitle, { color: theme.textSecondary }]}>
            Ver evolución de ingresos y gastos
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.primary} />
      </TouchableOpacity>

      {transactions.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="wallet-outline" size={48} color={theme.textMuted} />
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>Sin movimientos este mes</Text>
          <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>Registrá tu primer ingreso o gasto</Text>
        </View>
      )}

      <View style={{ height: SPACING.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: SPACING.lg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.lg },
  greeting: { fontSize: 22, fontWeight: "800" },
  subtitle: { fontSize: 13, marginTop: 2 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center", borderWidth: 1.5 },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: SPACING.md, gap: SPACING.md },
  monthBtn: { padding: SPACING.xs },
  monthLabel: { fontSize: 16, fontWeight: "700", minWidth: 160, textAlign: "center" },
  balanceCard: { borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.lg, borderWidth: 1 },
  balanceLabel: { fontSize: 13, marginBottom: SPACING.xs },
  balanceAmount: { fontSize: 36, fontWeight: "900", marginBottom: SPACING.md },
  incExpRow: { flexDirection: "row", alignItems: "center" },
  incExpItem: { flex: 1, alignItems: "center", gap: 4 },
  incExpLabel: { fontSize: 12 },
  incExpAmount: { fontSize: 16, fontWeight: "700" },
  divider: { width: 1, height: 40 },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: SPACING.sm, marginTop: SPACING.md },
  indicatorsRow: { flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.sm },
  indicatorCard: { flex: 1, borderRadius: RADIUS.md, padding: SPACING.sm, alignItems: "center", borderWidth: 1 },
  indicatorLabel: { fontSize: 11, marginBottom: 4 },
  indicatorValue: { fontSize: 15, fontWeight: "800" },
  chartCard: { borderRadius: RADIUS.lg, padding: SPACING.sm, borderWidth: 1, alignItems: "center" },
  objectiveCard: { borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1 },
  objHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: SPACING.sm },
  objName: { fontSize: 14, fontWeight: "600" },
  objPct: { fontSize: 14, fontWeight: "700" },
  progressBar: { height: 6, borderRadius: 3, marginBottom: SPACING.xs },
  progressFill: { height: 6, borderRadius: 3 },
  objAmounts: { fontSize: 12 },
  txRow: { flexDirection: "row", alignItems: "center", borderRadius: RADIUS.md, padding: SPACING.sm, marginBottom: SPACING.xs, gap: SPACING.sm, borderWidth: 1 },
  txIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  txInfo: { flex: 1 },
  txCat: { fontSize: 13, fontWeight: "600" },
  txDate: { fontSize: 11 },
  txAmount: { fontSize: 14, fontWeight: "700" },
  emptyState: { alignItems: "center", paddingVertical: SPACING.xxl },
  emptyText: { fontSize: 16, fontWeight: "700", marginTop: SPACING.md },
  emptySubtext: { fontSize: 13, marginTop: SPACING.xs },
  balanceHistoricoBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.lg,
    borderWidth: 1.5,
    gap: SPACING.md,
  },
  balanceHistoricoIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    justifyContent: "center",
    alignItems: "center",
  },
  balanceHistoricoContent: {
    flex: 1,
  },
  balanceHistoricoTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  balanceHistoricoSubtitle: {
    fontSize: 13,
  },
});
