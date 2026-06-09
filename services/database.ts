import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── HELPERS ─────────────────────────────────────────────────
const getJSON = async <T>(key: string): Promise<T[]> => {
  try {
    const val = await AsyncStorage.getItem(key);
    return val ? JSON.parse(val) : [];
  } catch { return []; }
};

const setJSON = async (key: string, data: any[]) => {
  await AsyncStorage.setItem(key, JSON.stringify(data));
};

export const initDatabase = async () => {
  // AsyncStorage no requiere inicialización
};

// ─── TRANSACTIONS ───────────────────────────────────────────
export const insertTransaction = async (t: {
  id: string; type: "income" | "expense"; category: string;
  subcategory?: string; amount: number; description?: string; date: string;
}) => {
  const txs = await getJSON<Transaction>("@transactions");
  txs.unshift({ ...t, created_at: new Date().toISOString() });
  await setJSON("@transactions", txs);
};

export const getTransactionsByMonth = async (year: number, month: number): Promise<Transaction[]> => {
  const txs = await getJSON<Transaction>("@transactions");
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const to = `${year}-${String(month).padStart(2, "0")}-31`;
  return txs.filter(t => t.date >= from && t.date <= to);
};

export const getAllTransactions = async (): Promise<Transaction[]> => {
  return getJSON<Transaction>("@transactions");
};

export const deleteTransaction = async (id: string) => {
  const txs = await getJSON<Transaction>("@transactions");
  await setJSON("@transactions", txs.filter(t => t.id !== id));
};

// ─── OBJECTIVES ─────────────────────────────────────────────
export const insertObjective = async (o: {
  id: string; name: string; target_amount: number; current_amount?: number; deadline?: string;
}) => {
  const objs = await getJSON<Objective>("@objectives");
  objs.unshift({ ...o, current_amount: o.current_amount ?? 0, created_at: new Date().toISOString() });
  await setJSON("@objectives", objs);
};

export const getObjectives = async (): Promise<Objective[]> => {
  return getJSON<Objective>("@objectives");
};

export const updateObjectiveAmount = async (id: string, amount: number) => {
  const objs = await getJSON<Objective>("@objectives");
  const updated = objs.map(o => o.id === id ? { ...o, current_amount: amount } : o);
  await setJSON("@objectives", updated);
};

export const deleteObjective = async (id: string) => {
  const objs = await getJSON<Objective>("@objectives");
  await setJSON("@objectives", objs.filter(o => o.id !== id));
};

// ─── CHAT ────────────────────────────────────────────────────
export const insertChatMessage = async (m: { id: string; role: "user" | "assistant"; content: string }) => {
  const msgs = await getJSON<ChatMessage>("@chat");
  msgs.push({ ...m, created_at: new Date().toISOString() });
  if (msgs.length > 100) msgs.splice(0, msgs.length - 100);
  await setJSON("@chat", msgs);
};

export const getChatHistory = async (limit = 50): Promise<ChatMessage[]> => {
  const msgs = await getJSON<ChatMessage>("@chat");
  return msgs.slice(-limit);
};

export const clearChatHistory = async () => {
  await AsyncStorage.removeItem("@chat");
};

// ─── USER PROFILE ────────────────────────────────────────────
export const saveUserProfile = async (p: { email: string; name: string; photo_url?: string }) => {
  const existing = await getUserProfile();
  const profile: UserProfile = {
    id: 1,
    email: p.email,
    name: p.name,
    photo_url: p.photo_url,
    financial_profile: existing?.financial_profile ?? "moderado",
    currency: existing?.currency ?? "ARS",
    last_backup: existing?.last_backup,
  };
  await AsyncStorage.setItem("@profile", JSON.stringify(profile));
};

export const getUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const val = await AsyncStorage.getItem("@profile");
    return val ? JSON.parse(val) : null;
  } catch { return null; }
};

export const updateLastBackup = async () => {
  const profile = await getUserProfile();
  if (profile) {
    profile.last_backup = new Date().toISOString();
    await AsyncStorage.setItem("@profile", JSON.stringify(profile));
  }
};

// ─── TYPES ───────────────────────────────────────────────────
export interface Transaction {
  id: string; type: "income" | "expense"; category: string;
  subcategory?: string; amount: number; description?: string;
  date: string; created_at: string;
}
export interface Objective {
  id: string; name: string; target_amount: number;
  current_amount: number; deadline?: string; created_at: string;
}
export interface ChatMessage {
  id: string; role: "user" | "assistant"; content: string; created_at: string;
}
export interface UserProfile {
  id: number; email: string; name: string; photo_url?: string;
  financial_profile: string; currency: string; last_backup?: string;
}
