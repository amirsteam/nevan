/**
 * Category Routes
 * Public routes for category browsing
 */
import express from 'express';
import * as categoryController from '../controllers/categoryController';

const router = express.Router();

// Public routes
router.get('/', categoryController.getCategories);
router.get('/all', categoryController.getAllCategoriesFlat);
router.get('/:slug', categoryController.getCategory);

export default router;
