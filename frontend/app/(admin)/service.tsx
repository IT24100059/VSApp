import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList, // <-- NEW IMPORT
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BASE_URL } from "../config";

export default function ServiceRecordScreen() {
  const [activeTab, setActiveTab] = useState("pending");

  // --- LIVE DATA STATES ---
  const [bookings, setBookings] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- WORKSPACE STATES ---
  const [activeRecord, setActiveRecord] = useState(null);
  const [checkedTasks, setCheckedTasks] = useState([]);
  const [additionalCharges, setAdditionalCharges] = useState("0");

  // Add Part Modal States
  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [partQty, setPartQty] = useState("1");

  const localToday = new Date().toISOString().split("T")[0];

  // --- FETCH DATA ON LOAD ---
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [bRes, iRes, rRes] = await Promise.all([
        axios.get(`${BASE_URL}/admin/bookings`, config),
        axios.get(`${BASE_URL}/admin/inventory`, config),
        axios.get(`${BASE_URL}/admin/service-records`, config),
      ]);

      setBookings(bRes.data);
      setInventory(iRes.data);
      setRecords(rRes.data);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not load service floor data.");
    } finally {
      setLoading(false);
    }
  };

  // --- 1. START SERVICE (CREATE RECORD) ---
  const handleStartService = (booking) => {
    Alert.alert(
      "Start Service",
      `Move ${booking.vehicleId?.plate} into the Active Bay?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("userToken");
              const config = { headers: { Authorization: `Bearer ${token}` } };

              const payload = {
                bookingId: booking._id,
                vehicleId: booking.vehicleId._id,
                userId: booking.userId._id,
                serviceDate: booking.date,
                status: "In Progress",
                servicesPerformed: booking.selectedServices,
                usedParts: [],
                bookingCost: booking.totalPrice,
                partsCost: 0,
                additionalCharges: 0,
                finalTotal: booking.totalPrice,
              };

              // 1. Create the Service Record
              const newRecordRes = await axios.post(
                `${BASE_URL}/admin/service-records`,
                payload,
                config,
              );

              // 2. Delete the Booking
              await axios.delete(
                `${BASE_URL}/admin/bookings/${booking._id}`,
                config,
              );

              setRecords([newRecordRes.data, ...records]);
              setBookings(bookings.filter((b) => b._id !== booking._id));

              Alert.alert("Success", "Vehicle moved to Active Bay! 🛠️");
              setActiveTab("bay");
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "Could not start service.");
            }
          },
        },
      ],
    );
  };

  const handleCancelBooking = (id) => {
    Alert.alert("Cancel Booking", "Permanently remove this booking?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem("userToken");
            await axios.delete(`${BASE_URL}/admin/bookings/${id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            setBookings(bookings.filter((b) => b._id !== id));
          } catch (error) {
            Alert.alert("Error", "Could not cancel booking.");
          }
        },
      },
    ]);
  };

  // --- 2. WORKSPACE: PARTS MANAGEMENT ---
  const handleAddPartToBill = () => {
    if (!selectedPart || !partQty || Number(partQty) < 1)
      return Alert.alert("Error", "Select a part and valid quantity.");
    if (Number(partQty) > selectedPart.quantityInStock)
      return Alert.alert(
        "Stock Error",
        `Only ${selectedPart.quantityInStock} left!`,
      );

    const newPartEntry = {
      partId: selectedPart._id,
      partName: selectedPart.name,
      quantity: Number(partQty),
      unitPrice: selectedPart.price,
      totalPrice: selectedPart.price * Number(partQty),
    };

    const updatedPartsList = [...activeRecord.usedParts, newPartEntry];
    const newPartsCost = updatedPartsList.reduce(
      (sum, p) => sum + p.totalPrice,
      0,
    );
    const newFinalTotal =
      activeRecord.bookingCost + newPartsCost + Number(additionalCharges);

    setActiveRecord({
      ...activeRecord,
      usedParts: updatedPartsList,
      partsCost: newPartsCost,
      finalTotal: newFinalTotal,
    });
    setIsPartModalOpen(false);
    setSelectedPart(null);
    setPartQty("1");
  };

  const handleRemovePart = (indexToRemove) => {
    const updatedPartsList = activeRecord.usedParts.filter(
      (_, idx) => idx !== indexToRemove,
    );
    const newPartsCost = updatedPartsList.reduce(
      (sum, p) => sum + p.totalPrice,
      0,
    );
    const newFinalTotal =
      activeRecord.bookingCost + newPartsCost + Number(additionalCharges);

    setActiveRecord({
      ...activeRecord,
      usedParts: updatedPartsList,
      partsCost: newPartsCost,
      finalTotal: newFinalTotal,
    });
  };

  // --- WORKSPACE: CHARGES & TASKS ---
  const applyAdditionalCharges = () => {
    const charges = Number(additionalCharges) || 0;
    const newFinalTotal =
      activeRecord.bookingCost + activeRecord.partsCost + charges;
    setActiveRecord({
      ...activeRecord,
      additionalCharges: charges,
      finalTotal: newFinalTotal,
    });
    Alert.alert("Updated", "Extra charges applied.");
  };

  const handleTaskToggle = (task) => {
    if (checkedTasks.includes(task))
      setCheckedTasks(checkedTasks.filter((t) => t !== task));
    else setCheckedTasks([...checkedTasks, task]);
  };

  // --- 3. SAVE FOR LATER (UPDATE RECORD) ---
  const handleSaveForLater = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const response = await axios.put(
        `${BASE_URL}/admin/service-records/${activeRecord._id}`,
        activeRecord,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setRecords(
        records.map((r) => (r._id === activeRecord._id ? response.data : r)),
      );
      Alert.alert(
        "Saved",
        "Progress saved. You can resume this service later.",
      );
      setActiveRecord(null);
    } catch (error) {
      Alert.alert("Error", "Could not save progress to database.");
    }
  };

  // --- 4. COMPLETE SERVICE ---
  const handleCompleteService = () => {
    if (checkedTasks.length !== activeRecord.servicesPerformed.length) {
      return Alert.alert(
        "Incomplete",
        "Please check off all required tasks before completing!",
      );
    }

    Alert.alert(
      "Finalize Bill",
      "Complete service and deduct parts from inventory?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("userToken");
              const config = { headers: { Authorization: `Bearer ${token}` } };
              const completedRecord = { ...activeRecord, status: "Completed" };

              // Deduct from Inventory
              const updatedInventory = [...inventory];
              for (let used of completedRecord.usedParts) {
                const itemIndex = updatedInventory.findIndex(
                  (i) => i._id === used.partId,
                );
                if (itemIndex > -1) {
                  const updatedItem = {
                    ...updatedInventory[itemIndex],
                    quantityInStock:
                      updatedInventory[itemIndex].quantityInStock -
                      used.quantity,
                  };
                  await axios.put(
                    `${BASE_URL}/admin/inventory/${used.partId}`,
                    updatedItem,
                    config,
                  );
                  updatedInventory[itemIndex] = updatedItem;
                }
              }
              setInventory(updatedInventory);

              // Mark as completed
              const response = await axios.put(
                `${BASE_URL}/admin/service-records/${activeRecord._id}`,
                completedRecord,
                config,
              );
              setRecords(
                records.map((r) =>
                  r._id === activeRecord._id ? response.data : r,
                ),
              );

              Alert.alert(
                "Success",
                "Service completed and inventory updated! ✅",
              );
              setActiveRecord(null);
              setActiveTab("history");
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "Failed to finalize service.");
            }
          },
        },
      ],
    );
  };

  const handleDeleteRecord = (id) => {
    Alert.alert("Delete Record", "Permanently delete this history record?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem("userToken");
            await axios.delete(`${BASE_URL}/admin/service-records/${id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            setRecords(records.filter((r) => r._id !== id));
          } catch (error) {
            Alert.alert("Error", "Could not delete record.");
          }
        },
      },
    ]);
  };

  // --- FILTERS & SECTIONS ---

  // Grouping bookings into Today vs Future
  const todaysTasks = bookings
    .filter((b) => b.date <= localToday)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const futureTasks = bookings
    .filter((b) => b.date > localToday)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Creating the structure needed for SectionList
  const pendingSections = [];
  if (todaysTasks.length > 0)
    pendingSections.push({ title: "Today's Schedule", data: todaysTasks });
  if (futureTasks.length > 0)
    pendingSections.push({ title: "Upcoming Bookings", data: futureTasks });

  const activeServices = records.filter((r) => r.status === "In Progress");
  const completedServices = records.filter((r) => r.status === "Completed");

  if (loading)
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text>Loading Service Floor...</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Service Floor</Text>

      {/* --- TABS --- */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "pending" && styles.activeTab]}
          onPress={() => {
            setActiveTab("pending");
            setActiveRecord(null);
          }}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "pending" && styles.activeTabText,
            ]}
          >
            Pending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "bay" && styles.activeTab]}
          onPress={() => setActiveTab("bay")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "bay" && styles.activeTabText,
            ]}
          >
            Active Bay ({activeServices.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "history" && styles.activeTab]}
          onPress={() => {
            setActiveTab("history");
            setActiveRecord(null);
          }}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "history" && styles.activeTabText,
            ]}
          >
            History
          </Text>
        </TouchableOpacity>
      </View>

      {/* --- TAB 1: PENDING SCHEDULE (UPDATED WITH SECTION LIST) --- */}
      {activeTab === "pending" && (
        <SectionList
          sections={pendingSections}
          keyExtractor={(b) => b._id}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No pending bookings found.</Text>
          }
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionHeader}>{title}</Text>
          )}
          renderItem={({ item, section }) => {
            const isToday = section.title === "Today's Schedule";
            return (
              <View
                style={[
                  styles.card,
                  {
                    borderLeftWidth: 5,
                    borderLeftColor: isToday ? "#ef4444" : "#f59e0b",
                  },
                ]}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={styles.cardTitle}>{item.vehicleId?.plate}</Text>
                  <Text
                    style={{
                      backgroundColor: isToday ? "#fee2e2" : "#fef3c7",
                      color: isToday ? "#dc2626" : "#d97706",
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 4,
                      fontWeight: "bold",
                      fontSize: 12,
                    }}
                  >
                    {isToday ? "TODAY" : item.date}
                  </Text>
                </View>
                <Text style={styles.infoText}>
                  Time: {item.timeSlot} ({item.estimatedTime})
                </Text>
                <Text style={styles.infoText}>Client: {item.userId?.name}</Text>
                <View style={styles.serviceTagContainer}>
                  <Text style={styles.serviceTag}>
                    {item.selectedServices.join(" • ")}
                  </Text>
                </View>
                <View style={styles.actionRow}>
                  <Text
                    style={{
                      fontWeight: "bold",
                      color: "green",
                      flex: 1,
                      fontSize: 16,
                    }}
                  >
                    {item.totalPrice} LKR
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleCancelBooking(item._id)}
                    style={{ marginRight: 15 }}
                  >
                    <Text style={{ color: "red", fontWeight: "bold" }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleStartService(item)}
                    style={styles.startBtn}
                  >
                    <Text style={{ color: "white", fontWeight: "bold" }}>
                      Start Service
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* --- TAB 2: ACTIVE BAY (Workspace) --- */}
      {activeTab === "bay" && (
        <View style={{ flex: 1 }}>
          {!activeRecord ? (
            <FlatList
              data={activeServices}
              keyExtractor={(r) => r._id}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No vehicles in the bay.</Text>
              }
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.card,
                    { borderLeftWidth: 5, borderLeftColor: "#3b82f6" },
                  ]}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 10,
                    }}
                  >
                    <Text style={styles.cardTitle}>
                      {item.vehicleId?.plate}
                    </Text>
                    <Text
                      style={{
                        backgroundColor: "#eff6ff",
                        color: "#1d4ed8",
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 4,
                        fontWeight: "bold",
                        fontSize: 12,
                      }}
                    >
                      IN PROGRESS
                    </Text>
                  </View>
                  <Text style={styles.infoText}>
                    Client: {item.userId?.name}
                  </Text>
                  <TouchableOpacity
                    style={styles.openBtn}
                    onPress={() => {
                      setActiveRecord(item);
                      setAdditionalCharges(item.additionalCharges.toString());
                    }}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontWeight: "bold",
                        textAlign: "center",
                      }}
                    >
                      Open Workspace 🛠️
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          ) : (
            /* --- LIVE WORKSPACE --- */
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={styles.workspaceHeader}>
                <Text style={styles.workspaceTitle}>
                  🚘 {activeRecord.vehicleId?.plate}
                </Text>
                <TouchableOpacity onPress={handleSaveForLater}>
                  <Text style={{ color: "#0ea5e9", fontWeight: "bold" }}>
                    Close
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionLabel}>Checklist:</Text>
              <View style={styles.checklistContainer}>
                {activeRecord.servicesPerformed.map((task) => (
                  <TouchableOpacity
                    key={task}
                    style={styles.checklistItem}
                    onPress={() => handleTaskToggle(task)}
                  >
                    <Text style={{ fontSize: 18 }}>
                      {checkedTasks.includes(task) ? "✅" : "⬜"}
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        marginLeft: 10,
                        color: checkedTasks.includes(task) ? "#10b981" : "#333",
                      }}
                    >
                      {task}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionLabel}>Spare Parts Used:</Text>
              <View style={styles.partsContainer}>
                {activeRecord.usedParts.map((p, idx) => (
                  <View key={idx} style={styles.partRow}>
                    <Text style={{ flex: 2 }}>
                      {p.partName}{" "}
                      <Text style={{ color: "gray" }}>(x{p.quantity})</Text>
                    </Text>
                    <Text style={{ flex: 1, fontWeight: "bold" }}>
                      {p.totalPrice} LKR
                    </Text>
                    <TouchableOpacity onPress={() => handleRemovePart(idx)}>
                      <Text
                        style={{
                          color: "red",
                          fontWeight: "bold",
                          fontSize: 18,
                        }}
                      >
                        ✕
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.addPartBtn}
                  onPress={() => setIsPartModalOpen(true)}
                >
                  <Text
                    style={{
                      color: "#0ea5e9",
                      fontWeight: "bold",
                      textAlign: "center",
                    }}
                  >
                    + Add Part to Bill
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionLabel}>Live Billing:</Text>
              <View style={styles.billingContainer}>
                <View style={styles.billingRow}>
                  <Text>Base Service Fee:</Text>
                  <Text>{activeRecord.bookingCost} LKR</Text>
                </View>
                <View style={styles.billingRow}>
                  <Text>Parts Total:</Text>
                  <Text>{activeRecord.partsCost} LKR</Text>
                </View>
                <View
                  style={[
                    styles.billingRow,
                    { alignItems: "center", marginTop: 10 },
                  ]}
                >
                  <Text>Extra Charges:</Text>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <TextInput
                      style={styles.smallInput}
                      keyboardType="numeric"
                      value={additionalCharges}
                      onChangeText={setAdditionalCharges}
                    />
                    <TouchableOpacity
                      style={styles.setBtn}
                      onPress={applyAdditionalCharges}
                    >
                      <Text style={{ color: "white" }}>Set</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View
                  style={[
                    styles.billingRow,
                    {
                      borderTopWidth: 1,
                      borderColor: "#ccc",
                      paddingTop: 10,
                      marginTop: 10,
                    },
                  ]}
                >
                  <Text style={{ fontWeight: "bold", fontSize: 18 }}>
                    FINAL TOTAL:
                  </Text>
                  <Text
                    style={{
                      fontWeight: "bold",
                      fontSize: 18,
                      color: "#10b981",
                    }}
                  >
                    {activeRecord.finalTotal} LKR
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    { flex: 1, backgroundColor: "#64748b" },
                  ]}
                  onPress={handleSaveForLater}
                >
                  <Text style={styles.btnText}>💾 Save for Later</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    { flex: 1, backgroundColor: "#10b981" },
                  ]}
                  onPress={handleCompleteService}
                >
                  <Text style={styles.btnText}>✅ Finalize</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      )}

      {/* --- TAB 3: HISTORY --- */}
      {activeTab === "history" && (
        <FlatList
          data={completedServices}
          keyExtractor={(r) => r._id}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No completed records.</Text>
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.card,
                {
                  borderLeftWidth: 5,
                  borderLeftColor: "#10b981",
                  backgroundColor: "#f8fafc",
                },
              ]}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 5,
                }}
              >
                <Text style={[styles.cardTitle, { color: "#475569" }]}>
                  {item.vehicleId?.plate}
                </Text>
                <Text
                  style={{
                    backgroundColor: "#dcfce7",
                    color: "#166534",
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 4,
                    fontWeight: "bold",
                    fontSize: 12,
                  }}
                >
                  COMPLETED
                </Text>
              </View>
              <Text style={styles.infoText}>
                Client: {item.userId?.name} | Date: {item.serviceDate}
              </Text>
              <Text
                style={[styles.infoText, { marginTop: 5, fontStyle: "italic" }]}
              >
                Parts Used:{" "}
                {item.usedParts.length > 0
                  ? item.usedParts.map((p) => p.partName).join(", ")
                  : "None"}
              </Text>
              <View
                style={[
                  styles.actionRow,
                  {
                    borderTopWidth: 1,
                    borderTopColor: "#e2e8f0",
                    paddingTop: 10,
                    marginTop: 10,
                  },
                ]}
              >
                <Text
                  style={{
                    fontWeight: "bold",
                    color: "#10b981",
                    flex: 1,
                    fontSize: 16,
                  }}
                >
                  Paid: {item.finalTotal} LKR
                </Text>
                <TouchableOpacity onPress={() => handleDeleteRecord(item._id)}>
                  <Text style={{ color: "red", fontWeight: "bold" }}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* --- ADD PART MODAL --- */}
      <Modal visible={isPartModalOpen} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Select Part</Text>
            <View
              style={{
                height: 200,
                borderWidth: 1,
                borderColor: "#ccc",
                borderRadius: 8,
                marginBottom: 15,
              }}
            >
              <FlatList
                data={inventory.filter((i) => i.quantityInStock > 0)}
                keyExtractor={(i) => i._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={{
                      padding: 15,
                      borderBottomWidth: 1,
                      borderBottomColor: "#eee",
                      backgroundColor:
                        selectedPart?._id === item._id ? "#e0f2fe" : "#fff",
                    }}
                    onPress={() => setSelectedPart(item)}
                  >
                    <Text style={{ fontWeight: "bold" }}>{item.name}</Text>
                    <Text style={{ color: "gray" }}>
                      {item.quantityInStock} in stock | {item.price} LKR
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
            <Text style={styles.label}>Quantity:</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={partQty}
              onChangeText={setPartQty}
              placeholder="1"
            />
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleAddPartToBill}
            >
              <Text style={styles.btnText}>Add to Bill</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: "#64748b", marginTop: 10 },
              ]}
              onPress={() => {
                setIsPartModalOpen(false);
                setSelectedPart(null);
              }}
            >
              <Text style={styles.btnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
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
  emptyText: {
    textAlign: "center",
    marginTop: 30,
    color: "gray",
    fontSize: 16,
  },
  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  infoText: { fontSize: 14, color: "#666", marginTop: 4 },
  actionRow: { flexDirection: "row", marginTop: 15, alignItems: "center" },
  serviceTagContainer: {
    backgroundColor: "#f1f5f9",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  serviceTag: { color: "#475569", fontWeight: "600" },
  startBtn: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  openBtn: {
    backgroundColor: "#3b82f6",
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
  },

  // NEW STYLE FOR SECTION HEADERS
  sectionHeader: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 10,
    marginBottom: 10,
  },

  workspaceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#e0f2fe",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  workspaceTitle: { fontSize: 18, fontWeight: "bold", color: "#0369a1" },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#555",
    marginBottom: 10,
  },
  checklistContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  partsContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  partRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  addPartBtn: {
    marginTop: 15,
    paddingVertical: 10,
    backgroundColor: "#f0f9ff",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  billingContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  billingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  smallInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    width: 80,
    padding: 5,
    textAlign: "center",
    marginRight: 10,
  },
  setBtn: {
    backgroundColor: "#94a3b8",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  submitBtn: {
    backgroundColor: "#0ea5e9",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  btnText: { color: "white", fontWeight: "bold", fontSize: 16 },
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
  },
  modalHeader: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  label: { fontSize: 16, fontWeight: "bold", marginBottom: 5, color: "#555" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
});
