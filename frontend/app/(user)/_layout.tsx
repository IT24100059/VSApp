import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function UserTabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#0ea5e9", // A nice blue for the user side!
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="profile"
        options={{
          title: "My Profile",
          tabBarIcon: ({ color }) => (
            <Ionicons size={28} name="person" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="vehicles"
        options={{
          title: "My Cars",
          tabBarIcon: ({ color }) => (
            <Ionicons size={28} name="car-sport" color={color} />
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
        name="billing"
        options={{
          title: "My Bills",
          tabBarIcon: ({ color }) => (
            <Ionicons size={28} name="receipt" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
