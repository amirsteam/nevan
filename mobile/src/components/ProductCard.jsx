import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
// import { BASE_URL } from '../api/axios'; // Accessing BASE_URL if image paths are relative

// Note: Ensure image URLs are full URLs (http including IP/host) from backend
// If backend returns relative paths, we need to prepend BASE_URL properly.
// Assuming backend returns full URL or handled by a utility.

const ProductCard = ({ product, onPress }) => {
    // Helper to handle image source
    const imageSource = product.images && product.images.length > 0
        ? { uri: product.images[0].url || product.images[0] }
        : { uri: 'https://via.placeholder.com/150' };

    return (
        <TouchableOpacity style={styles.card} onPress={onPress}>
            <Image source={imageSource} style={styles.image} resizeMode="cover" />
            <View style={styles.details}>
                <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
                <Text style={styles.price}>Rs. {product.price}</Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        width: '48%',
        backgroundColor: '#fff',
        borderRadius: 8,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: 150,
        backgroundColor: '#f0f0f0',
    },
    details: {
        padding: 8,
    },
    name: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    price: {
        fontSize: 14,
        color: '#e91e63',
        fontWeight: 'bold',
    },
});

export default ProductCard;
