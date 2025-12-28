import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { resetCart } from '../../store/cartSlice';
import { ordersAPI, paymentsAPI } from '../../api/orders';
import { MapPin, CreditCard, Truck } from 'lucide-react-native';

const CheckoutScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { items, subtotal } = useSelector((state) => state.cart);
    const { user } = useSelector((state) => state.auth);

    const [shipping, setShipping] = useState({
        name: user?.name || '',
        street: user?.addresses?.[0]?.street || '',
        city: user?.addresses?.[0]?.city || '',
        district: user?.addresses?.[0]?.district || '',
        province: user?.addresses?.[0]?.province || '3',
        phone: user?.phone || '',
    });

    const [paymentMethod, setPaymentMethod] = useState('cod');
    const [loading, setLoading] = useState(false);

    const handleChange = (key, value) => {
        setShipping(prev => ({ ...prev, [key]: value }));
    };

    const handlePlaceOrder = async () => {
        if (!shipping.name || !shipping.street || !shipping.city || !shipping.district || !shipping.phone) {
            Alert.alert('Error', 'Please fill in all shipping fields');
            return;
        }

        setLoading(true);

        try {
            // 1. Create Order
            const orderPayload = {
                shippingAddress: {
                    ...shipping,
                    province: parseInt(shipping.province),
                },
                paymentMethod,
                itemsFromCart: true,
            };

            const orderRes = await ordersAPI.createOrder(orderPayload);
            const orderId = orderRes?.order?._id || orderRes?.data?.order?._id || orderRes?.data?._id;

            if (!orderId) throw new Error('Failed to create order ID');

            // 2. Initiate Payment
            const paymentRes = await paymentsAPI.initiatePayment(orderId, paymentMethod);
            const paymentData = paymentRes.data || paymentRes;

            if (paymentMethod === 'cod') {
                dispatch(resetCart());
                Alert.alert('Success', 'Order placed successfully!', [
                    { text: 'OK', onPress: () => navigation.navigate('HomeTab') }
                ]);
            } else if (paymentMethod === 'esewa' || paymentMethod === 'khalti') {
                // Navigate to Payment WebView
                // eSewa needs form submission logic, Khalti needs redirect
                // We pass paymentData to PaymentScreen to handle specifics
                navigation.navigate('Payment', {
                    orderId,
                    gateway: paymentMethod,
                    paymentData
                });
            }

        } catch (error) {
            console.error(error);
            Alert.alert('Checkout Failed', error.response?.data?.message || 'Failed to place order');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <MapPin size={20} color="#000" />
                            <Text style={styles.sectionTitle}>Shipping Address</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            placeholder="Full Name"
                            value={shipping.name}
                            onChangeText={(t) => handleChange('name', t)}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Phone Number"
                            value={shipping.phone}
                            onChangeText={(t) => handleChange('phone', t)}
                            keyboardType="phone-pad"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Street Address"
                            value={shipping.street}
                            onChangeText={(t) => handleChange('street', t)}
                        />
                        <View style={styles.row}>
                            <TextInput
                                style={[styles.input, styles.halfInput]}
                                placeholder="City"
                                value={shipping.city}
                                onChangeText={(t) => handleChange('city', t)}
                            />
                            <TextInput
                                style={[styles.input, styles.halfInput]}
                                placeholder="District"
                                value={shipping.district}
                                onChangeText={(t) => handleChange('district', t)}
                            />
                        </View>
                        <TextInput
                            style={styles.input}
                            placeholder="Province (1-7)"
                            value={String(shipping.province)}
                            onChangeText={(t) => handleChange('province', t)}
                            keyboardType="numeric"
                        />
                    </View>

                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <CreditCard size={20} color="#000" />
                            <Text style={styles.sectionTitle}>Payment Method</Text>
                        </View>
                        <View style={styles.paymentOptions}>
                            <TouchableOpacity
                                style={[styles.paymentOption, paymentMethod === 'cod' && styles.selectedOption]}
                                onPress={() => setPaymentMethod('cod')}
                            >
                                <Text style={[styles.paymentText, paymentMethod === 'cod' && styles.selectedText]}>COD</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.paymentOption, paymentMethod === 'esewa' && styles.selectedOption]}
                                onPress={() => setPaymentMethod('esewa')}
                            >
                                <Text style={[styles.paymentText, paymentMethod === 'esewa' && styles.selectedText]}>eSewa</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.paymentOption, paymentMethod === 'khalti' && styles.selectedOption]}
                                onPress={() => setPaymentMethod('khalti')}
                            >
                                <Text style={[styles.paymentText, paymentMethod === 'khalti' && styles.selectedText]}>Khalti</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.summary}>
                        <Text style={styles.summaryTitle}>Order Summary</Text>
                        <View style={styles.summaryRow}>
                            <Text>Subtotal</Text>
                            <Text>Rs. {subtotal}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text>Shipping</Text>
                            <Text>Rs. 0</Text>
                        </View>
                        <View style={[styles.summaryRow, styles.totalRow]}>
                            <Text style={styles.totalText}>Total</Text>
                            <Text style={styles.totalText}>Rs. {subtotal}</Text>
                        </View>
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.placeOrderButton}
                        onPress={handlePlaceOrder}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.placeOrderText}>Place Order - Rs. {subtotal}</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        backgroundColor: '#fafafa',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    halfInput: {
        width: '48%',
    },
    paymentOptions: {
        flexDirection: 'row',
        gap: 12,
    },
    paymentOption: {
        flex: 1,
        padding: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectedOption: {
        borderColor: '#000',
        backgroundColor: '#000',
    },
    paymentText: {
        fontWeight: 'bold',
        color: '#333',
    },
    selectedText: {
        color: '#fff',
    },
    summary: {
        backgroundColor: '#f9f9f9',
        padding: 16,
        borderRadius: 8,
    },
    summaryTitle: {
        fontWeight: 'bold',
        marginBottom: 12,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    totalRow: {
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        paddingTop: 8,
        marginTop: 8,
    },
    totalText: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    placeOrderButton: {
        backgroundColor: '#000',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    placeOrderText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default CheckoutScreen;
