/**
 * Database Seeder (TypeScript)
 * Seeds the database with sample data for development/testing
 *
 * Usage:
 *   npm run seed -- --import   # Import sample data
 *   npm run seed -- --destroy  # Delete all data
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs'; // Using bcryptjs for broader compatibility in scripts
import User from './models/User';
import Category from './models/Category';
import Product from './models/Product';
import Cart from './models/Cart';
import Order from './models/Order';
import Payment from './models/Payment';
import Review from './models/Review';

// Connect to Database first
const run = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI environment variable is not defined");
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Connected');

        const arg = process.argv[2];

        if (arg === '--import' || arg === '-i') {
            // Clear existing data
            console.log('🗑️  Clearing existing data...');
            await User.deleteMany({});
            await Category.deleteMany({});
            await Product.deleteMany({});
            await Cart.deleteMany({});
            await Order.deleteMany({});
            await Payment.deleteMany({});
            await Review.deleteMany({});
            console.log('   Data cleared');

            // Create admin user with pre-hashed password
            console.log('👤 Creating users...');
            const hashedPassword1 = await bcrypt.hash('Bivan@2036', 12);
            const hashedPassword2 = await bcrypt.hash('Bimala@2036', 12);

            await User.collection.insertMany([
                {
                    name: 'Amir Shrestha',
                    email: 'amir@svi.edu.np',
                    password: hashedPassword1,
                    phone: '9861158271',
                    role: 'admin',
                    isActive: true,
                    addresses: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    name: 'Bimala Customer',
                    email: 'bimala@svi.edu.np',
                    password: hashedPassword2,
                    phone: '9861158272',
                    role: 'customer',
                    isActive: true,
                    addresses: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ]);
            console.log('   Created 2 users');

            // Create categories directly
            console.log('📁 Creating categories...');
            const categoryDocs = await Category.collection.insertMany([
                { name: 'Nevan Collection', slug: 'nevan-collection', description: 'Exclusive handcrafted collection.', isActive: true, order: 1, createdAt: new Date(), updatedAt: new Date() },
                { name: 'Nevan Sprouts', slug: 'nevan-sprouts', description: 'Adorable items for the little ones.', isActive: true, order: 2, createdAt: new Date(), updatedAt: new Date() },
            ]);
            console.log('   Created 2 categories');

            // Get category IDs
            const categories = await Category.find({});
            const catMap: { [key: string]: any } = {};
            categories.forEach(c => { catMap[c.name] = c._id; });

            // Create products
            console.log('📦 Creating products...');
            await Product.insertMany([
                // --- Nevan Collection ---
                {
                    name: 'Handwoven Hemp Backpack',
                    slug: 'handwoven-hemp-backpack',
                    description: 'Durable and eco-friendly backpack made from pure Himalayan hemp.',
                    price: 2800,
                    comparePrice: 3500,
                    category: catMap['Nevan Collection'],
                    stock: 100,
                    sku: 'NC-HMP-001',
                    isFeatured: true,
                    isActive: true,
                    images: [
                        { url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600', isPrimary: true },
                        { url: 'https://images.unsplash.com/photo-1581605405669-fcdf81165afa?w=600', isPrimary: false }
                    ],
                    variants: [
                        // Large Size
                        { size: 'Large Size (4-6 yrs)', color: 'Natural', price: 2800, stock: 25, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600' },
                        { size: 'Large Size (4-6 yrs)', color: 'Olive', price: 2900, stock: 25, image: 'https://images.unsplash.com/photo-1581605405669-fcdf81165afa?w=600' },
                        // XL Size
                        { size: 'XL Size (6-8 yrs)', color: 'Natural', price: 3000, stock: 25, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600' },
                        { size: 'XL Size (6-8 yrs)', color: 'Olive', price: 3100, stock: 25, image: 'https://images.unsplash.com/photo-1581605405669-fcdf81165afa?w=600' }
                    ],
                    ratings: { average: 4.8, count: 12 },
                },
                {
                    name: 'Traditional Pashmina Shawl',
                    slug: 'traditional-pashmina-shawl',
                    description: 'Luxurious authentic pashmina shawl.',
                    price: 5500,
                    comparePrice: 6500,
                    category: catMap['Nevan Collection'],
                    stock: 30,
                    sku: 'NC-PSH-002',
                    isFeatured: true,
                    isActive: true,
                    images: [
                        { url: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=600', isPrimary: true },
                        { url: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600', isPrimary: false }
                    ],
                    variants: [
                        { size: 'Standard Size', color: 'Cream', price: 5500, stock: 15, image: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=600' },
                        { size: 'Standard Size', color: 'Brown', price: 5500, stock: 15, image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600' }
                    ],
                    ratings: { average: 5.0, count: 5 },
                },

                // --- Nevan Sprouts ---
                {
                    name: 'Organic Baby Jumpsuit',
                    slug: 'organic-baby-jumpsuit',
                    description: 'Softest organic cotton jumpsuit for your little one.',
                    price: 1500,
                    comparePrice: 1800,
                    category: catMap['Nevan Sprouts'],
                    stock: 120,
                    sku: 'NS-JMP-001',
                    isFeatured: true,
                    isActive: true,
                    images: [
                        { url: 'https://images.unsplash.com/photo-1522771753035-1a5b6562f3ba?w=600', isPrimary: true },
                        { url: 'https://images.unsplash.com/photo-1519238263496-6361937a42d8?w=600', isPrimary: false }
                    ],
                    variants: [
                        // Small
                        { size: 'Small Size (0-1 yrs)', color: 'White', price: 1500, stock: 20, image: 'https://images.unsplash.com/photo-1522771753035-1a5b6562f3ba?w=600' },
                        { size: 'Small Size (0-1 yrs)', color: 'Blue', price: 1550, stock: 20, image: 'https://images.unsplash.com/photo-1519238263496-6361937a42d8?w=600' },
                        // Medium
                        { size: 'Medium Size (1-4 yrs)', color: 'White', price: 1650, stock: 20, image: 'https://images.unsplash.com/photo-1522771753035-1a5b6562f3ba?w=600' },
                        { size: 'Medium Size (1-4 yrs)', color: 'Blue', price: 1700, stock: 20, image: 'https://images.unsplash.com/photo-1519238263496-6361937a42d8?w=600' },
                        // Large
                        { size: 'Large Size (4-6 yrs)', color: 'White', price: 1800, stock: 20, image: 'https://images.unsplash.com/photo-1522771753035-1a5b6562f3ba?w=600' },
                        { size: 'Large Size (4-6 yrs)', color: 'Blue', price: 1850, stock: 20, image: 'https://images.unsplash.com/photo-1519238263496-6361937a42d8?w=600' }
                    ],
                    ratings: { average: 4.6, count: 18 },
                },
                {
                    name: 'Cozy Woolen Booties',
                    slug: 'cozy-woolen-booties',
                    description: 'Hand-knit woolen booties to keep tiny feet warm.',
                    price: 950,
                    comparePrice: 1200,
                    category: catMap['Nevan Sprouts'],
                    stock: 90,
                    sku: 'NS-BT-002',
                    isFeatured: true,
                    isActive: true,
                    images: [
                        { url: 'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?w=600', isPrimary: true },
                        { url: 'https://images.unsplash.com/photo-1515488042361-25f4682f087e?w=600', isPrimary: false }
                    ],
                    variants: [
                        // Small
                        { size: 'Small Size (0-1 yrs)', color: 'Beige', price: 950, stock: 25, image: 'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?w=600' },
                        { size: 'Small Size (0-1 yrs)', color: 'Red', price: 950, stock: 20, image: 'https://images.unsplash.com/photo-1515488042361-25f4682f087e?w=600' },
                        // Medium
                        { size: 'Medium Size (1-4 yrs)', color: 'Beige', price: 1050, stock: 25, image: 'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?w=600' },
                        { size: 'Medium Size (1-4 yrs)', color: 'Red', price: 1050, stock: 20, image: 'https://images.unsplash.com/photo-1515488042361-25f4682f087e?w=600' }
                    ],
                    ratings: { average: 4.9, count: 10 },
                }
            ]);
            console.log('   Created 9 products');

            console.log('\n✨ Data imported successfully!\n');
            console.log('🔐 Admin: amir@svi.edu.np / Bivan@2036');
            console.log('👤 Customer: bimala@svi.edu.np / Bimala@2036\n');

        } else if (arg === '--destroy' || arg === '-d') {
            console.log('🗑️  Deleting all data...');
            await User.deleteMany({});
            await Category.deleteMany({});
            await Product.deleteMany({});
            await Cart.deleteMany({});
            await Order.deleteMany({});
            await Payment.deleteMany({});
            await Review.deleteMany({});
            console.log('✅ All data destroyed!');
        } else {
            console.log('\n📦 BivanHandicraft Database Seeder\n');
            console.log('Usage:');
            console.log('  npm run seed -- --import   Import sample data');
            console.log('  npm run seed -- --destroy  Delete all data\n');
        }

        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
};

run();
