import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BASE_URL } from "../config";

export default function VehiclesScreen() {
  const [allCustomers, setAllCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [plate, setPlate] = useState("");
  const [makeModel, setMakeModel] = useState("");
  const [photoUri, setPhotoUri] = useState(null);

  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [mainSearchQuery, setMainSearchQuery] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [vRes, cRes] = await Promise.all([
        axios.get(`${BASE_URL}/admin/vehicles`, config),
        axios.get(`${BASE_URL}/admin/users`, config),
      ]);

      setVehicles(vRes.data);
      setAllCustomers(cRes.data);
    } catch (error) {
      Alert.alert("Error", "Could not fetch data from database.");
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = allCustomers.filter(
    (c) =>
      c.name?.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      c.phone?.includes(customerSearchQuery),
  );
  const cleanSearch = mainSearchQuery.toLowerCase().replace(/\s|-/g, "");
  const filteredVehicles = vehicles.filter((v) =>
    v.plate.toLowerCase().replace(/\s|-/g, "").includes(cleanSearch),
  );

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleDelete = (id) => {
    Alert.alert(
      "Remove Vehicle",
      "Are you sure you want to remove this vehicle?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("userToken");
              await axios.delete(`${BASE_URL}/admin/vehicles/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              setVehicles(vehicles.filter((v) => v._id !== id));
            } catch (error) {
              Alert.alert("Error", "Could not delete vehicle.");
            }
          },
        },
      ],
    );
  };

  const openAddModal = () => {
    setEditingId(null);
    setPlate("");
    setMakeModel("");
    setSelectedOwner(null);
    setCustomerSearchQuery("");
    setPhotoUri(null);
    setModalVisible(true);
  };

  const openEditModal = (vehicle) => {
    setEditingId(vehicle._id);
    setPlate(vehicle.plate);
    setMakeModel(vehicle.makeModel);
    setSelectedOwner(vehicle.userId);

    if (vehicle.photo) {
      setPhotoUri(`${BASE_URL.replace("/api", "")}${vehicle.photo}`);
    } else {
      setPhotoUri(null);
    }

    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!plate.trim() || !makeModel.trim() || !selectedOwner) {
      return Alert.alert(
        "Validation Error",
        "Please select an owner and fill all vehicle details.",
      );
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("userToken");

      const formData = new FormData();
      formData.append("userId", selectedOwner._id);
      formData.append("plate", plate.toUpperCase());
      formData.append("makeModel", makeModel);

      if (photoUri && photoUri.startsWith("file://")) {
        const filename = photoUri.split("/").pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image`;
        formData.append("photo", {
          uri: photoUri,
          name: filename,
          type,
        } as any);
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      };

      if (editingId) {
        // FIXED: Now using formData and config for Admin updates too!
        const response = await axios.put(
          `${BASE_URL}/admin/vehicles/${editingId}`,
          formData,
          config,
        );
        setVehicles(
          vehicles.map((v) => (v._id === editingId ? response.data : v)),
        );
      } else {
        // FormData post for creating new vehicle with image
        const response = await axios.post(
          `${BASE_URL}/admin/vehicles`,
          formData,
          config,
        );
        setVehicles([...vehicles, response.data]);
      }
      setModalVisible(false);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to save vehicle.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Vehicle Registry</Text>

      <TextInput
        style={styles.mainSearchInput}
        placeholder="Search by License Plate..."
        value={mainSearchQuery}
        onChangeText={setMainSearchQuery}
        autoCapitalize="characters"
      />

      <TouchableOpacity style={styles.button} onPress={openAddModal}>
        <Text style={styles.buttonText}>+ Register New Vehicle</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#17a2b8"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={filteredVehicles}
          keyExtractor={(item) => item._id}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", marginTop: 20, color: "gray" }}>
              No vehicles found.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {item.photo ? (
                  <Image
                    source={{
                      uri: `${BASE_URL.replace("/api", "")}${item.photo}`,
                    }}
                    style={styles.vehicleImage}
                  />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Text style={{ color: "gray" }}>No Photo</Text>
                  </View>
                )}

                <View style={{ marginLeft: 15 }}>
                  <Text style={styles.cardTitle}>{item.plate}</Text>
                  <Text style={styles.infoText}>Model: {item.makeModel}</Text>
                  <Text style={styles.infoText}>
                    Owner: {item.userId?.name || "Unknown"}
                  </Text>
                </View>
              </View>

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

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>
              {editingId ? "Edit Vehicle Details" : "Register Vehicle"}
            </Text>

            <ScrollView keyboardShouldPersistTaps="handled">
              {!selectedOwner ? (
                <View style={styles.searchSection}>
                  <Text style={styles.sectionTitle}>1. Select Customer</Text>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search by Name or Phone..."
                    value={customerSearchQuery}
                    onChangeText={setCustomerSearchQuery}
                  />
                  {customerSearchQuery.length > 0 &&
                    filteredCustomers.map((customer) => (
                      <TouchableOpacity
                        key={customer._id}
                        style={styles.searchResultItem}
                        onPress={() => setSelectedOwner(customer)}
                      >
                        <Text style={styles.resultName}>{customer.name}</Text>
                        <Text style={styles.resultPhone}>{customer.phone}</Text>
                      </TouchableOpacity>
                    ))}
                </View>
              ) : (
                <View>
                  <View style={styles.selectedOwnerBox}>
                    <Text style={styles.selectedOwnerText}>
                      Owner: {selectedOwner.name}
                    </Text>
                    <TouchableOpacity onPress={() => setSelectedOwner(null)}>
                      <Text style={styles.changeOwnerText}>Change</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.sectionTitle}>2. Vehicle Details</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="License Plate (e.g. CAA-1234)"
                    autoCapitalize="characters"
                    value={plate}
                    onChangeText={setPlate}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Make & Model (e.g. Honda CR-V)"
                    value={makeModel}
                    onChangeText={setMakeModel}
                  />

                  <>
                    <TouchableOpacity
                      style={styles.uploadBtn}
                      onPress={pickImage}
                    >
                      <Text style={styles.uploadBtnText}>
                        {photoUri
                          ? "📸 Change Photo"
                          : "📸 Upload Vehicle Photo"}
                      </Text>
                    </TouchableOpacity>
                    {photoUri && (
                      <Image
                        source={{ uri: photoUri }}
                        style={styles.previewImage}
                      />
                    )}
                  </>

                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.buttonText}>
                        {editingId ? "Update Vehicle" : "Save Vehicle"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

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
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 20, color: "#333" },
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
    backgroundColor: "#17a2b8",
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
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  infoText: { fontSize: 15, color: "#666", marginBottom: 2 },
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
    maxHeight: "80%",
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
    marginTop: 10,
  },
  cancelBtn: { backgroundColor: "#6c757d" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#555",
    marginBottom: 10,
    marginTop: 5,
  },
  searchSection: { marginBottom: 20 },
  searchInput: {
    borderWidth: 1,
    borderColor: "#007bff",
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: "#f0f8ff",
  },
  searchResultItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  resultName: { fontSize: 16, fontWeight: "bold", color: "#333" },
  resultPhone: { fontSize: 14, color: "#666" },
  selectedOwnerBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#e9ecef",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  selectedOwnerText: { fontSize: 16, fontWeight: "bold", color: "#333" },
  changeOwnerText: { color: "#007bff", fontWeight: "bold", fontSize: 14 },
  uploadBtn: {
    backgroundColor: "#f1f5f9",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    marginBottom: 10,
  },
  uploadBtnText: { color: "#475569", fontWeight: "bold" },
  previewImage: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    marginBottom: 15,
  },
  vehicleImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#eee",
  },
  placeholderImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
  },
});