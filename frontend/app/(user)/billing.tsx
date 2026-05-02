import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BASE_URL } from "../config";

export default function UserBillingScreen() {
  const [myBills, setMyBills] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- FETCH DATA ON LOAD ---
  useEffect(() => {
    fetchMyBills();
  }, []);

  const fetchMyBills = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const response = await axios.get(`${BASE_URL}/bills/mybills`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Sort so the newest bills show up at the top
      const sortedBills = response.data.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setMyBills(sortedBills);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not fetch your invoices.");
    } finally {
      setLoading(false);
    }
  };

  // --- REAL PDF GENERATION ---
  const handleDownloadPDF = async (bill) => {
    const isPaid = bill.status === "Finalized";
    const statusColor = isPaid ? "#16a34a" : "#dc2626";
    const statusText = isPaid ? "PAID IN FULL" : "PAYMENT PENDING";

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Helvetica, sans-serif; padding: 40px; color: #333; }
            h1 { color: #1e293b; text-align: center; margin-bottom: 5px; }
            h3 { color: #64748b; text-align: center; margin-top: 0; font-weight: normal; }
            .header { margin-top: 30px; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 12px; border: 1px solid #cbd5e1; text-align: left; }
            th { background-color: #f8fafc; color: #475569; }
            td:last-child, th:last-child { text-align: right; }
            .total { font-size: 22px; font-weight: bold; color: #0f172a; text-align: right; margin-top: 25px; padding-top: 15px; border-top: 2px solid #0f172a; }
            .footer { margin-top: 50px; text-align: center; font-size: 14px; color: #94a3b8; font-style: italic; }
          </style>
        </head>
        <body>
          <h1>SERVICE INVOICE</h1>
          <h3>Vehicle Service Center</h3>
          
          <div class="header">
            <p><strong>Invoice ID:</strong> ${bill._id.toUpperCase()}</p>
            <p><strong>Vehicle:</strong> ${bill.vehicleNumber}</p>
            <p><strong>Date:</strong> ${bill.finalizedAt || new Date(bill.createdAt).toLocaleDateString()}</p>
            <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span></p>
          </div>
          
          <table>
            <tr><th>Description</th><th>Amount</th></tr>
            <tr><td>Base Service & Parts</td><td>${bill.serviceTotal.toLocaleString()} LKR</td></tr>
            ${bill.additionalBillingCharges > 0 ? `<tr><td>Additional Labor / Charges</td><td>+ ${bill.additionalBillingCharges.toLocaleString()} LKR</td></tr>` : ""}
            ${bill.discount > 0 ? `<tr><td>Discount Applied</td><td style="color: #16a34a;">- ${bill.discount.toLocaleString()} LKR</td></tr>` : ""}
          </table>
          
          <div class="total">GRAND TOTAL: ${bill.grandTotal.toLocaleString()} LKR</div>
          
          <div class="footer">
            Thank you for trusting us with your vehicle!<br/>
            Keep this invoice for your records.
          </div>
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
      Alert.alert("Error", "Could not generate PDF invoice.");
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
        <Text style={{ marginTop: 10 }}>Loading Your Bills...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Your Bills</Text>

      <FlatList
        data={myBills}
        keyExtractor={(b) => b._id}
        ListEmptyComponent={
          <Text style={styles.emptyText}>You have no billing records.</Text>
        }
        renderItem={({ item }) => {
          const isPaid = item.status === "Finalized";

          return (
            <View
              style={[
                styles.card,
                {
                  borderLeftWidth: 5,
                  borderLeftColor: isPaid ? "#10b981" : "#f59e0b",
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.vehicleNumber}</Text>
                <Text
                  style={{
                    color: isPaid ? "#166534" : "#b45309",
                    backgroundColor: isPaid ? "#dcfce7" : "#fef3c7",
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 4,
                    fontWeight: "bold",
                    fontSize: 12,
                  }}
                >
                  {isPaid ? "PAID" : "PENDING"}
                </Text>
              </View>

              <Text style={{ color: "#64748b", marginBottom: 10 }}>
                Date:{" "}
                {item.finalizedAt ||
                  new Date(item.createdAt).toLocaleDateString()}
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 15,
                }}
              >
                <Text style={{ fontSize: 16, color: "#333" }}>
                  Total Amount:
                </Text>
                <Text
                  style={{
                    fontWeight: "bold",
                    fontSize: 20,
                    color: isPaid ? "#047857" : "#dc2626",
                  }}
                >
                  {item.grandTotal.toLocaleString()} LKR
                </Text>
              </View>

              <TouchableOpacity
                style={styles.downloadBtn}
                onPress={() => handleDownloadPDF(item)}
              >
                <Text style={styles.btnText}>📄 Download Detailed Bill</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
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
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 30,
    color: "gray",
    fontSize: 16,
  },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#1e293b",
  },
  downloadBtn: {
    backgroundColor: "#1e293b",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 5,
  },
  btnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});
