import React, { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCart, updateCartItem, removeFromCart } from '../../store/cartSlice';
import { Trash2, Plus, Minus } from 'lucide-react-native';

const CartScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { items, subtotal, itemCount, loading, error } = useSelector((state) => state.cart);

    useEffect(() => {
        dispatch(fetchCart());
    }, [dispatch]);

    const handleUpdateQuantity = (itemId, currentQuantity, change) => {
        const newQuantity = currentQuantity + change;
        if (newQuantity < 1) return;
        dispatch(updateCartItem({ itemId, quantity: newQuantity }));
    };

    const handleRemove = (itemId) => {
        Alert.alert(
            'Remove Item',
            'Are you sure you want to remove this item?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => dispatch(removeFromCart(itemId)) },
            ]
        );
    };

    const renderItem = ({ item }) => {
        const imageSource = item.product.images && item.product.images.length > 0
            ? { uri: item.product.images[0].url || item.product.images[0] }
            : { uri: 'https://via.placeholder.com/100' };

        return (
            <View style={styles.cartItem}>
                <Image source={imageSource} style={styles.image} />
                <View style={styles.details}>
                    <Text style={styles.name} numberOfLines={2}>{item.product.name}</Text>
                    <Text style={styles.price}>Rs. {item.product.price}</Text>

                    <View style={styles.actions}>
                        <View style={styles.quantityControl}>
                            <TouchableOpacity
                                style={styles.qtyButton}
                                onPress={() => handleUpdateQuantity(item._id, item.quantity, -1)}
                            >
                                <Minus size={16} color="#333" />
                            </TouchableOpacity>
                            <Text style={styles.quantity}>{item.quantity}</Text>
                            <TouchableOpacity
                                style={styles.qtyButton}
                                onPress={() => handleUpdateQuantity(item._id, item.quantity, 1)}
                            >
                                <Plus size={16} color="#333" />
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity onPress={() => handleRemove(item._id)}>
                            <Trash2 size={20} color="red" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    if (loading && items.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#000" />
            </View>
        );
    }

    if (items.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Your cart is empty</Text>
                    <TouchableOpacity style={styles.browseButton} onPress={() => navigation.navigate('HomeTab')}>
                        <Text style={styles.browseButtonText}>Browse Products</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Shopping Cart ({itemCount})</Text>
            </View>
            <FlatList
                data={items}
                keyExtractor={(item) => item._id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
            />
            <View style={styles.allowance}>
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total:</Text>
                    <Text style={styles.totalAmount}>Rs. {subtotal}</Text>
                </View>
                <TouchableOpacity
                    style={styles.checkoutButton}
                    onPress={() => navigation.navigate('Checkout')} // Need to add Checkout screen to Root/App Stack
                >
                    <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 18,
        marginBottom: 16,
        color: '#666',
    },
    browseButton: {
        backgroundColor: '#000',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    browseButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    list: {
        padding: 16,
    },
    cartItem: {
        flexDirection: 'row',
        marginBottom: 16,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#f0f0f0',
        padding: 8,
    },
    image: {
        width: 80,
        height: 80,
        borderRadius: 4,
        backgroundColor: '#f5f5f5',
    },
    details: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'space-between',
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    price: {
        fontSize: 14,
        color: '#e91e63',
        fontWeight: 'bold',
        marginTop: 4,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    quantityControl: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 4,
    },
    qtyButton: {
        padding: 4,
    },
    quantity: {
        paddingHorizontal: 12,
        fontWeight: 'bold',
    },
    allowance: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        backgroundColor: '#fff',
        paddingBottom: 20,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    totalAmount: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000',
    },
    checkoutButton: {
        backgroundColor: '#000',
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    checkoutButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default CartScreen;
