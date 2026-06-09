import React, { useState, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS } from "@/constants/theme";
import {
  getChatHistory, insertChatMessage, clearChatHistory,
  getTransactionsByMonth, ChatMessage,
} from "@/services/database";
import { sendMessageToAgent, GroqMessage } from "@/services/groq";
import uuid from "react-native-uuid";
import { useTheme } from "@/context/ThemeContext";

export default function ChatScreen() {
  const { theme } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  // Estilos dinámicos basados en el tema
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
      borderBottomWidth: 1, borderBottomColor: theme.border,
      backgroundColor: theme.surface,
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
    headerAvatar: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: theme.primary + "22",
      justifyContent: "center", alignItems: "center",
      borderWidth: 1.5, borderColor: theme.primary,
    },
    headerTitle: { fontSize: 16, fontWeight: "800", color: theme.textPrimary },
    headerSub: { fontSize: 12, color: theme.primary },
    clearBtn: { padding: SPACING.xs },
    msgList: { padding: SPACING.md, paddingBottom: SPACING.lg },
    msgRow: { flexDirection: "row", marginBottom: SPACING.sm, alignItems: "flex-end", gap: SPACING.xs },
    msgRowUser: { flexDirection: "row-reverse" },
    agentAvatar: {
      width: 30, height: 30, borderRadius: 15,
      backgroundColor: theme.primary + "22",
      justifyContent: "center", alignItems: "center",
      borderWidth: 1, borderColor: theme.primary,
      flexShrink: 0,
    },
    bubble: {
      maxWidth: "80%", borderRadius: RADIUS.lg,
      padding: SPACING.sm, paddingHorizontal: SPACING.md,
    },
    bubbleAgent: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
    bubbleUser: { backgroundColor: theme.primary },
    bubbleText: { fontSize: 14, color: theme.textPrimary, lineHeight: 20 },
    bubbleTextUser: { color: "#fff" },
    typingRow: { flexDirection: "row", alignItems: "center", gap: SPACING.xs, paddingHorizontal: SPACING.md, marginBottom: SPACING.sm },
    typingBubble: { flexDirection: "row", alignItems: "center", gap: SPACING.xs, backgroundColor: theme.surface, borderRadius: RADIUS.lg, padding: SPACING.sm, paddingHorizontal: SPACING.md, borderWidth: 1, borderColor: theme.border },
    typingText: { fontSize: 13, color: theme.textMuted },
    quickRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs, paddingHorizontal: SPACING.md, marginBottom: SPACING.sm },
    quickChip: { backgroundColor: theme.surface, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 6, borderWidth: 1, borderColor: theme.primary + "66" },
    quickText: { fontSize: 12, color: theme.primary, fontWeight: "600" },
    inputRow: {
      flexDirection: "row", alignItems: "flex-end", gap: SPACING.sm,
      padding: SPACING.sm, paddingHorizontal: SPACING.md,
      borderTopWidth: 1, borderTopColor: theme.border,
      backgroundColor: theme.surface,
    },
    input: {
      flex: 1, backgroundColor: theme.card, borderRadius: RADIUS.md,
      paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
      color: theme.textPrimary, fontSize: 14, maxHeight: 100,
      borderWidth: 1, borderColor: theme.border,
    },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.primary, justifyContent: "center", alignItems: "center" },
    sendBtnDisabled: { opacity: 0.4 },
  });

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const history = await getChatHistory(60);
        setMessages(history);
        if (history.length === 0) await sendWelcome();
      };
      load();
    }, [])
  );

  const buildFinancialContext = async (): Promise<string> => {
    const now = new Date();
    const txs = await getTransactionsByMonth(now.getFullYear(), now.getMonth() + 1);
    const income = txs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expenses = txs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

    const byCategory: Record<string, number> = {};
    txs.filter(t => t.type === "expense").forEach(t => {
      byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount;
    });
    const cats = Object.entries(byCategory)
      .map(([k, v]) => `  - ${k}: $${v.toLocaleString("es-AR")}`)
      .join("\n");

    return `Mes actual: ${now.toLocaleString("es-AR", { month: "long", year: "numeric" })}
Ingresos totales: $${income.toLocaleString("es-AR")}
Gastos totales: $${expenses.toLocaleString("es-AR")}
Balance: $${(income - expenses).toLocaleString("es-AR")}
Tasa de ahorro: ${income > 0 ? Math.round(((income - expenses) / income) * 100) : 0}%
Gastos por categoría:
${cats || "  (sin gastos registrados aún)"}`;
  };

  const sendWelcome = async () => {
    const welcome: ChatMessage = {
      id: uuid.v4() as string,
      role: "assistant",
      content: "¡Hola! 👋 Soy tu CFO del Hogar.\n\nPuedo ayudarte a analizar tus finanzas, detectar fugas de dinero, sugerirte estrategias de ahorro e inversión adaptadas a Argentina, y mucho más.\n\n¿Con qué querés empezar hoy?",
      created_at: new Date().toISOString(),
    };
    await insertChatMessage(welcome);
    setMessages([welcome]);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const userMsg: ChatMessage = {
      id: uuid.v4() as string,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    await insertChatMessage(userMsg);
    const updatedMsgs = [...messages, userMsg];
    setMessages(updatedMsgs);
    setLoading(true);

    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const context = await buildFinancialContext();
      const groqHistory: GroqMessage[] = updatedMsgs.slice(-20).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const reply = await sendMessageToAgent(groqHistory, context);

      const assistantMsg: ChatMessage = {
        id: uuid.v4() as string,
        role: "assistant",
        content: reply,
        created_at: new Date().toISOString(),
      };
      await insertChatMessage(assistantMsg);
      setMessages(prev => [...prev, assistantMsg]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      const errorMsg = e?.message || "Error desconocido";
      Alert.alert(
        "Error de conexión",
        errorMsg + "\n\nRevisá que tu API Key de Groq esté configurada correctamente en el archivo .env.local (variables EXPO_PUBLIC_GROQ_API_KEY)."
      );
      console.error("Groq API Error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    Alert.alert("Limpiar historial", "¿Eliminás toda la conversación?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Limpiar", style: "destructive",
        onPress: async () => { await clearChatHistory(); setMessages([]); await sendWelcome(); },
      },
    ]);
  };

  const renderMsg = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
        {!isUser && (
          <View style={styles.agentAvatar}>
            <Ionicons name="stats-chart" size={16} color={theme.primary} />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAgent]}>
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={80}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerAvatar}>
            <Ionicons name="stats-chart" size={20} color={theme.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Agente CFO</Text>
            <Text style={styles.headerSub}>Asesor financiero IA</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
          <Ionicons name="trash-outline" size={20} color={theme.textMuted} />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={i => i.id}
        renderItem={renderMsg}
        contentContainerStyle={styles.msgList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      />

      {loading && (
        <View style={styles.typingRow}>
          <View style={styles.agentAvatar}>
            <Ionicons name="stats-chart" size={16} color={theme.primary} />
          </View>
          <View style={styles.typingBubble}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={styles.typingText}>Analizando...</Text>
          </View>
        </View>
      )}

      {messages.length <= 1 && (
        <View style={styles.quickRow}>
          {[
            "Analizá mis gastos del mes",
            "¿Cuánto puedo ahorrar?",
            "Estrategias de inversión en Argentina",
          ].map((q) => (
            <TouchableOpacity key={q} style={styles.quickChip} onPress={() => { setInput(q); }}>
              <Text style={styles.quickText}>{q}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Consultá al agente CFO..."
          placeholderTextColor={theme.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!input.trim() || loading}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
