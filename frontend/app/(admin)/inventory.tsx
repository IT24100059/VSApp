import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BASE_URL } from "../config"; // Ensure the path is correct

const categories = [
  "Lubricants & Fluids",
  "Filters",
  "Cleaning & Detailing",
  "Engine & Ignition",
  "Brakes & Suspension",
  "Electrical",
  "General Consumables",
];

export default function InventoryScreen() {
  const [activeTab, setActiveTab] = useState("list");

  // --- LIVE DATA STATES ---
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Lubricants & Fluids");
  const [price, setPrice] = useState("");
  const [quantityInStock, setQuantityInStock] = useState("");
  const [reorderLevel, setReorderLevel] = useState("5");

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  // Calculator States
  const [calcSelectedItem, setCalcSelectedItem] = useState(null);
  const [calcQty, setCalcQty] = useState("1");

  // --- FETCH INVENTORY ON LOAD ---
  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const response = await axios.get(`${BASE_URL}/admin/inventory`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInventory(response.data);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not load inventory from database.");
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIC ---
  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.itemId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory
      ? item.category === filterCategory
      : true;
    return matchesSearch && matchesCategory;
  });

  const totalInventoryValue = filteredInventory.reduce(
    (sum, item) => sum + item.price * item.quantityInStock,
    0,
  );

  const handleSubmit = async () => {
    if (!name || !price || !quantityInStock) {
      Alert.alert(
        "Validation",
        "Please fill out the name, price, and quantity.",
      );
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const payload = {
        itemId: editingId
          ? inventory.find((i) => i._id === editingId).itemId
          : `ITM-${Math.floor(Math.random() * 9000) + 1000}`, // Auto-generate ID for new items
        name,
        category,
        price: Number(price),
        quantityInStock: Number(quantityInStock),
        reorderLevel: Number(reorderLevel),
      };

      if (editingId) {
        // UPDATE
        const response = await axios.put(
          `${BASE_URL}/admin/inventory/${editingId}`,
          payload,
          config,
        );
        setInventory(
          inventory.map((i) => (i._id === editingId ? response.data : i)),
        );
        Alert.alert("Success", "Item Updated!");
      } else {
        // CREATE
        const response = await axios.post(
          `${BASE_URL}/admin/inventory`,
          payload,
          config,
        );
        setInventory([response.data, ...inventory]); // Add to top of list
        Alert.alert("Success", "New Item Added!");
      }

      resetForm();
      setActiveTab("list");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to save inventory item.");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setCategory("Lubricants & Fluids");
    setPrice("");
    setQuantityInStock("");
    setReorderLevel("5");
  };

  const handleEditClick = (item) => {
    setEditingId(item._id);
    setName(item.name);
    setCategory(item.category);
    setPrice(item.price.toString());
    setQuantityInStock(item.quantityInStock.toString());
    setReorderLevel(item.reorderLevel.toString());
    setActiveTab("add");
  };

  const handleDelete = (id) => {
    Alert.alert("Delete Item", "Permanently delete this item from stock?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem("userToken");
            await axios.delete(`${BASE_URL}/admin/inventory/${id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            setInventory(inventory.filter((i) => i._id !== id));
          } catch (error) {
            Alert.alert("Error", "Could not delete item.");
          }
        },
      },
    ]);
  };

  const getStatusStyle = (qty, reorder) => {
    if (qty === 0)
      return { label: "OUT OF STOCK", color: "red", bg: "#fee2e2" };
    if (qty <= reorder)
      return { label: "LOW STOCK", color: "#d97706", bg: "#fef3c7" };
    return { label: "IN STOCK", color: "green", bg: "#dcfce7" };
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
        <Text style={{ marginTop: 10 }}>Loading Inventory...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <Text style={styles.header}>Inventory</Text>

      {/* --- TABS --- */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "list" && styles.activeTab]}
          onPress={() => {
            setActiveTab("list");
            resetForm();
          }}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "list" && styles.activeTabText,
            ]}
          >
            Stock List
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "add" && styles.activeTab]}
          onPress={() => setActiveTab("add")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "add" && styles.activeTabText,
            ]}
          >
            {editingId ? "Edit Item" : "Add Item"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "calc" && styles.activeTab]}
          onPress={() => setActiveTab("calc")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "calc" && styles.activeTabText,
            ]}
          >
            Calculator
          </Text>
        </TouchableOpacity>
      </View>

      {/* --- TAB 1: INVENTORY LIST --- */}
      {activeTab === "list" && (
        <View style={{ flex: 1 }}>
          <View style={styles.summaryBox}>
            <Text style={{ color: "#065f46", fontWeight: "bold" }}>
              Current Asset Value (Filtered)
            </Text>
            <Text
              style={{ fontSize: 22, fontWeight: "bold", color: "#059669" }}
            >
              {totalInventoryValue.toLocaleString()} LKR
            </Text>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Search Name or ITM-Code..."
            value={searchTerm}
            onChangeText={setSearchTerm}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
          >
            <TouchableOpacity
              style={[styles.chip, filterCategory === "" && styles.chipActive]}
              onPress={() => setFilterCategory("")}
            >
              <Text style={{ color: filterCategory === "" ? "white" : "#333" }}>
                All
              </Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.chip,
                  filterCategory === cat && styles.chipActive,
                ]}
                onPress={() => setFilterCategory(cat)}
              >
                <Text
                  style={{ color: filterCategory === cat ? "white" : "#333" }}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <FlatList
            data={filteredInventory}
            keyExtractor={(item) => item._id}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={
              <Text
                style={{ textAlign: "center", color: "gray", marginTop: 20 }}
              >
                No items found.
              </Text>
            }
            renderItem={({ item }) => {
              const status = getStatusStyle(
                item.quantityInStock,
                item.reorderLevel,
              );
              return (
                <View style={styles.card}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 5,
                    }}
                  >
                    <Text
                      style={{
                        backgroundColor: "#f1f5f9",
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 4,
                        fontWeight: "bold",
                        color: "#475569",
                      }}
                    >
                      {item.itemId}
                    </Text>
                    <Text
                      style={{
                        backgroundColor: status.bg,
                        color: status.color,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 4,
                        fontWeight: "bold",
                        fontSize: 12,
                      }}
                    >
                      {status.label}
                    </Text>
                  </View>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.infoText}>{item.category}</Text>

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginTop: 10,
                      alignItems: "center",
                    }}
                  >
                    <View>
                      <Text style={{ fontWeight: "bold", fontSize: 16 }}>
                        {item.price.toLocaleString()} LKR
                      </Text>
                      <Text style={{ color: "#64748b", fontSize: 12 }}>
                        In Stock:{" "}
                        <Text style={{ fontWeight: "bold", color: "black" }}>
                          {item.quantityInStock}
                        </Text>{" "}
                        (Alert at {item.reorderLevel})
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <TouchableOpacity onPress={() => handleEditClick(item)}>
                        <Text style={{ color: "#f59e0b", fontWeight: "bold" }}>
                          Edit
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(item._id)}>
                        <Text style={{ color: "red", fontWeight: "bold" }}>
                          Del
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            }}
          />
        </View>
      )}

      {/* --- TAB 2: ADD / EDIT FORM --- */}
      {activeTab === "add" && (
        <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
          <Text style={styles.label}>Item Name:</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Mobil 1 Synthetic Oil"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Category:</Text>
          <View style={styles.chipGrid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, category === cat && styles.chipActive]}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={{
                    color: category === cat ? "white" : "#333",
                    fontSize: 12,
                  }}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Selling Price (LKR):</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            keyboardType="numeric"
            value={price}
            onChangeText={setPrice}
          />

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Qty in Stock:</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                keyboardType="numeric"
                value={quantityInStock}
                onChangeText={setQuantityInStock}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Reorder Level:</Text>
              <TextInput
                style={[styles.input, { borderColor: "orange" }]}
                placeholder="5"
                keyboardType="numeric"
                value={reorderLevel}
                onChangeText={setReorderLevel}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: editingId ? "#f59e0b" : "#0ea5e9" },
            ]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text
                style={{ color: "white", fontWeight: "bold", fontSize: 16 }}
              >
                {editingId ? "Update Item" : "Save to Inventory"}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* --- TAB 3: CALCULATOR --- */}
      {activeTab === "calc" && (
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>1. Tap an item to select:</Text>
          <View
            style={{
              height: 200,
              borderWidth: 1,
              borderColor: "#ccc",
              borderRadius: 8,
              marginBottom: 20,
              backgroundColor: "#fff",
            }}
          >
            <FlatList
              data={inventory}
              keyExtractor={(i) => i._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{
                    padding: 15,
                    borderBottomWidth: 1,
                    borderBottomColor: "#eee",
                    backgroundColor:
                      calcSelectedItem?._id === item._id ? "#e0f2fe" : "#fff",
                  }}
                  onPress={() => setCalcSelectedItem(item)}
                >
                  <Text style={{ fontWeight: "bold" }}>{item.name}</Text>
                  <Text style={{ color: "gray" }}>
                    {item.price.toLocaleString()} LKR
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>

          <Text style={styles.label}>2. Quantity Multiplier:</Text>
          <TextInput
            style={styles.input}
            value={calcQty}
            onChangeText={setCalcQty}
            keyboardType="numeric"
            placeholder="1"
          />

          <View style={styles.summaryBox}>
            <Text style={{ color: "#065f46", fontWeight: "bold" }}>
              Estimated Value:
            </Text>
            <Text style={{ fontSize: 28, fontWeight: "900", color: "#0ea5e9" }}>
              {calcSelectedItem
                ? (
                    calcSelectedItem.price * (Number(calcQty) || 0)
                  ).toLocaleString()
                : "0"}{" "}
              LKR
            </Text>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 20,
  },
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 15, color: "#333" },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 15,
    backgroundColor: "#e9ecef",
    borderRadius: 8,
    padding: 5,
  },
  tabBtn: { flex: 1, padding: 10, alignItems: "center", borderRadius: 6 },
  activeTab: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: { fontWeight: "bold", color: "#6c757d" },
  activeTabText: { color: "#0ea5e9" },
  summaryBox: {
    backgroundColor: "#ecfdf5",
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#a7f3d0",
    marginBottom: 15,
    alignItems: "center",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#555",
    marginTop: 10,
  },
  chipScroll: { maxHeight: 50, marginBottom: 15 },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 15,
  },
  chip: {
    backgroundColor: "#e2e8f0",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    alignSelf: "flex-start",
  },
  chipActive: { backgroundColor: "#0ea5e9" },
  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  infoText: { fontSize: 14, color: "#666", marginTop: 2 },
  submitBtn: {
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
});
