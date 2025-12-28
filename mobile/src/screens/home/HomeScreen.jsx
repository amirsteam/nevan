import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { productsAPI, categoriesAPI } from '../../api/products';
import ProductCard from '../../components/ProductCard';

const HomeScreen = ({ navigation }) => {
    const [categories, setCategories] = useState([]);
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [catsRes, featRes] = await Promise.all([
                categoriesAPI.getCategories(),
                productsAPI.getFeatured()
            ]);
            setCategories(catsRes.data.categories || []);
            setFeaturedProducts(featRes.data.products || []);
        } catch (error) {
            console.error('Error loading home data:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderCategory = ({ item }) => (
        <TouchableOpacity
            style={styles.categoryItem}
            onPress={() => navigation.navigate('ProductList', { categorySlug: item.slug })}
        >
            <View style={styles.categoryIcon}>
                {/* Placeholder icon or image if available */}
                <Text style={styles.categoryInitial}>{item.name.charAt(0)}</Text>
            </View>
            <Text style={styles.categoryName} numberOfLines={1}>{item.name}</Text>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#000" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Bivan Handicraft</Text>
                </View>

                {/* Categories */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Categories</Text>
                    <FlatList
                        data={categories}
                        renderItem={renderCategory}
                        keyExtractor={(item) => item._id}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.categoryList}
                    />
                </View>

                {/* Featured Products */}
                <View style={[styles.section, { flex: 1 }]}>
                    <Text style={styles.sectionTitle}>Featured Products</Text>
                    <View style={styles.productsGrid}>
                        {featuredProducts.map((product) => (
                            <ProductCard
                                key={product._id}
                                product={product}
                                onPress={() => navigation.navigate('ProductDetail', { slug: product.slug })}
                            />
                        ))}
                    </View>
                </View>
            </ScrollView>
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
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000',
    },
    section: {
        marginVertical: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 16,
        marginBottom: 12,
        color: '#333',
    },
    categoryList: {
        paddingHorizontal: 16,
    },
    categoryItem: {
        alignItems: 'center',
        marginRight: 16,
        width: 70,
    },
    categoryIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    categoryInitial: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#555',
    },
    categoryName: {
        fontSize: 12,
        textAlign: 'center',
        color: '#333',
    },
    productsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
});

export default HomeScreen;
