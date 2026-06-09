export const INCOME_CATEGORIES = [
  { id: "sueldo", label: "Sueldo principal", icon: "briefcase" },
  { id: "secundario", label: "Ingreso secundario", icon: "cash" },
  { id: "comision", label: "Comisiones", icon: "trending-up" },
  { id: "extra", label: "Extras / Bonos", icon: "star" },
  { id: "ayuda", label: "Ayuda familiar", icon: "people" },
  { id: "renta", label: "Rentas", icon: "home" },
  { id: "otro_ingreso", label: "Otro ingreso", icon: "add-circle" },
];

export const EXPENSE_CATEGORIES = [
  // FIJOS
  { id: "alquiler", label: "Alquiler / Hipoteca", icon: "home", type: "fixed" },
  { id: "servicios", label: "Servicios (luz/gas/agua)", icon: "flash", type: "fixed" },
  { id: "internet", label: "Internet / Celular", icon: "wifi", type: "fixed" },
  { id: "seguro", label: "Seguros", icon: "shield", type: "fixed" },
  { id: "colegio", label: "Colegio / Educación", icon: "school", type: "fixed" },
  { id: "transporte", label: "Transporte", icon: "car", type: "fixed" },
  { id: "salud", label: "Salud / Medicamentos", icon: "medical", type: "fixed" },
  { id: "deuda", label: "Cuotas / Deudas", icon: "card", type: "fixed" },
  { id: "suscripcion", label: "Suscripciones", icon: "repeat", type: "fixed" },
  // VARIABLES
  { id: "supermercado", label: "Supermercado", icon: "cart", type: "variable" },
  { id: "delivery", label: "Delivery / Comida", icon: "restaurant", type: "variable" },
  { id: "salidas", label: "Salidas / Ocio", icon: "beer", type: "variable" },
  { id: "compras", label: "Compras / Ropa", icon: "bag", type: "variable" },
  { id: "mascotas", label: "Mascotas", icon: "paw", type: "variable" },
  { id: "regalos", label: "Regalos", icon: "gift", type: "variable" },
  { id: "personal", label: "Gastos personales", icon: "person", type: "variable" },
  { id: "otro_gasto", label: "Otro gasto", icon: "ellipsis-horizontal", type: "variable" },
];

export const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

export const getCategoryLabel = (id: string): string => {
  return ALL_CATEGORIES.find((c) => c.id === id)?.label ?? id;
};

export const getCategoryIcon = (id: string): string => {
  return ALL_CATEGORIES.find((c) => c.id === id)?.icon ?? "help-circle";
};
