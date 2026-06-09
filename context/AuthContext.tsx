import React, { createContext, useContext, useEffect, useState } from "react";
import { Alert } from "react-native";
import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { saveUserProfile, getUserProfile, UserProfile } from "@/services/database";

GoogleSignin.configure({
  webClientId: "909029635799-1u27mgg14huhto1u845b9uijs1v1id82.apps.googleusercontent.com",
  offlineAccess: true,
  scopes: [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file",
  ],
});

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          await saveUserProfile({
            email: firebaseUser.email ?? "",
            name: firebaseUser.displayName ?? "",
            photo_url: firebaseUser.photoURL ?? undefined,
          });
          const profile = await getUserProfile();
          setUser(profile);
        } else {
          setUser(null);
        }
      } catch (e) {
        console.error("Auth state error:", e);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const signIn = async () => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();
      // Compatible con v11 y v13 de google-signin
      const idToken = (result as any)?.data?.idToken ?? (result as any)?.idToken;
      if (!idToken) {
        console.error("No idToken received", result);
        Alert.alert(
          "Error de autenticación",
          "No se recibió el token de Google. Verificá que la app esté configurada correctamente en Firebase Console (SHA-1 del certificado)."
        );
        return;
      }
      const credential = auth.GoogleAuthProvider.credential(idToken);
      await auth().signInWithCredential(credential);

      // Guardar access token de Google para uso con Sheets/Drive API
      try {
        const tokens = await GoogleSignin.getTokens();
        if (tokens.accessToken) {
          await AsyncStorage.setItem("@cfo_google_token", tokens.accessToken);
        }
      } catch (tokenErr) {
        console.warn("No se pudo obtener access token de Google:", tokenErr);
      }
    } catch (e: any) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (e.code === statusCodes.IN_PROGRESS) return;
      console.error("SignIn error:", e);
      const msg =
        e.code === "DEVELOPER_ERROR" || e.code === 10
          ? "Error de configuración (DEVELOPER_ERROR). La huella SHA-1 del certificado no coincide con la registrada en Firebase/Google Cloud Console."
          : e.message ?? "Error desconocido al iniciar sesión.";
      Alert.alert("Error al iniciar sesión", msg);
    }
  };

  const signOut = async () => {
    try {
      await GoogleSignin.signOut();
      await auth().signOut();
      await AsyncStorage.removeItem("@cfo_google_token");
    } catch (e) {
      console.error("SignOut error:", e);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
