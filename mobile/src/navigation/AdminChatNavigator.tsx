/**
 * Admin Chat Stack Navigator
 * Inbox of customer conversations → a conversation
 */
import React, { JSX } from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { AdminChatRoomsScreen } from "../screens/admin";
import { ChatScreen } from "../screens/chat";
import type { AdminChatStackParamList } from "./types";

const Stack = createStackNavigator<AdminChatStackParamList>();

const AdminChatNavigator = (): JSX.Element => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="AdminChatRooms"
        component={AdminChatRoomsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminChatRoom"
        component={ChatScreen}
        options={({ route }) => ({ title: route.params.customerName || "Conversation" })}
      />
    </Stack.Navigator>
  );
};

export default AdminChatNavigator;
