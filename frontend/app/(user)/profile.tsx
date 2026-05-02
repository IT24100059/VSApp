import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import React, { useEffect, useState } from "react";
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
import { BASE_URL } from "../config"; // Adjust path if your config is somewhere else

export default function UserProfileScreen() {
  const [user, setUser] = useState({ name: "Loading...", nic: "200212345678" });
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Fetch the user's data as soon as the screen loads
  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const response = await axios.get(`${BASE_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUser({
        name: response.data.name,
        nic: response.data.nic || "200212345678",
      });
      setPhone(response.data.phone);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not load profile data.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    // Sri Lankan Phone Validation
    const phoneRegex = /^0\d{9}$/;
    if (!phoneRegex.test(phone)) {
      Alert.alert(
        "Validation Error",
        "Please enter a valid 10-digit phone number.",
      );
      return;
    }

    setUpdating(true);
    try {
      const token = await AsyncStorage.getItem("userToken");

      // Create a payload. Only send password if they typed a new one!
      const payload = { phone };
      if (password) payload.password = password;

      await axios.put(`${BASE_URL}/auth/profile`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Alert.alert("Success", "Profile updated successfully!");
      setPassword(""); // Clear the password box after saving
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to update profile.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={{ marginTop: 10 }}>Loading Profile...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <Text style={styles.header}>My Profile</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={[styles.input, styles.readOnly]}
          value={user.name}
          editable={false}
        />

        <Text style={styles.label}>NIC Number</Text>
        <TextInput
          style={[styles.input, styles.readOnly]}
          value={user.nic}
          editable={false}
        />

        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>New Password (Optional)</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={true}
          placeholder="Enter new password"
        />

        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleUpdate}
          disabled={updating}
        >
          {updating ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.btnText}>Update Profile</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 20,
    backgroundColor: "#f8f9fa",
  },
  header: { fontSize: 24, fontWeight: "bold", color: "#333", marginBottom: 20 },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    elevation: 2,
  },
  label: { fontSize: 14, fontWeight: "bold", color: "#555", marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  readOnly: { backgroundColor: "#e9ecef", color: "#6c757d" },
  submitBtn: {
    backgroundColor: "#0ea5e9",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  btnText: { color: "white", fontWeight: "bold", fontSize: 16 },
});
