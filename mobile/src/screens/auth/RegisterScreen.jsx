import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { register, clearError } from '../../store/authSlice';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, User, Phone, Eye, EyeOff } from 'lucide-react-native';

const RegisterScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { loading, error } = useSelector((state) => state.auth);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phoneNumber: '',
    });
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (error) {
            Alert.alert('Registration Failed', error);
            dispatch(clearError());
        }
    }, [error, dispatch]);

    const handleChange = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleRegister = () => {
        const { firstName, lastName, email, password, phoneNumber } = formData;
        if (!firstName || !lastName || !email || !password) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }
        dispatch(register(formData));
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardView}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>Sign up to start shopping</Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.row}>
                            <View style={[styles.inputContainer, styles.halfInput]}>
                                <User color="#666" size={20} style={styles.icon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="First Name"
                                    value={formData.firstName}
                                    onChangeText={(text) => handleChange('firstName', text)}
                                />
                            </View>
                            <View style={[styles.inputContainer, styles.halfInput]}>
                                <User color="#666" size={20} style={styles.icon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Last Name"
                                    value={formData.lastName}
                                    onChangeText={(text) => handleChange('lastName', text)}
                                />
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Mail color="#666" size={20} style={styles.icon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Email Address"
                                value={formData.email}
                                onChangeText={(text) => handleChange('email', text)}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Phone color="#666" size={20} style={styles.icon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Phone Number (Optional)"
                                value={formData.phoneNumber}
                                onChangeText={(text) => handleChange('phoneNumber', text)}
                                keyboardType="phone-pad"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Lock color="#666" size={20} style={styles.icon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Password"
                                value={formData.password}
                                onChangeText={(text) => handleChange('password', text)}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                {showPassword ? (
                                    <EyeOff color="#666" size={20} />
                                ) : (
                                    <Eye color="#666" size={20} />
                                )}
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.registerButton}
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.registerButtonText}>Register</Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Already have an account? </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                <Text style={styles.linkText}>Login</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
    },
    form: {
        width: '100%',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    halfInput: {
        width: '48%',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 16,
        backgroundColor: '#fafafa',
    },
    icon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    registerButton: {
        backgroundColor: '#000',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    registerButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
    },
    footerText: {
        fontSize: 14,
        color: '#666',
    },
    linkText: {
        fontSize: 14,
        color: '#000',
        fontWeight: 'bold',
    },
});

export default RegisterScreen;
