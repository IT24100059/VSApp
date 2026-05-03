import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useRouter } from "expo-router"; // 1. Imported Expo Router
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BASE_URL } from "../config";

export default function DashboardScreen() {
  const router = useRouter(); // 2. Initialized router

  const [timeFilter, setTimeFilter] = useState("month"); // 'all', 'week', 'month'

  // --- LIVE DATA STATES ---
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  const todayStr = new Date().toISOString().split("T")[0];

  // --- FETCH ALL DATA ON LOAD ---
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [uRes, vRes, iRes, bRes, billRes] = await Promise.all([
        axios.get(`${BASE_URL}/admin/users`, config),
        axios.get(`${BASE_URL}/admin/vehicles`, config),
        axios.get(`${BASE_URL}/admin/inventory`, config),
        axios.get(`${BASE_URL}/admin/bookings`, config),
        axios.get(`${BASE_URL}/admin/bills`, config),
      ]);

      setCustomers(uRes.data);
      setVehicles(vRes.data);
      setInventory(iRes.data);
      setBookings(bRes.data);
      setBills(billRes.data);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  // --- TIME FILTER LOGIC FOR BILLS ---
  const getFilteredBills = () => {
    if (timeFilter === "all") return bills;

    const now = new Date();
    const filterDate = new Date();

    if (timeFilter === "week") filterDate.setDate(now.getDate() - 7);
    if (timeFilter === "month") filterDate.setMonth(now.getMonth() - 1);

    return bills.filter((b) => new Date(b.createdAt) >= filterDate);
  };

  const activeBills = getFilteredBills();

  // --- KPI CALCULATIONS ---
  const vehicleCategories = vehicles.reduce((acc: any, v: any) => {
    const make = v.makeModel ? v.makeModel.split(" ")[0] : "Unknown"; 
    acc[make] = (acc[make] || 0) + 1;
    return acc;
  }, {});

  const lowStockItems = inventory.filter(
    (item: any) => item.quantityInStock <= item.reorderLevel,
  );
  const todaysServices = bookings.filter((b: any) => b.date === todayStr);

  // --- FINANCIAL CALCULATIONS ---
  const finalBills = activeBills.filter((b: any) => b.status === "Finalized");
  const totalServiceRevenue = finalBills.reduce(
    (sum, b) => sum + b.serviceTotal,
    0,
  );
  const totalAdditionalRevenue = finalBills.reduce(
    (sum, b) => sum + b.additionalBillingCharges,
    0,
  );
  const totalCombinedRevenue = finalBills.reduce(
    (sum, b) => sum + b.grandTotal,
    0,
  );

  // --- TOP SPENDERS ---
  const customerSpending = finalBills.reduce((acc: any, b: any) => {
    const key = `${b.customerName}-${b.vehicleNumber}`;
    if (!acc[key]) {
      acc[key] = {
        customer: b.customerName,
        vehicle: b.vehicleNumber,
        totalSpent: 0,
        visitCount: 0,
      };
    }
    acc[key].totalSpent += b.grandTotal;
    acc[key].visitCount += 1;
    return acc;
  }, {});

  const spendingArray = Object.values(customerSpending)
    .sort((a: any, b: any) => b.totalSpent - a.totalSpent)
    .slice(0, 5); // Show top 5

  // 3. Admin Logout Function
  const handleAdminLogout = async () => {
    Alert.alert(
      "Admin Logout",
      "Are you sure you want to securely log out of the Admin Dashboard?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Logout",
          style: "destructive",
          onPress: async () => {
            try {
              // Clear both the token and the role for maximum security
              await AsyncStorage.removeItem("userToken");
              await AsyncStorage.removeItem("userRole"); 
              
              router.replace("/"); // Route back to the main login index
            } catch (error) {
              console.error("Admin logout error: ", error);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={{ marginTop: 10, color: "gray" }}>
          Crunching numbers...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* 4. Updated Header with Inline Logout Button */}
      <View style={styles.headerRow}>
        <Text style={styles.header}>📊 Executive Dashboard</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleAdminLogout}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* --- ROW 1: ALERTS & KPIS --- */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>👥 Client Base</Text>
        <Text style={styles.kpiBigNumber}>{customers.length} Registered</Text>
        <Text style={{ marginTop: 10, fontWeight: "bold", color: "#64748b" }}>
          Vehicles by Make:
        </Text>
        <View style={styles.chipContainer}>
          {Object.entries(vehicleCategories).map(([make, count]: any) => (
            <Text key={make} style={styles.chip}>
              {make}: {count}
            </Text>
          ))}
        </View>
      </View>

      <View style={[styles.card, lowStockItems.length > 0 && styles.redAlert]}>
        <Text
          style={[
            styles.cardHeader,
            lowStockItems.length > 0 && { color: "#991b1b" },
          ]}
        >
          ⚠️ Low Stock Alerts
        </Text>
        {lowStockItems.length === 0 ? (
          <Text style={{ color: "#166534", fontWeight: "bold" }}>
            ✅ All inventory levels good!
          </Text>
        ) : (
          lowStockItems.map((item: any) => (
            <View key={item._id} style={styles.alertRow}>
              <Text style={{ fontWeight: "bold", flex: 1 }}>{item.name}</Text>
              <Text style={{ color: "#dc2626", fontWeight: "bold" }}>
                {item.quantityInStock} left
              </Text>
            </View>
          ))
        )}
      </View>

      <View
        style={[styles.card, todaysServices.length > 0 && styles.blueAlert]}
      >
        <Text style={[styles.cardHeader, { color: "#1e3a8a" }]}>
          🔧 Today's Action Plan
        </Text>
        <Text style={[styles.kpiBigNumber, { color: "#2563eb" }]}>
          {todaysServices.length} Vehicles
        </Text>
        {todaysServices.length > 0 && (
          <Text style={{ marginTop: 5, color: "#475569" }}>
            First Appointment:{" "}
            <Text style={{ fontWeight: "bold" }}>
              {todaysServices[0].timeSlot}
            </Text>
          </Text>
        )}
      </View>

      {/* --- ROW 2: REVENUE --- */}
      <View style={styles.card}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 15,
          }}
        >
          <Text style={styles.cardHeader}>💰 Revenue</Text>
          <View
            style={{
              flexDirection: "row",
              backgroundColor: "#e2e8f0",
              borderRadius: 6,
            }}
          >
            <TouchableOpacity
              onPress={() => setTimeFilter("all")}
              style={[
                styles.filterBtn,
                timeFilter === "all" && styles.filterActive,
              ]}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "bold",
                  color: timeFilter === "all" ? "white" : "gray",
                }}
              >
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setTimeFilter("month")}
              style={[
                styles.filterBtn,
                timeFilter === "month" && styles.filterActive,
              ]}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "bold",
                  color: timeFilter === "month" ? "white" : "gray",
                }}
              >
                Mo
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setTimeFilter("week")}
              style={[
                styles.filterBtn,
                timeFilter === "week" && styles.filterActive,
              ]}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "bold",
                  color: timeFilter === "week" ? "white" : "gray",
                }}
              >
                Wk
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.revenueBox}>
          <Text style={{ color: "#64748b", fontWeight: "bold", fontSize: 12 }}>
            TOTAL GENERATED
          </Text>
          <Text style={{ fontSize: 32, fontWeight: "900", color: "#10b981" }}>
            {totalCombinedRevenue.toLocaleString()} LKR
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          <View
            style={[
              styles.revenueSplit,
              { backgroundColor: "#f0f9ff", borderColor: "#bae6fd" },
            ]}
          >
            <Text
              style={{ fontSize: 12, fontWeight: "bold", color: "#0369a1" }}
            >
              🔧 Base Services
            </Text>
            <Text
              style={{ fontSize: 16, fontWeight: "bold", color: "#0284c7" }}
            >
              {totalServiceRevenue.toLocaleString()}
            </Text>
          </View>
          <View
            style={[
              styles.revenueSplit,
              { backgroundColor: "#fff7ed", borderColor: "#fde68a" },
            ]}
          >
            <Text
              style={{ fontSize: 12, fontWeight: "bold", color: "#b45309" }}
            >
              ⚡ Extra Charges
            </Text>
            <Text
              style={{ fontSize: 16, fontWeight: "bold", color: "#d97706" }}
            >
              {totalAdditionalRevenue.toLocaleString()}
            </Text>
          </View>
        </View>
      </View>

      {/* --- ROW 3: TOP SPENDERS --- */}
      <Text style={[styles.header, { fontSize: 20, marginTop: 10 }]}>
        🏆 VIP Customers
      </Text>
      {spendingArray.length === 0 ? (
        <Text style={{ color: "gray", textAlign: "center", marginTop: 10 }}>
          No finalized invoices to calculate VIPs.
        </Text>
      ) : (
        spendingArray.map((data: any, idx: number) => (
          <View key={idx} style={styles.vipCard}>
            <View>
              <Text
                style={{ fontWeight: "bold", fontSize: 16, color: "#1e293b" }}
              >
                {data.customer}
              </Text>
              <Text style={{ color: "#64748b", marginTop: 2 }}>
                {data.vehicle} • {data.visitCount} visits
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text
                style={{ fontSize: 12, color: "#64748b", fontWeight: "bold" }}
              >
                LIFETIME SPEND
              </Text>
              <Text
                style={{ fontSize: 18, fontWeight: "900", color: "#047857" }}
              >
                {data.totalSpent.toLocaleString()} LKR
              </Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  // 5. New styles for the top header row and logout button
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  header: { 
    fontSize: 24, 
    fontWeight: "bold", 
    color: "#333" 
  },
  logoutBtn: {
    backgroundColor: "#ef4444", // Red color for exit action
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  logoutBtnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  // --- Original Styles Below ---
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 2,
  },
  cardHeader: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 10,
  },
  kpiBigNumber: { fontSize: 28, fontWeight: "900", color: "#3b82f6" },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 5,
  },
  chip: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: "bold",
    color: "#475569",
  },
  redAlert: {
    borderWidth: 2,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
  },
  alertRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#fecaca",
    marginBottom: 8,
  },
  blueAlert: {
    borderWidth: 2,
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
  },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  filterActive: { backgroundColor: "#3b82f6" },
  revenueBox: {
    backgroundColor: "#f8fafc",
    padding: 20,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
  },
  revenueSplit: { flex: 1, padding: 15, borderRadius: 8, borderWidth: 1 },
  vipCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#10b981",
    elevation: 1,
  },
});