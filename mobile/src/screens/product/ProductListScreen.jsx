import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { productsAPI, categoriesAPI } from '../../api/products';
import ProductCard from '../../components/ProductCard';
import { SafeAreaView } from 'react-native-safe-area-context';

const ProductListScreen = ({ route, navigation }) => {
    const { categorySlug, search } = route.params || {};
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState('Products');

    useEffect(() => {
        loadProducts();
    }, [categorySlug, search]);

    const loadProducts = async () => {
        try {
            setLoading(true);
            let response;
            if (categorySlug) {
                const category = await categoriesAPI.getCategory(categorySlug);
                setTitle(category.data.name);
                response = await categoriesAPI.getCategoryProducts(categorySlug);
            } else if (search) {
                setTitle(`Search: ${search}`);
                response = await productsAPI.searchProducts(search);
            } else {
                response = await productsAPI.getProducts();
            }
            setProducts(response.data.products || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#000" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right']}>
            {/* Header could be custom, or rely on Stack Header */}
            <FlatList
                data={products}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                    <ProductCard
                        product={item}
                        onPress={() => navigation.navigate('ProductDetail', { slug: item.slug })}
                    />
                )}
                numColumns={2}
                columnWrapperStyle={styles.columnWrapper}
                contentContainerStyle={styles.listContent}
            />
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
    listContent: {
        padding: 16,
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
});

export default ProductListScreen;
