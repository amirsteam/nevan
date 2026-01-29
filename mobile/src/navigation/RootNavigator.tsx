import React, { useEffect, JSX } from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { View, ActivityIndicator } from "react-native";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { checkAuth } from "../store/authSlice";

import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";
import VerifyOTPScreen from "../screens/auth/VerifyOTPScreen";
import ResetPasswordScreen from "../screens/auth/ResetPasswordScreen";
import TabNavigator from "./TabNavigator";
import CheckoutScreen from "../screens/checkout/CheckoutScreen";
import PaymentScreen from "../screens/checkout/PaymentScreen";
import type {
  RootStackParamList,
  AuthStackParamList,
  AppStackParamList,
} from "./types";

export type { RootStackParamList, AuthStackParamList, AppStackParamList };

const RootStack = createStackNavigator<RootStackParamList>();
const AuthStackNav = createStackNavigator<AuthStackParamList>();
const AppStackNav = createStackNavigator<AppStackParamList>();

const AuthStack = (): JSX.Element => (
  <AuthStackNav.Navigator screenOptions={{ headerShown: false }}>
    <AuthStackNav.Screen name="Login" component={LoginScreen} />
    <AuthStackNav.Screen name="Register" component={RegisterScreen} />
    <AuthStackNav.Screen
      name="ForgotPassword"
      component={ForgotPasswordScreen}
    />
    <AuthStackNav.Screen name="VerifyOTP" component={VerifyOTPScreen} />
    <AuthStackNav.Screen name="ResetPassword" component={ResetPasswordScreen} />
  </AuthStackNav.Navigator>
);

const AppStack = (): JSX.Element => (
  <AppStackNav.Navigator screenOptions={{ headerShown: false }}>
    <AppStackNav.Screen name="Main" component={TabNavigator} />
    <AppStackNav.Screen
      name="Checkout"
      component={CheckoutScreen}
      options={{ headerShown: true, title: "Checkout" }}
    />
    <AppStackNav.Screen
      name="Payment"
      component={PaymentScreen}
      options={{ headerShown: true, title: "Payment" }}
    />
  </AppStackNav.Navigator>
);

const RootNavigator = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const { checked, loading } = useAppSelector((state) => state.auth);

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
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="App" component={AppStack} />
      <RootStack.Screen name="Auth" component={AuthStack} />
    </RootStack.Navigator>
  );
};

export default RootNavigator;
