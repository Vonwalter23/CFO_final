import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  FlatList,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BarChart } from "react-native-chart-kit";
import { SPACING, RADIUS, COLORS } from "@/constants/theme";
import { EXPENSE_CATEGORIES, getCategoryLabel } from "@/constants/categories";
import { getAllTransactions, Transaction } from "@/services/database";
import { useTheme } from "@/context/ThemeContext";
import { es } from "date-fns/locale";

const W = Dimensions.get("window").width;

const MONTHS = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
];

export default function AnalisisGastosScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const now = new Date();

  // Estados
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [year, setYear] = useState(now.getFullYear());
  const [startMonth, setStartMonth] = useState(1);
  const [endMonth, setEndMonth] = useState(now.getMonth() + 1);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  
  // Modales
  const [modalYear, setModalYear] = useState(false);
  const [modalStartMonth, setModalStartMonth] = useState(false);
  const [modalEndMonth, setModalEndMonth] = useState(false);
  const [modalCategories, setModalCategories] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [])
  );

  const loadTransactions = async () => {
    const txs = await getAllTransactions();
    setAllTransactions(txs);
  };

  // Obtener años disponibles
  const getAvailableYears = () => {
    const years = new Set<number>();
    allTransactions.forEach((t) => {
      const y = new Date(t.date).getFullYear();
      years.add(y);
    });
    if (years.size === 0) years.add(now.getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  };

  // Filtrar transacciones por período y categorías
  const getFilteredTotals = () => {
    const filtered = allTransactions.filter((t) => {
      const date = new Date(t.date);
      const tYear = date.getFullYear();
      const tMonth = date.getMonth() + 1;
      
      if (tYear !== year) return false;
      if (tMonth < startMonth || tMonth > endMonth) return false;
      if (t.type !== "expense") return false;
      if (selectedCategories.length > 0 && !selectedCategories.includes(t.category)) return false;
      
      return true;
    });

    // Agrupar por categoría
    const totals: Record<string, number> = {};
    filtered.forEach((t) => {
      totals[t.category] = (totals[t.category] || 0) + t.amount;
    });

    return Object.entries(totals)
      .map(([cat, amount]) => ({ category: cat, amount }))
      .sort((a, b) => b.amount - a.amount);
  };

  const totals = getFilteredTotals();
  const grandTotal = totals.reduce((sum, t) => sum + t.amount, 0);
  const availableYears = getAvailableYears();

  const fmt = (n: number) =>
    n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

  // Datos para el gráfico
  const chartData = {
    labels: totals.slice(0, 6).map((t) => getCategoryLabel(t.category).substring(0, 8)),
    datasets: [{ data: totals.slice(0, 6).map((t) => t.amount) }],
  };

  const chartConfig = {
    backgroundColor: theme.surface,
    backgroundGradientFrom: theme.surface,
    backgroundGradientTo: theme.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => theme.primary,
    labelColor: () => theme.textSecondary,
    barPercentage: 0.7,
    propsForBackgroundLines: { strokeDasharray: "", stroke: theme.border },
  };

  // Toggle categoría
  const toggleCategory = (catId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId]
    );
  };

  const selectAllCategories = () => setSelectedCategories([]);
  const deselectAllCategories = () => setSelectedCategories(EXPENSE_CATEGORIES.map((c) => c.id));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Análisis de Gastos</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Filtros */}
        <View style={[styles.filtersCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.filtersTitle, { color: theme.textPrimary }]}>Filtros</Text>
          
          {/* Año */}
          <TouchableOpacity style={styles.filterRow} onPress={() => setModalYear(true)}>
            <Ionicons name="calendar-outline" size={20} color={theme.primary} />
            <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Año</Text>
            <Text style={[styles.filterValue, { color: theme.textPrimary }]}>{year}</Text>
            <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
          </TouchableOpacity>

          {/* Rango de meses */}
          <View style={styles.monthRange}>
            <TouchableOpacity 
              style={[styles.monthBtn, { backgroundColor: theme.card }]} 
              onPress={() => setModalStartMonth(true)}
            >
              <Text style={[styles.monthBtnLabel, { color: theme.textSecondary }]}>Desde</Text>
              <Text style={[styles.monthBtnValue, { color: theme.textPrimary }]}>
                {MONTHS.find(m => m.value === startMonth)?.label}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.monthBtn, { backgroundColor: theme.card }]} 
              onPress={() => setModalEndMonth(true)}
            >
              <Text style={[styles.monthBtnLabel, { color: theme.textSecondary }]}>Hasta</Text>
              <Text style={[styles.monthBtnValue, { color: theme.textPrimary }]}>
                {MONTHS.find(m => m.value === endMonth)?.label}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Categorías */}
          <TouchableOpacity style={styles.filterRow} onPress={() => setModalCategories(true)}>
            <Ionicons name="pricetag-outline" size={20} color={theme.primary} />
            <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Categorías</Text>
            <Text style={[styles.filterValue, { color: theme.primary }]}>
              {selectedCategories.length === 0 
                ? "Todas" 
                : selectedCategories.length === EXPENSE_CATEGORIES.length 
                  ? "Todas" 
                  : `${selectedCategories.length} seleccionada${selectedCategories.length > 1 ? "s" : ""}`}
            </Text>
            <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Resumen total */}
        <View style={[styles.totalCard, { backgroundColor: theme.primary + "15", borderColor: theme.primary }]}>
          <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>Total gastado en período</Text>
          <Text style={[styles.totalAmount, { color: theme.danger }]}>{fmt(grandTotal)}</Text>
          <Text style={[styles.totalPeriod, { color: theme.textSecondary }]}>
            {MONTHS.find(m => m.value === startMonth)?.label} - {MONTHS.find(m => m.value === endMonth)?.label} {year}
          </Text>
        </View>

        {/* Gráfico de barras */}
        {totals.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>📊 Gastos por categoría</Text>
            <View style={[styles.chartCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <BarChart
                data={chartData}
                width={W - SPACING.lg * 2 - SPACING.md * 2}
                height={220}
                yAxisLabel="$"
                yAxisSuffix=""
                chartConfig={chartConfig}
                style={{ borderRadius: RADIUS.md }}
                fromZero
                showValuesOnTopOfBars
              />
            </View>
          </>
        )}

        {/* Lista de categorías */}
        {totals.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>💰 Detalle por categoría</Text>
            {totals.map((item, index) => {
              const percentage = grandTotal > 0 ? (item.amount / grandTotal) * 100 : 0;
              return (
                <View key={item.category} style={[styles.categoryRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={[styles.categoryIcon, { backgroundColor: theme.chart[index % theme.chart.length] + "22" }]}>
                    <Ionicons 
                      name="cash-outline" 
                      size={18} 
                      color={theme.chart[index % theme.chart.length]} 
                    />
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text style={[styles.categoryName, { color: theme.textPrimary }]}>
                      {getCategoryLabel(item.category)}
                    </Text>
                    <View style={[styles.categoryBar, { backgroundColor: theme.border }]}>
                      <View 
                        style={[
                          styles.categoryBarFill, 
                          { 
                            width: `${percentage}%`, 
                            backgroundColor: theme.chart[index % theme.chart.length] 
                          }
                        ]} 
                      />
                    </View>
                  </View>
                  <View style={styles.categoryAmount}>
                    <Text style={[styles.categoryAmountText, { color: theme.danger }]}>{fmt(item.amount)}</Text>
                    <Text style={[styles.categoryPct, { color: theme.textMuted }]}>{percentage.toFixed(1)}%</Text>
                  </View>
                </View>
              );
            })}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="pie-chart-outline" size={64} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>Sin gastos en este período</Text>
            <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>
              Probá cambiando los filtros
            </Text>
          </View>
        )}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      {/* Modal Año */}
      <Modal visible={modalYear} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Seleccionar Año</Text>
            <FlatList
              data={availableYears}
              keyExtractor={(item) => item.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, item === year && { backgroundColor: theme.primary + "22" }]}
                  onPress={() => { setYear(item); setModalYear(false); }}
                >
                  <Text style={[styles.modalItemText, { color: item === year ? theme.primary : theme.textPrimary }]}>
                    {item}
                  </Text>
                  {item === year && <Ionicons name="checkmark" size={20} color={theme.primary} />}
                </TouchableOpacity>
              )}
              style={{ maxHeight: 300 }}
            />
            <TouchableOpacity style={[styles.modalClose, { borderColor: theme.border }]} onPress={() => setModalYear(false)}>
              <Text style={[styles.modalCloseText, { color: theme.textSecondary }]}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Mes Inicio */}
      <Modal visible={modalStartMonth} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Mes inicio</Text>
            <FlatList
              data={MONTHS}
              keyExtractor={(item) => item.value.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, item.value === startMonth && { backgroundColor: theme.primary + "22" }]}
                  onPress={() => { setStartMonth(item.value); setModalStartMonth(false); }}
                >
                  <Text style={[styles.modalItemText, { color: item.value === startMonth ? theme.primary : theme.textPrimary }]}>
                    {item.label}
                  </Text>
                  {item.value === startMonth && <Ionicons name="checkmark" size={20} color={theme.primary} />}
                </TouchableOpacity>
              )}
              style={{ maxHeight: 400 }}
            />
            <TouchableOpacity style={[styles.modalClose, { borderColor: theme.border }]} onPress={() => setModalStartMonth(false)}>
              <Text style={[styles.modalCloseText, { color: theme.textSecondary }]}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Mes Fin */}
      <Modal visible={modalEndMonth} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Mes fin</Text>
            <FlatList
              data={MONTHS}
              keyExtractor={(item) => item.value.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    item.value === endMonth && { backgroundColor: theme.primary + "22" },
                    item.value < startMonth && styles.modalItemDisabled,
                  ]}
                  onPress={() => {
                    if (item.value >= startMonth) {
                      setEndMonth(item.value);
                      setModalEndMonth(false);
                    }
                  }}
                >
                  <Text 
                    style={[
                      styles.modalItemText, 
                      { color: item.value === endMonth ? theme.primary : item.value < startMonth ? theme.textMuted : theme.textPrimary }
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.value === endMonth && <Ionicons name="checkmark" size={20} color={theme.primary} />}
                </TouchableOpacity>
              )}
              style={{ maxHeight: 400 }}
            />
            <TouchableOpacity style={[styles.modalClose, { borderColor: theme.border }]} onPress={() => setModalEndMonth(false)}>
              <Text style={[styles.modalCloseText, { color: theme.textSecondary }]}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Categorías */}
      <Modal visible={modalCategories} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Seleccionar Categorías</Text>
            
            <View style={styles.categoryActions}>
              <TouchableOpacity style={styles.categoryActionBtn} onPress={selectAllCategories}>
                <Text style={[styles.categoryActionText, { color: theme.primary }]}>Todas</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.categoryActionBtn} onPress={deselectAllCategories}>
                <Text style={[styles.categoryActionText, { color: theme.textSecondary }]}>Ninguna</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={EXPENSE_CATEGORIES}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isSelected = selectedCategories.includes(item.id);
                return (
                  <TouchableOpacity
                    style={[styles.modalItem, isSelected && { backgroundColor: theme.primary + "22" }]}
                    onPress={() => toggleCategory(item.id)}
                  >
                    <Text style={[styles.modalItemText, { color: isSelected ? theme.primary : theme.textPrimary }]}>
                      {item.label}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={22} color={theme.primary} />}
                  </TouchableOpacity>
                );
              }}
              style={{ maxHeight: 350 }}
            />
            <TouchableOpacity 
              style={[styles.modalApply, { backgroundColor: theme.primary }]} 
              onPress={() => setModalCategories(false)}
            >
              <Text style={[styles.modalApplyText, { color: theme.background }]}>Aplicar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  backBtn: { padding: SPACING.xs },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  scroll: { flex: 1 },
  content: { padding: SPACING.lg },
  filtersCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  filtersTitle: { fontSize: 16, fontWeight: "700", marginBottom: SPACING.md },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  filterLabel: { flex: 1, fontSize: 14 },
  filterValue: { fontSize: 14, fontWeight: "600" },
  monthRange: { flexDirection: "row", gap: SPACING.sm, marginVertical: SPACING.sm },
  monthBtn: {
    flex: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    alignItems: "center",
  },
  monthBtnLabel: { fontSize: 12, marginBottom: 4 },
  monthBtnValue: { fontSize: 14, fontWeight: "600" },
  totalCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    alignItems: "center",
  },
  totalLabel: { fontSize: 13, marginBottom: SPACING.xs },
  totalAmount: { fontSize: 32, fontWeight: "900", marginVertical: SPACING.xs },
  totalPeriod: { fontSize: 12 },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: SPACING.sm, marginTop: SPACING.md },
  chartCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    borderWidth: 1,
    alignItems: "center",
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryInfo: { flex: 1, gap: 6 },
  categoryName: { fontSize: 14, fontWeight: "600" },
  categoryBar: { height: 6, borderRadius: 3 },
  categoryBarFill: { height: 6, borderRadius: 3 },
  categoryAmount: { alignItems: "flex-end" },
  categoryAmountText: { fontSize: 15, fontWeight: "700" },
  categoryPct: { fontSize: 11 },
  emptyState: { alignItems: "center", paddingVertical: SPACING.xxl },
  emptyText: { fontSize: 18, fontWeight: "700", marginTop: SPACING.lg },
  emptySubtext: { fontSize: 14, marginTop: SPACING.xs },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  modalContent: {
    width: "100%",
    maxHeight: "80%",
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: SPACING.md, textAlign: "center" },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
  },
  modalItemDisabled: { opacity: 0.4 },
  modalItemText: { fontSize: 15 },
  modalClose: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: "center",
  },
  modalCloseText: { fontSize: 14, fontWeight: "600" },
  categoryActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  categoryActionBtn: { padding: SPACING.sm },
  categoryActionText: { fontSize: 14, fontWeight: "600" },
  modalApply: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: "center",
  },
  modalApplyText: { fontSize: 15, fontWeight: "700" },
});