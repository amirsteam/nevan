/**
 * Admin Routes
 * Protected routes for admin operations
 */
const express = require('express');
const router = express.Router();

// Controllers
const productController = require('../controllers/productController');
const categoryController = require('../controllers/categoryController');
const orderController = require('../controllers/orderController');
const paymentController = require('../controllers/paymentController');

// Utils
const asyncHandler = require('../utils/asyncHandler');

// Middleware
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/role');
const { uploadProductImages, uploadCategoryImage } = require('../config/cloudinary');
const {
    createProductValidator,
    updateProductValidator,
    createCategoryValidator,
    mongoIdValidator,
    paginationValidator,
} = require('../middleware/validate');

// All admin routes require authentication and admin role
router.use(protect);
router.use(adminOnly);

// ==================== DASHBOARD ====================
router.get('/dashboard', asyncHandler(async (req, res) => {
    const { Order, User, Product } = require('../models');

    const [orderStats, userCount, productCount, recentOrders] = await Promise.all([
        Order.getDashboardStats(),
        User.countDocuments({ isActive: true }),
        Product.countDocuments({ isActive: true }),
        Order.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('user', 'name email')
            .select('orderNumber status pricing createdAt user'),
    ]);

    res.status(200).json({
        status: 'success',
        data: {
            ...orderStats,
            totalUsers: userCount,
            totalProducts: productCount,
            recentOrders,
        },
    });
}));

// ==================== PRODUCTS ====================
router.get('/products', paginationValidator, asyncHandler(async (req, res) => {
    // Get all products including inactive for admin
    const { Product } = require('../models');
    const { paginate } = require('../utils/helpers');

    const { page = 1, limit = 20 } = req.query;
    const total = await Product.countDocuments();
    const pagination = paginate(page, limit, total);

    const products = await Product.find()
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.itemsPerPage)
        .populate('category', 'name slug');

    res.status(200).json({
        status: 'success',
        results: products.length,
        pagination,
        data: { products },
    });
}));

router.post('/products', createProductValidator, productController.createProduct);
router.put('/products/:id', mongoIdValidator('id'), updateProductValidator, productController.updateProduct);
router.delete('/products/:id', mongoIdValidator('id'), productController.deleteProduct);
router.post('/products/:id/images', mongoIdValidator('id'), uploadProductImages.array('images', 10), productController.uploadImages);
router.delete('/products/:id/images/:imageId', productController.deleteImage);

// ==================== CATEGORIES ====================
router.post('/categories', createCategoryValidator, categoryController.createCategory);
router.put('/categories/:id', mongoIdValidator('id'), categoryController.updateCategory);
router.delete('/categories/:id', mongoIdValidator('id'), categoryController.deleteCategory);
router.post('/categories/:id/image', mongoIdValidator('id'), uploadCategoryImage.single('image'), asyncHandler(async (req, res) => {
    const { Category } = require('../models');
    const category = await Category.findById(req.params.id);

    if (!category) {
        return res.status(404).json({ status: 'fail', message: 'Category not found' });
    }

    category.image = {
        url: req.file.path,
        publicId: req.file.filename,
    };
    await category.save();

    res.status(200).json({
        status: 'success',
        message: 'Category image uploaded',
        data: { category },
    });
}));

// ==================== ORDERS ====================
router.get('/orders', paginationValidator, orderController.getAllOrders);
router.get('/orders/:id', mongoIdValidator('id'), orderController.getOrder);
router.put('/orders/:id/status', mongoIdValidator('id'), orderController.updateOrderStatus);

// ==================== USERS ====================
router.get('/users', paginationValidator, asyncHandler(async (req, res) => {
    const { User } = require('../models');
    const { paginate } = require('../utils/helpers');

    const { page = 1, limit = 20, role } = req.query;
    const filter = {};
    if (role) filter.role = role;

    const total = await User.countDocuments(filter);
    const pagination = paginate(page, limit, total);

    const users = await User.find(filter)
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.itemsPerPage)
        .select('-password -refreshToken');

    res.status(200).json({
        status: 'success',
        results: users.length,
        pagination,
        data: { users },
    });
}));

router.put('/users/:id/status', mongoIdValidator('id'), asyncHandler(async (req, res) => {
    const { User } = require('../models');
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
        req.params.id,
        { isActive },
        { new: true }
    ).select('-password -refreshToken');

    if (!user) {
        return res.status(404).json({ status: 'fail', message: 'User not found' });
    }

    res.status(200).json({
        status: 'success',
        message: `User ${isActive ? 'activated' : 'deactivated'}`,
        data: { user },
    });
}));

router.put('/users/:id/role', mongoIdValidator('id'), asyncHandler(async (req, res) => {
    const { User } = require('../models');
    const { role } = req.body;

    if (!['customer', 'admin'].includes(role)) {
        return res.status(400).json({ status: 'fail', message: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(
        req.params.id,
        { role },
        { new: true }
    ).select('-password -refreshToken');

    if (!user) {
        return res.status(404).json({ status: 'fail', message: 'User not found' });
    }

    res.status(200).json({
        status: 'success',
        message: `User role updated to ${role}`,
        data: { user },
    });
}));

// ==================== PAYMENTS ====================
router.post('/payments/cod-collected', paymentController.markCODCollected);

module.exports = router;
