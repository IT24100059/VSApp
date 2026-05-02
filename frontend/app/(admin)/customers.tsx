import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BASE_URL } from "../config";

export default function CustomersScreen() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nic, setNic] = useState("");
  const [password, setPassword] = useState("");

  const [searchQuery, setSearchQuery] = useState("");

  // FETCH ALL USERS ON LOAD (Using the new ADMIN route!)
  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      // --- UPDATED URL ---
      const response = await axios.get(`${BASE_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClients(response.data);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not fetch customers from database.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert(
      "Delete Customer",
      "Are you sure you want to permanently delete this customer?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("userToken");
              // --- UPDATED URL ---
              await axios.delete(`${BASE_URL}/admin/users/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              setClients(clients.filter((client) => client._id !== id));
            } catch (error) {
              Alert.alert("Error", "Could not delete customer.");
            }
          },
        },
      ],
    );
  };

  const openEditModal = (client) => {
    setEditingId(client._id);
    setName(client.name);
    setEmail(client.email);
    setPhone(client.phone);
    setNic(client.nic || "");
    setPassword("");
    setModalVisible(true);
  };

  const openAddModal = () => {
    setEditingId(null);
    setName("");
    setEmail("");
    setPhone("");
    setNic("");
    setPassword("");
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      Alert.alert("Validation Error", "Name, Email, and Phone are required.");
      return;
    }

    const phoneRegex = /^0\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return Alert.alert(
        "Validation Error",
        "Please enter a valid 10-digit phone number (e.g., 0771234567).",
      );
    }

    if (nic && !/^([0-9]{9}[vVxX]|[0-9]{12})$/.test(nic)) {
      return Alert.alert(
        "Validation Error",
        "Please enter a valid Sri Lankan NIC.",
      );
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const payload = { name, email: email.toLowerCase().trim(), phone, nic };

      if (editingId) {
        // UPDATE EXISTING USER (Using the new ADMIN route!)
        const response = await axios.put(
          `${BASE_URL}/admin/users/${editingId}`,
          payload,
          config,
        );
        setClients(
          clients.map((c) => (c._id === editingId ? response.data : c)),
        );
      } else {
        // CREATE NEW USER (Keeps the auth route so the password hashes correctly)
        if (!password)
          return Alert.alert(
            "Validation Error",
            "Temporary password is required for new users.",
          );
        payload.password = password;
        payload.role = "user";

        await axios.post(`${BASE_URL}/auth/register`, payload);
        await fetchCustomers();
      }

      setModalVisible(false);
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to save customer.",
      );
    } finally {
      setSaving(false);
    }
  };

  // --- CRASH-PROOF FILTER LOGIC ---
  const filteredClients = clients.filter((client) => {
    const search = searchQuery.toLowerCase();
    const safePhone = client.phone || "";
    const safeNic = client.nic || "";
    const safeName = client.name || "";

    return (
      safePhone.includes(search) ||
      safeNic.toLowerCase().includes(search) ||
      safeName.toLowerCase().includes(search)
    );
  });

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Manage Customers</Text>

      <TextInput
        style={styles.mainSearchInput}
        placeholder="Search by Name, Phone, or NIC..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <TouchableOpacity style={styles.button} onPress={openAddModal}>
        <Text style={styles.buttonText}>+ Add New Customer</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#007bff"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={filteredClients}
          keyExtractor={(item) => item._id}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", marginTop: 20, color: "gray" }}>
              No customers found in the database.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.infoText}>Email: {item.email}</Text>
              <Text style={styles.infoText}>Phone: {item.phone}</Text>
              <Text style={styles.infoText}>NIC: {item.nic || "N/A"}</Text>

              <View style={styles.actionRow}>
                <TouchableOpacity onPress={() => openEditModal(item)}>
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item._id)}>
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>
              {editingId ? "Edit Customer" : "Register New Client"}
            </Text>

            <ScrollView>
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={name}
                onChangeText={setName}
              />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
              <TextInput
                style={styles.input}
                placeholder="NIC Number (Optional)"
                value={nic}
                onChangeText={setNic}
              />

              {!editingId && (
                <TextInput
                  style={styles.input}
                  placeholder="Temporary Password"
                  secureTextEntry={true}
                  value={password}
                  onChangeText={setPassword}
                />
              )}

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>
                    {editingId ? "Update Client" : "Save Client"}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, styles.cancelBtn]}
                onPress={() => setModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 50,
    backgroundColor: "#f8f9fa",
  },
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 15, color: "#333" },
  mainSearchInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 15,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  infoText: { fontSize: 14, color: "#666", marginBottom: 5 },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 15,
    gap: 20,
  },
  editText: { color: "#28a745", fontWeight: "bold", fontSize: 16 },
  deleteText: { color: "#dc3545", fontWeight: "bold", fontSize: 16 },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 25,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: "60%",
  },
  modalHeader: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  submitBtn: {
    backgroundColor: "#28a745",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  cancelBtn: { backgroundColor: "#6c757d" },
});
