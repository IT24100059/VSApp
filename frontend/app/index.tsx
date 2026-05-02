import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BASE_URL } from "./config";

const API_URL = `${BASE_URL}/auth/login`;

export default function LoginScreen() {
  const router = useRouter();

  // Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }

    setLoading(true);

    try {
      // 1. Send credentials to your Node.js backend
      const response = await axios.post(API_URL, {
        email: email.toLowerCase().trim(),
        password: password,
      });

      // 2. Extract the token and user data from the backend response
      const { token, user } = response.data;

      // 3. Save the JWT ticket securely on the phone
      await AsyncStorage.setItem("userToken", token);
      await AsyncStorage.setItem("userRole", user.role);

      Alert.alert("Success", `Welcome back, ${user.name}!`);

      // 4. Securely route them based on their ACTUAL database role
      if (user.role === "admin") {
        router.replace("/(admin)/dashboard");
      } else {
        router.replace("/(user)/profile");
      }
    } catch (error) {
      console.error(error);
      const message =
        error.response?.data?.message ||
        "Could not connect to server. Check your Wi-Fi IP address in config.ts!";
      Alert.alert("Login Failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        {/* --- INNOVATIVE APP NAME --- */}
        <Text style={styles.title}>Vehicle Service Center System</Text>

        <TextInput
          style={styles.input}
          placeholder="Email Address"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry={true}
          value={password}
          onChangeText={setPassword}
        />

        {/* --- LOGIN BUTTON --- */}
        <TouchableOpacity
          style={styles.loginSubmit}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.loginSubmitText}>Secure Login</Text>
          )}
        </TouchableOpacity>

        {/* --- SIGN UP LINK --- */}
        <TouchableOpacity
          style={{ marginTop: 25, alignItems: "center" }}
          onPress={() => router.push("/register")}
        >
          <Text style={{ color: "#007bff", fontSize: 16, fontWeight: "500" }}>
            Don't have an account? Sign Up
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#f8f9fa",
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    marginBottom: 40,
    textAlign: "center",
    color: "#1e293b",
    letterSpacing: 1,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16,
    color: "#333",
  },
  loginSubmit: {
    backgroundColor: "#0ea5e9",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#0ea5e9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  loginSubmitText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
