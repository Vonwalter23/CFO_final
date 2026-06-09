import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  Pressable,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LineChart } from "react-native-chart-kit";
import { SPACING, RADIUS, COLORS } from "@/constants/theme";
import { getAllTransactions, Transaction } from "@/services/database";
import { useTheme } from "@/context/ThemeContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const W = Dimensions.get("window").width;
const CHART_WIDTH = W - SPACING.lg * 2 - SPACING.md * 2;

const MONTHS_ES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
];

const MONTHS_FULL_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

interface MonthlyData {
  month: number;
  income: number;
  expenses: number;
  balance: number;
}

export default function BalanceHistoricoScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allYears, setAllYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [startMonth, setStartMonth] = useState<number>(1);
  const [endMonth, setEndMonth] = useState<number>(new Date().getMonth() + 1);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showStartMonthPicker, setShowStartMonthPicker] = useState(false);
  const [showEndMonthPicker, setShowEndMonthPicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const txs = await getAllTransactions();
    setTransactions(txs);
    
    // Extraer años únicos de las transacciones
    const years = new Set<number>();
    txs.forEach(t => {
      const year = parseInt(t.date.split("-")[0]);
      years.add(year);
    });
    
    const sortedYears = Array.from(years).sort((a, b) => b - a);
    if (sortedYears.length > 0) {
      setAllYears(sortedYears);
      setSelectedYear(sortedYears.includes(new Date().getFullYear()) 
        ? new Date().getFullYear() 
        : sortedYears[0]);
    } else {
      // Si no hay transacciones, mostrar el año actual
      setAllYears([new Date().getFullYear()]);
    }
  };

  // Calcular datos mensuales para el período seleccionado
  const getMonthlyData = useCallback((): MonthlyData[] => {
    const data: MonthlyData[] = [];
    
    for (let m = startMonth; m <= endMonth; m++) {
      const monthTransactions = transactions.filter(t => {
        const [txYear, txMonth] = t.date.split("-").map(Number);
        return txYear === selectedYear && txMonth === m;
      });
      
      const income = monthTransactions
        .filter(t => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);
      
      const expenses = monthTransactions
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);
      
      data.push({
        month: m,
        income,
        expenses,
        balance: income - expenses
      });
    }
    
    return data;
  }, [transactions, selectedYear, startMonth, endMonth]);

  const monthlyData = getMonthlyData();
  
  // Totales del período
  const totalIncome = monthlyData.reduce((sum, d) => sum + d.income, 0);
  const totalExpenses = monthlyData.reduce((sum, d) => sum + d.expenses, 0);
  const totalBalance = totalIncome - totalExpenses;

  const fmt = (n: number) =>
    n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

  // Preparar datos para el gráfico
  const chartLabels = monthlyData.map(d => MONTHS_ES[d.month - 1]);
  const chartIncomeData = monthlyData.map(d => d.income > 0 ? d.income : 0.1);
  const chartExpenseData = monthlyData.map(d => d.expenses > 0 ? d.expenses : 0.1);

  const hasData = monthlyData.some(d => d.income > 0 || d.expenses > 0);

  // Configuración del gráfico
  const chartConfig = {
    backgroundColor: theme.surface,
    backgroundGradientFrom: theme.surface,
    backgroundGradientTo: theme.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(138, 155, 176, ${opacity})`,
    style: {
      borderRadius: RADIUS.md,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
    },
    propsForBackgroundLines: {
      strokeDasharray: "",
      stroke: theme.border,
      strokeWidth: 0.5,
    },
  };

  // Selector de año
  const renderYearSelector = () => (
    <TouchableOpacity 
      style={[styles.selectorBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={() => setShowYearPicker(true)}
    >
      <Ionicons name="calendar-outline" size={16} color={theme.primary} />
      <Text style={[styles.selectorText, { color: theme.textPrimary }]}>{selectedYear}</Text>
      <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
    </TouchableOpacity>
  );

  // Selector de mes
  const renderMonthSelector = (
    value: number,
    onPress: () => void,
    label: string
  ) => (
    <TouchableOpacity 
      style={[styles.selectorBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={onPress}
    >
      <Text style={[styles.selectorLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.selectorText, { color: theme.textPrimary }]}>
        {MONTHS_ES[value - 1]}
      </Text>
      <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
    </TouchableOpacity>
  );

  // Picker Modal genérico
  const renderPickerModal = (
    visible: boolean,
    onClose: () => void,
    options: { label: string; value: number }[],
    selectedValue: number,
    onSelect: (value: number) => void,
    title: string
  ) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
          <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{title}</Text>
          <ScrollView style={styles.modalScroll}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.modalOption,
                  selectedValue === opt.value && { backgroundColor: theme.primary + "22" }
                ]}
                onPress={() => {
                  onSelect(opt.value);
                  onClose();
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  { color: selectedValue === opt.value ? theme.primary : theme.textPrimary }
                ]}>
                  {opt.label}
                </Text>
                {selectedValue === opt.value && (
                  <Ionicons name="checkmark" size={20} color={theme.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
            <Text style={[styles.modalCloseText, { color: theme.textSecondary }]}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Balance Histórico</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView 
        style={styles.scroll} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Filtros */}
        <View style={styles.filtersContainer}>
          <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Año</Text>
          {renderYearSelector()}

          <Text style={[styles.filterLabel, { color: theme.textSecondary, marginLeft: SPACING.md }]}>Período</Text>
          {renderMonthSelector(startMonth, () => setShowStartMonthPicker(true), "Desde")}
          <Text style={[styles.filterSeparator, { color: theme.textSecondary }]}>—</Text>
          {renderMonthSelector(endMonth, () => setShowEndMonthPicker(true), "Hasta")}
        </View>

        {/* Resumen del Balance */}
        <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.summaryTitle, { color: theme.textPrimary }]}>Balance Total del Período</Text>
          <Text style={[
            styles.summaryBalance, 
            { color: totalBalance >= 0 ? theme.success : theme.danger }
          ]}>
            {fmt(totalBalance)}
          </Text>
          
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIcon, { backgroundColor: theme.success + "22" }]}>
                <Ionicons name="arrow-down" size={16} color={theme.success} />
              </View>
              <View>
                <Text style={[styles.summaryItemLabel, { color: theme.textSecondary }]}>Ingresos</Text>
                <Text style={[styles.summaryItemValue, { color: theme.success }]}>{fmt(totalIncome)}</Text>
              </View>
            </View>
            
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIcon, { backgroundColor: theme.danger + "22" }]}>
                <Ionicons name="arrow-up" size={16} color={theme.danger} />
              </View>
              <View>
                <Text style={[styles.summaryItemLabel, { color: theme.textSecondary }]}>Gastos</Text>
                <Text style={[styles.summaryItemValue, { color: theme.danger }]}>{fmt(totalExpenses)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Gráfico */}
        <View style={[styles.chartContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>📈 Evolución Ingresos vs Gastos</Text>
          
          {/* Leyenda */}
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.success }]} />
              <Text style={[styles.legendText, { color: theme.textSecondary }]}>Ingresos</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.danger }]} />
              <Text style={[styles.legendText, { color: theme.textSecondary }]}>Gastos</Text>
            </View>
          </View>

          {hasData ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <LineChart
                data={{
                  labels: chartLabels,
                  datasets: [
                    {
                      data: chartIncomeData,
                      color: (opacity = 1) => `rgba(0, 200, 150, ${opacity})`,
                      strokeWidth: 2.5,
                    },
                    {
                      data: chartExpenseData,
                      color: (opacity = 1) => `rgba(255, 77, 106, ${opacity})`,
                      strokeWidth: 2.5,
                    },
                  ],
                  legend: ["Ingresos", "Gastos"],
                }}
                width={Math.max(CHART_WIDTH, chartLabels.length * 50)}
                height={220}
                chartConfig={{
                  ...chartConfig,
                  propsForLine: {
                    strokeWidth: 2.5,
                  },
                }}
                bezier
                style={styles.chart}
                withInnerLines={true}
                withOuterLines={true}
                withVerticalLines={false}
                withHorizontalLines={true}
                yAxisLabel="$"
                yAxisSuffix=""
                formatYLabel={(value) => {
                  const num = parseInt(value);
                  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
                  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
                  return `${num}`;
                }}
              />
            </ScrollView>
          ) : (
            <View style={styles.emptyChart}>
              <Ionicons name="analytics-outline" size={48} color={theme.textMuted} />
              <Text style={[styles.emptyChartText, { color: theme.textMuted }]}>
                Sin datos para el período seleccionado
              </Text>
              <Text style={[styles.emptyChartSubtext, { color: theme.textMuted }]}>
                Registrá transacciones para ver el gráfico
              </Text>
            </View>
          )}
        </View>

        {/* Detalle mensual */}
        {monthlyData.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>📋 Detalle Mensual</Text>
            {monthlyData.map((data) => (
              <View 
                key={data.month} 
                style={[styles.monthRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <View style={styles.monthInfo}>
                  <Text style={[styles.monthName, { color: theme.textPrimary }]}>
                    {MONTHS_FULL_ES[data.month - 1]}
                  </Text>
                  <View style={styles.monthAmounts}>
                    <Text style={[styles.monthIncome, { color: theme.success }]}>
                      +{fmt(data.income)}
                    </Text>
                    <Text style={[styles.monthExpense, { color: theme.danger }]}>
                      -{fmt(data.expenses)}
                    </Text>
                  </View>
                </View>
                <View style={styles.monthBalance}>
                  <Text style={[
                    styles.monthBalanceText,
                    { color: data.balance >= 0 ? theme.success : theme.danger }
                  ]}>
                    {data.balance >= 0 ? "+" : ""}{fmt(data.balance)}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      {/* Modales de selección */}
      {renderPickerModal(
        showYearPicker,
        () => setShowYearPicker(false),
        allYears.map(y => ({ label: y.toString(), value: y })),
        selectedYear,
        (val) => setSelectedYear(val),
        "Seleccionar Año"
      )}

      {renderPickerModal(
        showStartMonthPicker,
        () => setShowStartMonthPicker(false),
        MONTHS_FULL_ES.map((name, i) => ({ 
          label: name, 
          value: i + 1 
        })),
        startMonth,
        (val) => {
          setStartMonth(val);
          if (val > endMonth) setEndMonth(val);
        },
        "Mes Inicio"
      )}

      {renderPickerModal(
        showEndMonthPicker,
        () => setShowEndMonthPicker(false),
        MONTHS_FULL_ES.map((name, i) => ({ 
          label: name, 
          value: i + 1 
        })),
        endMonth,
        (val) => {
          setEndMonth(val);
          if (val < startMonth) setStartMonth(val);
        },
        "Mes Fin"
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xl + 20,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerPlaceholder: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
  },
  filtersContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.lg,
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  selectorBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: SPACING.xs,
  },
  selectorLabel: {
    fontSize: 11,
  },
  selectorText: {
    fontSize: 14,
    fontWeight: "600",
  },
  filterSeparator: {
    marginHorizontal: SPACING.xs,
  },
  summaryCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: SPACING.sm,
  },
  summaryBalance: {
    fontSize: 32,
    fontWeight: "900",
    marginBottom: SPACING.md,
  },
  summaryRow: {
    flexDirection: "row",
    gap: SPACING.lg,
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  summaryItemLabel: {
    fontSize: 11,
  },
  summaryItemValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  chartContainer: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: SPACING.md,
  },
  legendContainer: {
    flexDirection: "row",
    marginBottom: SPACING.md,
    gap: SPACING.lg,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
  },
  chart: {
    borderRadius: RADIUS.md,
  },
  emptyChart: {
    alignItems: "center",
    paddingVertical: SPACING.xxl,
  },
  emptyChartText: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: SPACING.md,
  },
  emptyChartSubtext: {
    fontSize: 13,
    marginTop: SPACING.xs,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  monthRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.xs,
    borderWidth: 1,
  },
  monthInfo: {
    flex: 1,
  },
  monthName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  monthAmounts: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  monthIncome: {
    fontSize: 12,
    fontWeight: "600",
  },
  monthExpense: {
    fontSize: 12,
    fontWeight: "600",
  },
  monthBalance: {
    alignItems: "flex-end",
  },
  monthBalanceText: {
    fontSize: 15,
    fontWeight: "700",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  modalContent: {
    width: "100%",
    maxHeight: "70%",
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: SPACING.md,
  },
  modalScroll: {
    maxHeight: 300,
  },
  modalOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  modalOptionText: {
    fontSize: 16,
  },
  modalCloseBtn: {
    alignItems: "center",
    paddingVertical: SPACING.md,
    marginTop: SPACING.md,
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: "600",
  },
});