import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider } from "react-redux";
import { StatusBar } from "expo-status-bar";
import store from "./src/store";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App(): JSX.Element {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </Provider>
  );
}
