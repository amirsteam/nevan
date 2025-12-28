import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

export const setItem = async (key, value) => {
    if (isWeb) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.error('Local storage is not available:', e);
        }
    } else {
        await SecureStore.setItemAsync(key, value);
    }
};

export const getItem = async (key) => {
    if (isWeb) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.error('Local storage is not available:', e);
            return null;
        }
    } else {
        return await SecureStore.getItemAsync(key);
    }
};

export const deleteItem = async (key) => {
    if (isWeb) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error('Local storage is not available:', e);
        }
    } else {
        await SecureStore.deleteItemAsync(key);
    }
};

export default {
    setItem,
    getItem,
    deleteItem,
};
