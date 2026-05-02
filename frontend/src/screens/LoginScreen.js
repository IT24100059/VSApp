import { useState } from "react";
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function LoginScreen() {
  // This state keeps track of which role is selected. It defaults to 'user'.
  const [role, setRole] = useState("user");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vehicle Service Center</Text>

      {/* Role Selection Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, role === "user" && styles.activeButton]}
          onPress={() => setRole("user")}
        >
          <Text
            style={[styles.toggleText, role === "user" && styles.activeText]}
          >
            User Login
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleButton, role === "admin" && styles.activeButton]}
          onPress={() => setRole("admin")}
        >
          <Text
            style={[styles.toggleText, role === "admin" && styles.activeText]}
          >
            Admin Login
          </Text>
        </TouchableOpacity>
      </View>

      {/* Input Fields */}
      <TextInput
        style={styles.input}
        placeholder={`${role === "admin" ? "Admin" : "User"} Email`}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry={true}
      />

      {/* Login Button */}
      <TouchableOpacity
        style={styles.loginSubmit}
        onPress={() => alert(`Attempting ${role.toUpperCase()} Login!`)}
      >
        <Text style={styles.loginSubmitText}>Login</Text>
      </TouchableOpacity>
    </View>
  );
}

// React Native Styles (Similar to CSS, but written in JavaScript objects)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
    color: "#333",
  },

  toggleContainer: {
    flexDirection: "row",
    marginBottom: 20,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#007bff",
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "transparent",
    alignItems: "center",
  },
  activeButton: { backgroundColor: "#007bff" },
  toggleText: { fontSize: 16, fontWeight: "600", color: "#007bff" },
  activeText: { color: "#fff" },

  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16,
  },

  loginSubmit: {
    backgroundColor: "#28a745",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  loginSubmitText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});
