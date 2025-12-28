import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, StyleSheet, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { productsAPI } from '../../api/products';
import { SafeAreaView } from 'react-native-safe-area-context';
// import { useDispatch } from 'react-redux';
// import { addToCart } from '../../store/cartSlice';

const { width } = Dimensions.get('window');

const ProductDetailScreen = ({ route, navigation }) => {
    const { slug } = route.params;
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    // const dispatch = useDispatch();

    useEffect(() => {
        loadProduct();
    }, [slug]);

    const loadProduct = async () => {
        try {
            setLoading(true);
            const response = await productsAPI.getProduct(slug);
            setProduct(response.data); // Adjust based on API response structure
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddToCart = () => {
        // dispatch(addToCart({ productId: product._id, quantity: 1 }));
        alert('Added to cart (Implemented in Store)');
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#000" />
            </View>
        );
    }

    if (!product) return null;

    const imageSource = product.images && product.images.length > 0
        ? { uri: product.images[0].url || product.images[0] }
        : { uri: 'https://via.placeholder.com/300' };

    return (
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            <ScrollView>
                <Image source={imageSource} style={styles.image} resizeMode="cover" />
                <View style={styles.infoContainer}>
                    <Text style={styles.name}>{product.name}</Text>
                    <Text style={styles.price}>Rs. {product.price}</Text>
                    <Text style={styles.descriptionLabel}>Description</Text>
                    <Text style={styles.description}>{product.description}</Text>
                </View>
            </ScrollView>
            <View style={styles.footer}>
                <TouchableOpacity style={styles.addToCartButton} onPress={handleAddToCart}>
                    <Text style={styles.addToCartText}>Add to Cart</Text>
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
    image: {
        width: width,
        height: 300,
        backgroundColor: '#f0f0f0',
    },
    infoContainer: {
        padding: 16,
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    price: {
        fontSize: 20,
        color: '#e91e63',
        fontWeight: 'bold',
        marginBottom: 16,
    },
    descriptionLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    description: {
        fontSize: 14,
        color: '#666',
        lineHeight: 22,
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        backgroundColor: '#fff',
    },
    addToCartButton: {
        backgroundColor: '#000',
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    addToCartText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default ProductDetailScreen;
