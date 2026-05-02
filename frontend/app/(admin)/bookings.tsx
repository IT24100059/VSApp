import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BASE_URL } from "../config";

const serviceOptions = [
  { name: "Full Body Wash", price: 3500, time: 30 },
  { name: "Interior Cleaning", price: 4000, time: 45 },
  { name: "Oil Change", price: 6000, time: 20 },
  { name: "Engine Tune-up", price: 12000, time: 60 },
  { name: "Brake Inspection", price: 2500, time: 15 },
];

const availableSlots = [
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "01:00 PM",
  "01:30 PM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
  "03:30 PM",
  "04:00 PM",
  "04:30 PM",
];

export default function BookingsScreen() {
  const [activeTab, setActiveTab] = useState("new");

  // --- LIVE DATA STATES ---
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- WIZARD STATES ---
  const [step, setStep] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [checkedServices, setCheckedServices] = useState([]);

  // Date & Time States
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [totalPrice, setTotalPrice] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [calculatedEndTime, setCalculatedEndTime] = useState("");

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    {
      sender: "bot",
      text: "Hi! Ask about availability (e.g. 'Is 2026-03-25 free?') or check a vehicle.",
    },
  ]);
  const scrollViewRef = useRef(null);

  const todayDateObj = new Date();
  const localToday = todayDateObj.toISOString().split("T")[0];
  const maxDateObj = new Date();
  maxDateObj.setMonth(maxDateObj.getMonth() + 2);

  // --- FETCH ALL DATA ON LOAD ---
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [uRes, vRes, bRes] = await Promise.all([
        axios.get(`${BASE_URL}/admin/users`, config),
        axios.get(`${BASE_URL}/admin/vehicles`, config),
        axios.get(`${BASE_URL}/admin/bookings`, config),
      ]);

      setCustomers(uRes.data);
      setVehicles(vRes.data);
      setBookings(bRes.data);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not fetch data from database.");
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) setDate(selectedDate.toISOString().split("T")[0]);
  };

  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [time, modifier] = timeStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (hours === 12) hours = 0;
    if (modifier === "PM") hours += 12;
    return hours * 60 + minutes;
  };

  const minutesToTime = (totalMinutes) => {
    let hours = Math.floor(totalMinutes / 60);
    let minutes = totalMinutes % 60;
    const modifier = hours >= 12 ? "PM" : "AM";
    if (hours > 12) hours -= 12;
    if (hours === 0) hours = 12;
    return `${hours}:${minutes < 10 ? "0" + minutes : minutes} ${modifier}`;
  };

  useEffect(() => {
    let price = 0,
      time = 0;
    checkedServices.forEach((name) => {
      const srv = serviceOptions.find((s) => s.name === name);
      if (srv) {
        price += srv.price;
        time += srv.time;
      }
    });
    setTotalPrice(price);
    setTotalTime(time);
    if (timeSlot && time > 0)
      setCalculatedEndTime(minutesToTime(timeToMinutes(timeSlot) + time));
    else setCalculatedEndTime("");
  }, [checkedServices, timeSlot]);

  // Filters vehicles to only show cars belonging to the selected customer
  const customerVehicles = selectedCustomer
    ? vehicles.filter((v) => v.userId?._id === selectedCustomer._id)
    : [];

  const handleServiceToggle = (name) => {
    if (checkedServices.includes(name))
      setCheckedServices(checkedServices.filter((s) => s !== name));
    else setCheckedServices([...checkedServices, name]);
  };

  // --- SUBMIT TO MONGODB ---
  const handleSubmit = async () => {
    if (!date.trim() || !timeSlot)
      return Alert.alert("Missing Info", "Please select a date and time.");

    const newStart = timeToMinutes(timeSlot);
    const newEnd = newStart + totalTime;
    const dayBookings = bookings.filter(
      (b) => b.date === date && b._id !== editingId,
    );

    for (let b of dayBookings) {
      const existingStart = timeToMinutes(b.timeSlot);
      const existingEnd = existingStart + (parseInt(b.estimatedTime) || 0);
      if (newStart < existingEnd && newEnd > existingStart) {
        return Alert.alert(
          "⏱️ Time Conflict!",
          `Slot busy from ${b.timeSlot} until ${minutesToTime(existingEnd)}.`,
        );
      }
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const payload = {
        userId: selectedCustomer._id,
        vehicleId: selectedVehicle._id,
        selectedServices: checkedServices,
        totalPrice,
        estimatedTime: `${totalTime} mins`,
        date,
        timeSlot,
      };

      if (editingId) {
        const response = await axios.put(
          `${BASE_URL}/admin/bookings/${editingId}`,
          payload,
          config,
        );
        setBookings(
          bookings.map((b) => (b._id === editingId ? response.data : b)),
        );
        Alert.alert("Success", "Booking Updated!");
      } else {
        const response = await axios.post(
          `${BASE_URL}/admin/bookings`,
          payload,
          config,
        );
        setBookings([...bookings, response.data]);
        Alert.alert("Success", "Booking Confirmed!");
      }

      resetForm();
      setActiveTab("upcoming");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not save booking.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSearchQuery("");
    setSelectedCustomer(null);
    setSelectedVehicle(null);
    setCheckedServices([]);
    setDate("");
    setTimeSlot("");
    setEditingId(null);
  };

  const handleEditClick = (b) => {
    // Rehydrate the wizard with populated object data from the backend
    setSelectedCustomer(b.userId);
    setSelectedVehicle(b.vehicleId);
    setCheckedServices(b.selectedServices);
    setDate(b.date);
    setTimeSlot(b.timeSlot);
    setEditingId(b._id);
    setActiveTab("new");
    setStep(4);
  };

  const deleteBooking = (id) => {
    Alert.alert("Delete Booking", "Permanently delete this record?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem("userToken");
            await axios.delete(`${BASE_URL}/admin/bookings/${id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            setBookings(bookings.filter((b) => b._id !== id));
          } catch (error) {
            Alert.alert("Error", "Could not delete booking.");
          }
        },
      },
    ]);
  };

  const upcomingBookings = bookings
    .filter((b) => b.date >= localToday)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const historyBookings = bookings
    .filter((b) => b.date < localToday)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  // --- CHATBOT LOGIC ---
  const handleChat = () => {
    if (!chatInput.trim()) return;
    const input = chatInput.toUpperCase();
    setChatMessages((prev) => [...prev, { sender: "user", text: chatInput }]);
    setChatInput("");

    setTimeout(() => {
      let response =
        "Try asking:\n- 'Is 2026-03-25 free?'\n- 'Revenue for 2026-03-25'";
      const dateMatch = input.match(/\d{4}-\d{2}-\d{2}/);

      if (
        (input.includes("REVENUE") || input.includes("INCOME")) &&
        dateMatch
      ) {
        const checkDate = dateMatch[0];
        const daysBookings = bookings.filter((b) => b.date === checkDate);
        if (daysBookings.length === 0)
          response = `📉 No revenue recorded for ${checkDate}.`;
        else
          response = `💰 Revenue for ${checkDate}:\nTotal: ${daysBookings.reduce((sum, b) => sum + Number(b.totalPrice), 0)} LKR`;
      } else if (input.includes("FREE") && dateMatch) {
        const checkDate = dateMatch[0];
        const daysBookings = bookings.filter((b) => b.date === checkDate);
        const freeSlots = availableSlots.filter((slot) => {
          const slotMins = timeToMinutes(slot);
          return !daysBookings.some((b) => {
            const bStart = timeToMinutes(b.timeSlot);
            return (
              slotMins >= bStart &&
              slotMins < bStart + parseInt(b.estimatedTime)
            );
          });
        });
        if (freeSlots.length === 0) response = `❌ All slots full.`;
        else response = `✅ Available slots:\n• ${freeSlots.join("\n• ")}`;
      }
      setChatMessages((prev) => [...prev, { sender: "bot", text: response }]);
    }, 600);
  };

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [chatMessages, isChatOpen]);

  if (loading)
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#007bff" />
        <Text>Loading system data...</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Service Bookings</Text>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "new" && styles.activeTab]}
          onPress={() => setActiveTab("new")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "new" && styles.activeTabText,
            ]}
          >
            {editingId ? "Edit" : "Booking"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "upcoming" && styles.activeTab]}
          onPress={() => {
            setActiveTab("upcoming");
            setEditingId(null);
          }}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "upcoming" && styles.activeTabText,
            ]}
          >
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "history" && styles.activeTab]}
          onPress={() => {
            setActiveTab("history");
            setEditingId(null);
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

      {/* --- WIZARD --- */}
      {activeTab === "new" && (
        <ScrollView contentContainerStyle={styles.wizardContainer}>
          <Text style={styles.stepIndicator}>Step {step} of 4</Text>

          {step === 1 && (
            <View>
              <Text style={styles.label}>Search Client (Phone/NIC):</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 077..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length >= 3 &&
                !selectedCustomer &&
                customers
                  .filter(
                    (c) =>
                      (c.nic || "").includes(searchQuery) ||
                      (c.phone || "").includes(searchQuery),
                  )
                  .map((c) => (
                    <TouchableOpacity
                      key={c._id}
                      style={styles.card}
                      onPress={() => setSelectedCustomer(c)}
                    >
                      <Text style={styles.cardTitle}>{c.name}</Text>
                      <Text style={styles.infoText}>{c.phone}</Text>
                    </TouchableOpacity>
                  ))}
              {selectedCustomer && (
                <View
                  style={[
                    styles.card,
                    { borderColor: "#007bff", borderWidth: 2 },
                  ]}
                >
                  <Text style={styles.cardTitle}>
                    Selected: {selectedCustomer.name}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedCustomer(null)}>
                    <Text
                      style={{ color: "red", marginTop: 5, fontWeight: "bold" }}
                    >
                      Change Client
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {step === 2 && (
            <View>
              <Text style={styles.label}>Select Vehicle:</Text>
              {customerVehicles.length === 0 ? (
                <Text style={{ color: "gray" }}>
                  This customer has no vehicles registered.
                </Text>
              ) : (
                customerVehicles.map((v) => (
                  <TouchableOpacity
                    key={v._id}
                    style={[
                      styles.card,
                      selectedVehicle?._id === v._id && {
                        borderColor: "#007bff",
                        borderWidth: 2,
                      },
                    ]}
                    onPress={() => setSelectedVehicle(v)}
                  >
                    <Text style={styles.cardTitle}>{v.plate}</Text>
                    <Text style={styles.infoText}>{v.makeModel}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {step === 3 && (
            <View>
              <Text style={styles.label}>Select Services:</Text>
              {serviceOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.name}
                  style={[
                    styles.card,
                    checkedServices.includes(opt.name) && {
                      backgroundColor: "#e0f2fe",
                    },
                  ]}
                  onPress={() => handleServiceToggle(opt.name)}
                >
                  <Text style={styles.cardTitle}>
                    {checkedServices.includes(opt.name) ? "✅" : "⬜"}{" "}
                    {opt.name}
                  </Text>
                  <Text style={styles.infoText}>
                    {opt.time}m | {opt.price} LKR
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {step === 4 && (
            <View>
              <Text style={styles.label}>Select Date:</Text>
              <TouchableOpacity
                style={styles.datePickerBtn}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.datePickerText}>
                  {date ? date : "📅 Tap to choose date"}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={date ? new Date(date) : todayDateObj}
                  mode="date"
                  display="default"
                  minimumDate={todayDateObj}
                  maximumDate={maxDateObj}
                  onChange={handleDateChange}
                />
              )}

              <Text style={styles.label}>Select Time Slot:</Text>
              <View style={styles.timeGrid}>
                {availableSlots.map((slot) => (
                  <TouchableOpacity
                    key={slot}
                    style={[
                      styles.timeSlotBtn,
                      timeSlot === slot && { backgroundColor: "#007bff" },
                    ]}
                    onPress={() => setTimeSlot(slot)}
                  >
                    <Text
                      style={{ color: timeSlot === slot ? "white" : "black" }}
                    >
                      {slot}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.navButtons}>
            {step > 1 && (
              <TouchableOpacity
                style={[styles.navBtn, { backgroundColor: "#6c757d" }]}
                onPress={() => setStep(step - 1)}
              >
                <Text style={styles.btnText}>Back</Text>
              </TouchableOpacity>
            )}
            {step < 4 ? (
              <TouchableOpacity
                style={styles.navBtn}
                onPress={() => {
                  if (step === 1 && !selectedCustomer)
                    return Alert.alert("Wait", "Select client.");
                  if (step === 2 && !selectedVehicle)
                    return Alert.alert("Wait", "Select vehicle.");
                  if (step === 3 && checkedServices.length === 0)
                    return Alert.alert("Wait", "Select a service.");
                  setStep(step + 1);
                }}
              >
                <Text style={styles.btnText}>Next</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.navBtn,
                  { backgroundColor: editingId ? "#f59e0b" : "#28a745" },
                ]}
                onPress={handleSubmit}
              >
                <Text style={styles.btnText}>
                  {editingId ? "Update Booking" : "Confirm Booking"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      )}

      {/* --- UPCOMING --- */}
      {activeTab === "upcoming" && (
        <FlatList
          data={upcomingBookings}
          keyExtractor={(b) => b._id}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", marginTop: 20 }}>
              No upcoming bookings.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {item.date} | {item.timeSlot}
              </Text>
              <Text style={{ color: "#0369a1", fontWeight: "bold" }}>
                {item.vehicleId?.plate}
              </Text>
              <Text>
                {item.userId?.name} ({item.userId?.phone})
              </Text>
              <Text style={{ color: "gray", marginTop: 5 }}>
                {item.selectedServices.join(", ")}
              </Text>
              <View style={styles.actionRow}>
                <Text style={{ fontWeight: "bold", color: "green", flex: 1 }}>
                  {item.totalPrice} LKR
                </Text>
                <TouchableOpacity
                  onPress={() => handleEditClick(item)}
                  style={{ marginRight: 15 }}
                >
                  <Text style={{ color: "#f59e0b", fontWeight: "bold" }}>
                    Edit
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteBooking(item._id)}>
                  <Text style={{ color: "red", fontWeight: "bold" }}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* --- HISTORY --- */}
      {activeTab === "history" && (
        <FlatList
          data={historyBookings}
          keyExtractor={(b) => b._id}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", marginTop: 20 }}>
              No history found.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: "#f1f5f9" }]}>
              <Text style={[styles.cardTitle, { color: "#64748b" }]}>
                {item.date} | {item.timeSlot}
              </Text>
              <Text style={{ color: "#64748b", fontWeight: "bold" }}>
                {item.vehicleId?.plate}
              </Text>
              <Text style={{ color: "#64748b" }}>{item.userId?.name}</Text>
              <View style={styles.actionRow}>
                <Text style={{ fontWeight: "bold", color: "#64748b", flex: 1 }}>
                  {item.totalPrice} LKR
                </Text>
                <TouchableOpacity onPress={() => deleteBooking(item._id)}>
                  <Text style={{ color: "red", fontWeight: "bold" }}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Chatbot components */}
      <TouchableOpacity style={styles.fab} onPress={() => setIsChatOpen(true)}>
        <Text style={{ fontSize: 24 }}>💬</Text>
      </TouchableOpacity>
      <Modal visible={isChatOpen} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.chatContainer}>
            <View style={styles.chatHeader}>
              <Text
                style={{ color: "white", fontWeight: "bold", fontSize: 18 }}
              >
                🤖 Service-Bot
              </Text>
              <TouchableOpacity onPress={() => setIsChatOpen(false)}>
                <Text style={{ color: "white", fontSize: 20 }}>X</Text>
              </TouchableOpacity>
            </View>
            <ScrollView ref={scrollViewRef} style={styles.chatArea}>
              {chatMessages.map((msg, i) => (
                <View
                  key={i}
                  style={[
                    styles.chatBubble,
                    msg.sender === "bot" ? styles.botBubble : styles.userBubble,
                  ]}
                >
                  <Text
                    style={{ color: msg.sender === "bot" ? "black" : "white" }}
                  >
                    {msg.text}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatInput}
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Ask..."
              />
              <TouchableOpacity style={styles.sendBtn} onPress={handleChat}>
                <Text style={{ color: "white" }}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, backgroundColor: "#f8f9fa" },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginHorizontal: 20,
    marginBottom: 15,
    color: "#333",
  },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
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
  activeTabText: { color: "#007bff" },
  wizardContainer: { paddingHorizontal: 20, paddingBottom: 100 },
  stepIndicator: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007bff",
    marginBottom: 15,
  },
  label: { fontSize: 16, fontWeight: "bold", marginBottom: 10, color: "#555" },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  datePickerBtn: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: "center",
  },
  datePickerText: { fontSize: 16, fontWeight: "bold", color: "#333" },
  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  infoText: { fontSize: 14, color: "#666", marginTop: 4 },
  actionRow: { flexDirection: "row", marginTop: 15, alignItems: "center" },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  timeSlotBtn: {
    padding: 10,
    backgroundColor: "#e9ecef",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    width: "30%",
    alignItems: "center",
  },
  navButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 20,
  },
  navBtn: {
    flex: 1,
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  btnText: { color: "white", fontWeight: "bold", fontSize: 16 },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    backgroundColor: "#0ea5e9",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  chatContainer: {
    backgroundColor: "#fff",
    height: "60%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  chatHeader: {
    backgroundColor: "#0ea5e9",
    padding: 15,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  chatArea: { flex: 1, padding: 15, backgroundColor: "#f1f5f9" },
  chatBubble: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    maxWidth: "80%",
  },
  botBubble: { backgroundColor: "#e2e8f0", alignSelf: "flex-start" },
  userBubble: { backgroundColor: "#0ea5e9", alignSelf: "flex-end" },
  chatInputRow: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#e2e8f0",
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  sendBtn: {
    backgroundColor: "#0ea5e9",
    paddingHorizontal: 20,
    justifyContent: "center",
    borderRadius: 20,
  },
});
