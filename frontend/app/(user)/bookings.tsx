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

// --- TIMEZONE-SAFE LOCAL DATE GENERATOR ---
const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function UserBookingsScreen() {
  const [activeTab, setActiveTab] = useState("new");

  // LIVE DATA STATES
  const [myVehicles, setMyVehicles] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // WIZARD STATES
  const [step, setStep] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [checkedServices, setCheckedServices] = useState([]);
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);
  const [totalTime, setTotalTime] = useState(0);

  // CHATBOT STATES
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    {
      sender: "bot",
      text: "Hi! I'm Service-Bot. Ask me about open slots (e.g. 'Is 2026-04-20 free?')",
    },
  ]);
  const scrollViewRef = useRef(null);

  // Safely grab today's local string (e.g., "2026-04-20")
  const localToday = getLocalDateString();
  const maxDateObj = new Date();
  maxDateObj.setMonth(maxDateObj.getMonth() + 2);

  // --- FETCH DATA ON LOAD ---
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const headers = { Authorization: `Bearer ${token}` };

      const [vRes, bRes] = await Promise.all([
        axios.get(`${BASE_URL}/vehicles`, { headers }),
        axios.get(`${BASE_URL}/bookings/mybookings`, { headers }),
      ]);

      setMyVehicles(vRes.data);
      setMyBookings(bRes.data);
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Error",
        "Could not load your garage data. Make sure your server is running!",
      );
    } finally {
      setLoading(false);
    }
  };

  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [time, modifier] = timeStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (hours === 12) hours = 0;
    if (modifier === "PM") hours += 12;
    return hours * 60 + minutes;
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDate.getDate()).padStart(2, "0");
      setDate(`${year}-${month}-${day}`);
    }
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
  }, [checkedServices]);

  const handleServiceToggle = (name) => {
    if (checkedServices.includes(name))
      setCheckedServices(checkedServices.filter((s) => s !== name));
    else setCheckedServices([...checkedServices, name]);
  };

  // --- SUBMIT TO DATABASE ---
  const handleSubmit = async () => {
    if (!date.trim() || !timeSlot)
      return Alert.alert("Missing Info", "Please select a date and time.");

    const newStart = timeToMinutes(timeSlot);
    const newEnd = newStart + totalTime;

    const dayBookings = myBookings.filter(
      (b) => b.date === date && b._id !== editingId,
    );

    for (let b of dayBookings) {
      const existingStart = timeToMinutes(b.timeSlot);
      const duration = parseInt(b.estimatedTime) || 30;
      const existingEnd = existingStart + duration;

      if (newStart < existingEnd && newEnd > existingStart) {
        return Alert.alert(
          "⏱️ Time Conflict!",
          `That slot overlaps with another appointment at ${b.timeSlot}. Please select a different time.`,
        );
      }
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const headers = { Authorization: `Bearer ${token}` };

      const payload = {
        vehicleId: selectedVehicle._id,
        selectedServices: checkedServices,
        totalPrice,
        estimatedTime: `${totalTime} mins`,
        date,
        timeSlot,
      };

      if (editingId) {
        await axios.put(`${BASE_URL}/bookings/${editingId}`, payload, {
          headers,
        });
        Alert.alert("Success", "Your booking has been updated! 🔄");
      } else {
        await axios.post(`${BASE_URL}/bookings`, payload, { headers });
        Alert.alert("Success", "Your booking has been confirmed! ✅");
      }

      await fetchData();
      resetWizard();
      setActiveTab("upcoming");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not save your booking.");
    } finally {
      setLoading(false);
    }
  };

  const resetWizard = () => {
    setStep(1);
    setEditingId(null);
    setSelectedVehicle(null);
    setCheckedServices([]);
    setDate("");
    setTimeSlot("");
  };

  const handleEditBooking = (booking) => {
    const vehicleObj = myVehicles.find((v) => v._id === booking.vehicleId._id);
    setSelectedVehicle(vehicleObj);
    setCheckedServices(booking.selectedServices);
    setDate(booking.date);
    setTimeSlot(booking.timeSlot);
    setEditingId(booking._id);
    setActiveTab("new");
    setStep(3);
  };

  // --- DELETE FROM DATABASE ---
  const executeDelete = async (id, message) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      await axios.delete(`${BASE_URL}/bookings/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyBookings(myBookings.filter((b) => b._id !== id));
      Alert.alert("Deleted", message);
    } catch (error) {
      Alert.alert("Error", "Could not delete from database.");
    }
  };

  const handleCancelBooking = (id) => {
    Alert.alert(
      "Cancel Booking",
      "Are you sure you want to cancel this appointment?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: () => executeDelete(id, "Booking Cancelled."),
        },
      ],
    );
  };

  const handleDeleteHistory = (id) => {
    Alert.alert(
      "Delete Record",
      "Permanently remove this past service from your history?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => executeDelete(id, "History Record Removed."),
        },
      ],
    );
  };

  const handleChat = () => {
    if (!chatInput.trim()) return;
    const input = chatInput.toUpperCase();
    setChatMessages((prev) => [...prev, { sender: "user", text: chatInput }]);
    setChatInput("");

    setTimeout(() => {
      let response = "I didn't catch that. Try asking: 'Is 2026-04-20 free?'";
      const dateMatch = input.match(/\d{4}-\d{2}-\d{2}/);

      if (
        (input.includes("FREE") || input.includes("AVAILABLE")) &&
        dateMatch
      ) {
        const checkDate = dateMatch[0];
        const daysBookings = myBookings.filter((b) => b.date === checkDate);

        const freeSlots = availableSlots.filter((slot) => {
          const slotMins = timeToMinutes(slot);
          const isOverlapping = daysBookings.some((b) => {
            const bookedStart = timeToMinutes(b.timeSlot);
            const duration = parseInt(b.estimatedTime) || 0;
            const bookedEnd = bookedStart + duration;
            return slotMins >= bookedStart && slotMins < bookedEnd;
          });
          return !isOverlapping;
        });

        if (freeSlots.length === 0)
          response = `❌ All slots are fully booked on ${checkDate}.`;
        else if (freeSlots.length === availableSlots.length)
          response = `✅ Wide open! The entire day is free on ${checkDate}.`;
        else
          response = `✅ Available time frames on ${checkDate}:\n• ${freeSlots.join("\n• ")}`;
      }
      setChatMessages((prev) => [...prev, { sender: "bot", text: response }]);
    }, 600);
  };

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [chatMessages, isChatOpen]);

  // --- STRICT DATE FILTERING ---
  // Upcoming gets anything Today or Future. History gets anything strictly before Today.
  const upcomingBookings = myBookings
    .filter((b) => b.date >= localToday)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const historyBookings = myBookings
    .filter((b) => b.date < localToday)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (loading)
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text>Loading Garage Data...</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Service Appointments</Text>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "new" && styles.activeTab]}
          onPress={() => {
            setActiveTab("new");
            if (!editingId) resetWizard();
          }}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "new" && styles.activeTabText,
            ]}
          >
            {editingId ? "Edit Booking" : "Book Now"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "upcoming" && styles.activeTab]}
          onPress={() => setActiveTab("upcoming")}
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
          onPress={() => setActiveTab("history")}
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
          <Text style={styles.stepIndicator}>Step {step} of 3</Text>

          {step === 1 && (
            <View>
              <Text style={styles.label}>Which car needs service?</Text>
              {myVehicles.length === 0 ? (
                <Text style={{ color: "gray" }}>
                  Please add a vehicle in the "My Cars" tab first!
                </Text>
              ) : (
                myVehicles.map((v) => (
                  <TouchableOpacity
                    key={v._id}
                    style={[
                      styles.card,
                      selectedVehicle?._id === v._id && {
                        borderColor: "#0ea5e9",
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

          {step === 2 && (
            <View>
              <Text style={styles.label}>What do you need done?</Text>
              {serviceOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.name}
                  style={[
                    styles.card,
                    checkedServices.includes(opt.name) && {
                      backgroundColor: "#f0f9ff",
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
              <View style={styles.summaryBox}>
                <Text style={{ fontWeight: "bold" }}>
                  Estimated Cost: {totalPrice} LKR
                </Text>
              </View>
            </View>
          )}

          {step === 3 && (
            <View>
              <Text style={styles.label}>Choose a Date:</Text>
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
                  value={date ? new Date(date) : new Date()}
                  mode="date"
                  display="default"
                  minimumDate={new Date()}
                  maximumDate={maxDateObj}
                  onChange={handleDateChange}
                />
              )}

              <Text style={styles.label}>Choose a Time Slot:</Text>
              <View style={styles.timeGrid}>
                {availableSlots.map((slot) => (
                  <TouchableOpacity
                    key={slot}
                    style={[
                      styles.timeSlotBtn,
                      timeSlot === slot && {
                        backgroundColor: "#0ea5e9",
                        borderColor: "#0ea5e9",
                      },
                    ]}
                    onPress={() => setTimeSlot(slot)}
                  >
                    <Text
                      style={{
                        color: timeSlot === slot ? "white" : "#333",
                        fontWeight: timeSlot === slot ? "bold" : "normal",
                      }}
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
                style={[styles.navBtn, { backgroundColor: "#64748b" }]}
                onPress={() => setStep(step - 1)}
              >
                <Text style={styles.btnText}>Back</Text>
              </TouchableOpacity>
            )}
            {step < 3 ? (
              <TouchableOpacity
                style={styles.navBtn}
                onPress={() => {
                  if (step === 1 && !selectedVehicle)
                    return Alert.alert("Wait", "Please select your vehicle.");
                  if (step === 2 && checkedServices.length === 0)
                    return Alert.alert(
                      "Wait",
                      "Please select at least one service.",
                    );
                  setStep(step + 1);
                }}
              >
                <Text style={styles.btnText}>Next Step</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.navBtn,
                  { backgroundColor: editingId ? "#f59e0b" : "#10b981" },
                ]}
                onPress={handleSubmit}
              >
                <Text style={styles.btnText}>
                  {editingId ? "Update Booking 🔄" : "Confirm Booking ✅"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {editingId && (
            <TouchableOpacity
              style={{ marginTop: 20, alignItems: "center" }}
              onPress={resetWizard}
            >
              <Text
                style={{ color: "#ef4444", fontWeight: "bold", fontSize: 16 }}
              >
                Cancel Editing
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* --- UPCOMING TAB --- */}
      {activeTab === "upcoming" && (
        <FlatList
          data={upcomingBookings}
          keyExtractor={(b) => b._id}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", marginTop: 20, color: "gray" }}>
              You have no upcoming appointments.
            </Text>
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.card,
                { borderLeftWidth: 4, borderLeftColor: "#0ea5e9" },
              ]}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 5,
                }}
              >
                <Text style={styles.cardTitle}>
                  {item.date} | {item.timeSlot}
                </Text>
                <Text style={{ fontWeight: "bold", color: "#0ea5e9" }}>
                  {item.vehicleId?.plate || "Unknown Vehicle"}
                </Text>
              </View>
              <Text style={{ color: "#64748b", marginBottom: 15 }}>
                {item.selectedServices.join(" • ")}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTopWidth: 1,
                  borderTopColor: "#f1f5f9",
                  paddingTop: 10,
                }}
              >
                <Text
                  style={{ fontWeight: "bold", color: "#10b981", fontSize: 16 }}
                >
                  Est. {item.totalPrice} LKR
                </Text>
                <View style={{ flexDirection: "row", gap: 15 }}>
                  <TouchableOpacity onPress={() => handleEditBooking(item)}>
                    <Text
                      style={{
                        color: "#f59e0b",
                        fontWeight: "bold",
                        fontSize: 15,
                      }}
                    >
                      Edit
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleCancelBooking(item._id)}
                  >
                    <Text
                      style={{
                        color: "#ef4444",
                        fontWeight: "bold",
                        fontSize: 15,
                      }}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />
      )}

      {/* --- HISTORY TAB --- */}
      {activeTab === "history" && (
        <FlatList
          data={historyBookings}
          keyExtractor={(b) => b._id}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", marginTop: 20, color: "gray" }}>
              No service history found.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: "#f8fafc" }]}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 5,
                }}
              >
                <Text style={[styles.cardTitle, { color: "#475569" }]}>
                  {item.date}
                </Text>
                <Text style={{ fontWeight: "bold", color: "#475569" }}>
                  {item.vehicleId?.plate || "Unknown Vehicle"}
                </Text>
              </View>
              <Text style={{ color: "#64748b", marginBottom: 10 }}>
                {item.selectedServices.join(" • ")}
              </Text>
              <View
                style={{
                  alignItems: "flex-end",
                  borderTopWidth: 1,
                  borderTopColor: "#e2e8f0",
                  paddingTop: 10,
                }}
              >
                <TouchableOpacity onPress={() => handleDeleteHistory(item._id)}>
                  <Text style={{ color: "#ef4444", fontWeight: "bold" }}>
                    Delete Record
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* CHATBOT */}
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
                placeholder="Ask about '2026-04-20'..."
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
  container: {
    flex: 1,
    paddingTop: 50,
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 20,
  },
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 15, color: "#333" },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 20,
    backgroundColor: "#e2e8f0",
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
  tabText: { fontWeight: "bold", color: "#64748b" },
  activeTabText: { color: "#0ea5e9" },
  wizardContainer: { paddingBottom: 100 },
  stepIndicator: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0ea5e9",
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#475569",
  },
  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardTitle: { fontSize: 18, fontWeight: "bold", color: "#1e293b" },
  infoText: { fontSize: 14, color: "#64748b", marginTop: 4 },
  summaryBox: {
    backgroundColor: "#e0f2fe",
    padding: 15,
    borderRadius: 8,
    marginTop: 5,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  datePickerBtn: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: "center",
  },
  datePickerText: { fontSize: 16, fontWeight: "bold", color: "#333" },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  timeSlotBtn: {
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
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
    backgroundColor: "#0ea5e9",
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
