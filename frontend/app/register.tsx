import axios from "axios";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { BASE_URL } from "./config";

const REGISTER_URL = `${BASE_URL}/auth/register`;

export default function RegisterScreen() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    // Basic validation
    if (!name || !email || !phone || !password) {
      Alert.alert(
        "Missing Fields",
        "Please fill in all details to create your account.",
      );
      return;
    }

    setLoading(true);

    try {
      // Send the data to your Node.js API
      // Note: By default, our backend assigns the 'user' role automatically!
      await axios.post(REGISTER_URL, {
        name,
        email: email.toLowerCase().trim(),
        phone,
        password,
      });

      Alert.alert(
        "Account Created! 🎉",
        "Welcome to the Garage! Please log in with your new credentials.",
      );

      // Send them back to the login screen
      router.replace("/");
    } catch (error) {
      console.error(error);
      const message =
        error.response?.data?.message ||
        "Registration failed. Please check your connection.";
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <Text style={styles.title}>Create an Account</Text>
          <Text style={styles.subtitle}>
            Join us to book and track your vehicle services.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={name}
            onChangeText={setName}
          />

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
            placeholder="Phone Number (e.g. 0771234567)"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <TextInput
            style={styles.input}
            placeholder="Create Password"
            secureTextEntry={true}
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitBtnText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backBtnText}>
              Already have an account? Log In
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  container: {
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  submitBtn: {
    backgroundColor: "#0ea5e9", // A nice primary blue
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  submitBtnText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  backBtn: {
    marginTop: 20,
    alignItems: "center",
  },
  backBtnText: {
    color: "#007bff",
    fontSize: 16,
  },
});
