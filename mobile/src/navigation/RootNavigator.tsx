import React, { useEffect } from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { View, ActivityIndicator } from "react-native";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { checkAuth } from "../store/authSlice";

import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import TabNavigator from "./TabNavigator";
import CheckoutScreen from "../screens/checkout/CheckoutScreen";
import PaymentScreen from "../screens/checkout/PaymentScreen";

export type RootStackParamList = {
  App: undefined;
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  Register: undefined;
  Checkout: undefined;
  Payment: { orderId: string };
};

const Stack = createStackNavigator<RootStackParamList>();

const AuthStack = (): JSX.Element => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

const AppStack = (): JSX.Element => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Main" component={TabNavigator} />
    <Stack.Screen
      name="Checkout"
      component={CheckoutScreen}
      options={{ headerShown: true, title: "Checkout" }}
    />
    <Stack.Screen
      name="Payment"
      component={PaymentScreen}
      options={{ headerShown: true, title: "Payment" }}
    />
  </Stack.Navigator>
);

const RootNavigator = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, checked, loading } = useAppSelector(
    (state) => state.auth,
  );

  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);

  if (!checked || loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="App" component={AppStack} />
      <Stack.Screen name="Auth" component={AuthStack} />
    </Stack.Navigator>
  );
};

export default RootNavigator;
