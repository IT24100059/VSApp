import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BASE_URL } from "../config";

export default function BillingScreen() {
  const [activeTab, setActiveTab] = useState("ready");

  // --- LIVE DATA STATES ---
  const [records, setRecords] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit Draft State
  const [editingBillId, setEditingBillId] = useState(null);
  const [additionalCharges, setAdditionalCharges] = useState("0");
  const [discount, setDiscount] = useState("0");

  // --- FETCH DATA ON LOAD ---
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [rRes, bRes] = await Promise.all([
        axios.get(`${BASE_URL}/admin/service-records`, config),
        axios.get(`${BASE_URL}/admin/bills`, config),
      ]);

      setRecords(rRes.data);
      setBills(bRes.data);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not fetch billing data.");
    } finally {
      setLoading(false);
    }
  };

  // --- 1. CREATE DRAFT BILL ---
  const handleCreateDraft = async (record) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const payload = {
        serviceRecordId: record._id,
        vehicleNumber: record.vehicleId?.plate || "Unknown",
        customerName: record.userId?.name || "Unknown",
        serviceTotal: record.finalTotal,
        grandTotal: record.finalTotal,
        status: "Draft",
      };

      const response = await axios.post(`${BASE_URL}/admin/bills`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setBills([...bills, response.data]);
      Alert.alert("Success", "Draft Bill Created! 📝");
      setActiveTab("drafts");
    } catch (error) {
      Alert.alert("Error", "Could not generate draft.");
    }
  };

  // --- 2. SAVE DRAFT CHANGES ---
  const handleSaveDraft = async (bill) => {
    const addCharge = Number(additionalCharges) || 0;
    const disc = Number(discount) || 0;
    const newGrandTotal = bill.serviceTotal + addCharge - disc;

    try {
      const token = await AsyncStorage.getItem("userToken");
      const payload = {
        additionalBillingCharges: addCharge,
        discount: disc,
        grandTotal: newGrandTotal,
      };

      const response = await axios.put(
        `${BASE_URL}/admin/bills/${bill._id}`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setBills(bills.map((b) => (b._id === bill._id ? response.data : b)));
      setEditingBillId(null);
      Alert.alert("Updated", "Draft pricing updated successfully.");
    } catch (error) {
      Alert.alert("Error", "Could not update draft.");
    }
  };

  // --- 3. FINALIZE BILL ---
  const handleFinalizeBill = (bill) => {
    Alert.alert("Finalize Bill", "Are you sure? It will become locked.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Finalize",
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem("userToken");
            const payload = {
              status: "Finalized",
              finalizedAt: new Date().toISOString().split("T")[0],
            };

            const response = await axios.put(
              `${BASE_URL}/admin/bills/${bill._id}`,
              payload,
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );

            setBills(
              bills.map((b) => (b._id === bill._id ? response.data : b)),
            );
            Alert.alert("Locked 🔒", "Bill Finalized!");
            setActiveTab("final");
          } catch (error) {
            Alert.alert("Error", "Could not finalize bill.");
          }
        },
      },
    ]);
  };

  // --- 4. SECURE DELETE ---
  const executeDelete = async (id, message) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      await axios.delete(`${BASE_URL}/admin/bills/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBills(bills.filter((b) => b._id !== id));
      Alert.alert("Deleted", message);
    } catch (error) {
      Alert.alert("Error", "Could not delete bill.");
    }
  };

  const handleDeleteFinalBill = (id) => {
    Alert.alert("Delete Record", "Permanently delete this finalized invoice?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => executeDelete(id, "Invoice removed."),
      },
    ]);
  };

  const handleDeleteDraft = (id) => {
    Alert.alert("Discard Draft", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Discard",
        style: "destructive",
        onPress: () => executeDelete(id, "Draft discarded."),
      },
    ]);
  };

  // --- 5. GENERATE REAL PDF INVOICE ---
  const generatePDF = async (bill) => {
    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Helvetica, sans-serif; padding: 40px; color: #333; }
            h1 { color: #1e3a8a; text-align: center; }
            .header { margin-bottom: 30px; border-bottom: 2px solid #cbd5e1; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 12px; border: 1px solid #cbd5e1; text-align: left; }
            th { background-color: #f1f5f9; }
            .total { font-size: 20px; font-weight: bold; color: #047857; text-align: right; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1>SERVICE INVOICE</h1>
          <div class="header">
            <p><strong>Customer:</strong> ${bill.customerName}</p>
            <p><strong>Vehicle:</strong> ${bill.vehicleNumber}</p>
            <p><strong>Date:</strong> ${bill.finalizedAt || new Date().toLocaleDateString()}</p>
          </div>
          <table>
            <tr><th>Description</th><th>Amount</th></tr>
            <tr><td>Base Service & Parts</td><td>${bill.serviceTotal.toLocaleString()} LKR</td></tr>
            <tr><td>Extra Bay Charges</td><td>+ ${bill.additionalBillingCharges.toLocaleString()} LKR</td></tr>
            <tr><td>Discount Applied</td><td>- ${bill.discount.toLocaleString()} LKR</td></tr>
          </table>
          <div class="total">GRAND TOTAL: ${bill.grandTotal.toLocaleString()} LKR</div>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, {
        UTI: ".pdf",
        mimeType: "application/pdf",
      });
    } catch (error) {
      Alert.alert("Error", "Could not generate PDF");
    }
  };

  // --- DATA FILTERING ---
  const completedServices = records.filter((r) => r.status === "Completed");
  const unbilledServices = completedServices.filter(
    (r) => !bills.some((b) => b.serviceRecordId === r._id),
  );

  const draftBills = bills.filter((b) => b.status === "Draft");
  const finalBills = bills
    .filter((b) => b.status === "Finalized")
    .sort(
      (a, b) =>
        new Date(b.finalizedAt).getTime() - new Date(a.finalizedAt).getTime(),
    );

  const totalRevenue = finalBills.reduce(
    (sum, bill) => sum + (bill.grandTotal || 0),
    0,
  );

  if (loading)
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text>Loading Billing Data...</Text>
      </View>
    );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <Text style={styles.header}>Billing & Invoicing</Text>

      {/* --- TABS --- */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "ready" && styles.activeTab]}
          onPress={() => setActiveTab("ready")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "ready" && styles.activeTabText,
            ]}
          >
            Ready ({unbilledServices.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "drafts" && styles.activeTab]}
          onPress={() => setActiveTab("drafts")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "drafts" && styles.activeTabText,
            ]}
          >
            Drafts ({draftBills.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "final" && styles.activeTab]}
          onPress={() => setActiveTab("final")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "final" && styles.activeTabText,
            ]}
          >
            Finalized
          </Text>
        </TouchableOpacity>
      </View>

      {/* --- TAB 1: READY TO BILL --- */}
      {activeTab === "ready" && (
        <FlatList
          data={unbilledServices}
          keyExtractor={(r) => r._id}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No completed services waiting for billing.
            </Text>
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.card,
                { borderTopWidth: 5, borderTopColor: "#3b82f6" },
              ]}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 5,
                }}
              >
                <Text style={styles.cardTitle}>{item.vehicleId?.plate}</Text>
                <Text style={{ fontWeight: "bold", color: "#3b82f6" }}>
                  {item.serviceDate}
                </Text>
              </View>
              <Text style={styles.infoText}>{item.userId?.name}</Text>
              <Text style={[styles.infoText, { marginBottom: 15 }]}>
                Tasks: {item.servicesPerformed.join(", ")}
              </Text>

              <View style={styles.financeRow}>
                <Text style={{ fontWeight: "bold" }}>Mechanic Total:</Text>
                <Text style={{ fontWeight: "bold", fontSize: 16 }}>
                  {item.finalTotal.toLocaleString()} LKR
                </Text>
              </View>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={() => handleCreateDraft(item)}
              >
                <Text style={styles.btnText}>Generate Draft Bill ➡️</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* --- TAB 2: DRAFT BILLS --- */}
      {activeTab === "drafts" && (
        <FlatList
          data={draftBills}
          keyExtractor={(b) => b._id}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No draft bills.</Text>
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.card,
                {
                  borderTopWidth: 5,
                  borderTopColor: "#f59e0b",
                  backgroundColor: "#fffbeb",
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
                <Text style={styles.cardTitle}>{item.vehicleNumber}</Text>
                <Text
                  style={{
                    backgroundColor: "#fef3c7",
                    color: "#b45309",
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 4,
                    fontWeight: "bold",
                    fontSize: 12,
                  }}
                >
                  DRAFT
                </Text>
              </View>
              <Text style={[styles.infoText, { marginBottom: 15 }]}>
                {item.customerName}
              </Text>

              <View style={styles.financeRow}>
                <Text>Service & Parts:</Text>
                <Text style={{ fontWeight: "bold" }}>
                  {item.serviceTotal.toLocaleString()} LKR
                </Text>
              </View>

              {editingBillId === item._id ? (
                <View style={styles.editBox}>
                  <Text style={styles.label}>Extra Charges (LKR):</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={additionalCharges}
                    onChangeText={setAdditionalCharges}
                  />
                  <Text style={styles.label}>Discount (LKR):</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={discount}
                    onChangeText={setDiscount}
                  />

                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: "#e2e8f0" }]}
                      onPress={() => setEditingBillId(null)}
                    >
                      <Text style={{ color: "black", fontWeight: "bold" }}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: "#f59e0b" }]}
                      onPress={() => handleSaveDraft(item)}
                    >
                      <Text style={styles.btnText}>Save Pricing</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.financeRow}>
                    <Text>Extra Charges:</Text>
                    <Text style={{ fontWeight: "bold" }}>
                      + {item.additionalBillingCharges.toLocaleString()} LKR
                    </Text>
                  </View>
                  <View style={styles.financeRow}>
                    <Text>Discount:</Text>
                    <Text style={{ fontWeight: "bold", color: "#16a34a" }}>
                      - {item.discount.toLocaleString()} LKR
                    </Text>
                  </View>
                  <View style={[styles.financeRow, styles.grandTotalRow]}>
                    <Text style={{ fontWeight: "bold", fontSize: 16 }}>
                      Grand Total:
                    </Text>
                    <Text style={{ fontWeight: "bold", fontSize: 18 }}>
                      {item.grandTotal.toLocaleString()} LKR
                    </Text>
                  </View>

                  <View
                    style={{ flexDirection: "row", gap: 10, marginTop: 15 }}
                  >
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        { flex: 0.5, backgroundColor: "#fee2e2" },
                      ]}
                      onPress={() => handleDeleteDraft(item._id)}
                    >
                      <Text style={{ fontSize: 18 }}>🗑️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: "#e2e8f0" }]}
                      onPress={() => {
                        setEditingBillId(item._id);
                        setAdditionalCharges(
                          item.additionalBillingCharges.toString(),
                        );
                        setDiscount(item.discount.toString());
                      }}
                    >
                      <Text style={{ color: "black", fontWeight: "bold" }}>
                        Edit Pricing
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: "#10b981" }]}
                      onPress={() => handleFinalizeBill(item)}
                    >
                      <Text style={styles.btnText}>Finalize ✅</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          )}
        />
      )}

      {/* --- TAB 3: FINAL INVOICES --- */}
      {activeTab === "final" && (
        <FlatList
          data={finalBills}
          keyExtractor={(b) => b._id}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No finalized invoices yet.</Text>
          }
          ListHeaderComponent={
            <View style={styles.revenueBanner}>
              <Text
                style={{ color: "#166534", fontWeight: "bold", fontSize: 16 }}
              >
                Total Generated Revenue
              </Text>
              <Text style={{ color: "#15803d", fontSize: 12, marginBottom: 5 }}>
                From {finalBills.length} finalized service(s)
              </Text>
              <Text
                style={{ color: "#166534", fontSize: 28, fontWeight: "900" }}
              >
                {totalRevenue.toLocaleString()} LKR
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.card,
                {
                  borderTopWidth: 5,
                  borderTopColor: "#10b981",
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
                <View>
                  <Text style={styles.cardTitle}>{item.vehicleNumber}</Text>
                  <Text style={styles.infoText}>{item.customerName}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
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
                    FINALIZED
                  </Text>
                  <Text
                    style={{ fontSize: 12, color: "#64748b", marginTop: 5 }}
                  >
                    {item.finalizedAt}
                  </Text>
                </View>
              </View>

              <View style={[styles.financeRow, { marginTop: 10 }]}>
                <Text>Service & Parts:</Text>
                <Text>{item.serviceTotal.toLocaleString()} LKR</Text>
              </View>
              <View style={styles.financeRow}>
                <Text>Extra Charges:</Text>
                <Text>
                  + {item.additionalBillingCharges.toLocaleString()} LKR
                </Text>
              </View>
              <View style={styles.financeRow}>
                <Text>Discount:</Text>
                <Text style={{ color: "#16a34a" }}>
                  - {item.discount.toLocaleString()} LKR
                </Text>
              </View>

              <View
                style={[
                  styles.financeRow,
                  styles.grandTotalRow,
                  { borderTopColor: "#a7f3d0" },
                ]}
              >
                <Text style={{ fontWeight: "bold", fontSize: 16 }}>
                  PAID TOTAL:
                </Text>
                <Text
                  style={{ fontWeight: "bold", fontSize: 18, color: "#047857" }}
                >
                  {item.grandTotal.toLocaleString()} LKR
                </Text>
              </View>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 15 }}>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    {
                      flex: 1,
                      backgroundColor: "#fee2e2",
                      borderColor: "#fca5a5",
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() => handleDeleteFinalBill(item._id)}
                >
                  <Text style={{ color: "#991b1b", fontWeight: "bold" }}>
                    Delete
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    { flex: 2, backgroundColor: "#1e293b" },
                  ]}
                  onPress={() => generatePDF(item)}
                >
                  <Text style={styles.btnText}>📄 Download PDF</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
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
  infoText: { fontSize: 14, color: "#666" },
  financeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
    marginTop: 10,
  },
  submitBtn: {
    backgroundColor: "#3b82f6",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 15,
  },
  btnText: { color: "white", fontWeight: "bold", fontSize: 16 },
  actionBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  editBox: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fcd34d",
    marginBottom: 10,
  },
  label: { fontWeight: "bold", color: "#555", marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    marginBottom: 15,
    backgroundColor: "#f8f9fa",
  },
  revenueBanner: {
    backgroundColor: "#dcfce7",
    padding: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#bbf7d0",
    marginBottom: 20,
    alignItems: "center",
  },
});
