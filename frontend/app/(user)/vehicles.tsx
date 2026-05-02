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

export default function UserVehiclesScreen() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [plate, setPlate] = useState("");
  const [makeModel, setMakeModel] = useState("");
  const [photoUri, setPhotoUri] = useState(null);

  useEffect(() => {
    fetchMyVehicles();
  }, []);

  const fetchMyVehicles = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const response = await axios.get(`${BASE_URL}/vehicles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVehicles(response.data);
    } catch (error) {
      Alert.alert("Error", "Could not fetch your garage data.");
    } finally {
      setLoading(false);
    }
  };

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
      "Are you sure you want to remove this vehicle from your garage?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("userToken");
              await axios.delete(`${BASE_URL}/vehicles/${id}`, {
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
    setPhotoUri(null);
    setModalVisible(true);
  };

  const openEditModal = (vehicle) => {
    setEditingId(vehicle._id);
    setPlate(vehicle.plate);
    setMakeModel(vehicle.makeModel);

    if (vehicle.photo) {
      setPhotoUri(`${BASE_URL.replace("/api", "")}${vehicle.photo}`);
    } else {
      setPhotoUri(null);
    }

    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!plate.trim() || !makeModel.trim()) {
      return Alert.alert(
        "Validation Error",
        "Please fill in your License Plate and Make/Model.",
      );
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("userToken");

      const formData = new FormData();
      formData.append("plate", plate.toUpperCase());
      formData.append("makeModel", makeModel);

      // Append photo if it's a new local file
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

      // The critical config that tells the server to expect a file
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      };

      if (editingId) {
        // FIXED: Now using formData and config for updates too!
        const response = await axios.put(
          `${BASE_URL}/vehicles/${editingId}`,
          formData,
          config,
        );
        setVehicles(
          vehicles.map((v) => (v._id === editingId ? response.data : v)),
        );
      } else {
        // Multipart POST for new vehicle
        const response = await axios.post(
          `${BASE_URL}/vehicles`,
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
      <Text style={styles.header}>My Garage</Text>

      <TouchableOpacity style={styles.button} onPress={openAddModal}>
        <Text style={styles.buttonText}>+ Add Vehicle to Garage</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#0ea5e9"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(item) => item._id}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              You haven't added any vehicles yet.
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
                    <Text style={{ color: "gray", fontSize: 12 }}>
                      No Photo
                    </Text>
                  </View>
                )}

                <View style={{ marginLeft: 15 }}>
                  <Text style={styles.cardTitle}>{item.plate}</Text>
                  <Text style={styles.infoText}>{item.makeModel}</Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  onPress={() => openEditModal(item)}
                  style={styles.actionBtn}
                >
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleDelete(item._id)}
                  style={styles.actionBtn}
                >
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* --- ADD/EDIT MODAL --- */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>
              {editingId ? "Edit Vehicle" : "Add Vehicle"}
            </Text>

            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>License Plate Number</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. CAA-1234"
                autoCapitalize="characters"
                value={plate}
                onChangeText={setPlate}
              />

              <Text style={styles.label}>Make & Model</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Honda Civic"
                value={makeModel}
                onChangeText={setMakeModel}
              />

              <>
                <Text style={styles.label}>Vehicle Photo</Text>
                <TouchableOpacity
                  style={styles.uploadBtn}
                  onPress={pickImage}
                >
                  <Text style={styles.uploadBtnText}>
                    {photoUri ? "📸 Change Photo" : "📸 Upload Photo"}
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
                  <Text style={styles.submitBtnText}>
                    {editingId ? "Update Vehicle" : "Save to Garage"}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
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
  header: {
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 20,
    color: "#1e293b",
  },
  button: {
    backgroundColor: "#0ea5e9",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
    elevation: 2,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  emptyText: {
    textAlign: "center",
    marginTop: 40,
    color: "gray",
    fontSize: 16,
  },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
  },
  infoText: { fontSize: 16, color: "#64748b" },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 15,
    gap: 15,
  },
  actionBtn: { padding: 5 },
  editText: { color: "#0ea5e9", fontWeight: "bold", fontSize: 16 },
  deleteText: { color: "#ef4444", fontWeight: "bold", fontSize: 16 },
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
    minHeight: "50%",
    maxHeight: "80%",
  },
  modalHeader: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#1e293b",
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#64748b",
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: "#f8fafc",
  },
  submitBtn: {
    backgroundColor: "#10b981",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
    marginTop: 10,
  },
  submitBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  cancelBtn: {
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#f1f5f9",
  },
  cancelBtnText: { color: "#475569", fontWeight: "bold", fontSize: 16 },
  uploadBtn: {
    backgroundColor: "#f0f9ff",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bae6fd",
    alignItems: "center",
    marginBottom: 15,
  },
  uploadBtnText: { color: "#0284c7", fontWeight: "bold" },
  previewImage: {
    width: "100%",
    height: 180,
    borderRadius: 8,
    marginBottom: 15,
  },
  vehicleImage: {
    width: 90,
    height: 90,
    borderRadius: 8,
    backgroundColor: "#eee",
  },
  placeholderImage: {
    width: 90,
    height: 90,
    borderRadius: 8,
    backgroundColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
  },
});