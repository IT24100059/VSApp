import { Ionicons } from "@expo/vector-icons"; // --- Switched to Ionicons ---
import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => (
            <Ionicons size={28} name="pie-chart" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: "Customers",
          tabBarIcon: ({ color }) => (
            <Ionicons size={28} name="people" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="vehicles"
        options={{
          title: "Vehicles",
          tabBarIcon: ({ color }) => (
            <Ionicons size={28} name="car" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Bookings",
          tabBarIcon: ({ color }) => (
            <Ionicons size={28} name="calendar" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "Inventory",
          tabBarIcon: ({ color }) => (
            <Ionicons size={28} name="cube" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="service"
        options={{
          title: "Active Bay",
          tabBarIcon: ({ color }) => (
            <Ionicons size={28} name="build" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="billing"
        options={{
          title: "Billing",
          tabBarIcon: ({ color }) => (
            <Ionicons size={28} name="receipt" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
