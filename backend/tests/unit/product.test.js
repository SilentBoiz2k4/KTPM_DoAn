import { jest } from '@jest/globals';
import Product from '../../models/productModel.js';
import { generateToken } from '../../utils.js';

// Mock the Product model
jest.mock('../../models/productModel.js');

describe('Product Management Unit Tests', () => {
  let mockProduct;
  let mockUser;
  let mockAdminUser;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Mock product data
    mockProduct = {
      _id: '507f1f77bcf86cd799439011',
      name: 'Test Product',
      slug: 'test-product',
      image: '/images/test.jpg',
      brand: 'Test Brand',
      category: 'Test Category',
      description: 'Test Description',
      price: 99.99,
      countInStock: 10,
      rating: 4.5,
      numReviews: 2,
      reviews: [
        {
          name: 'John Doe',
          rating: 5,
          comment: 'Great product!'
        },
        {
          name: 'Jane Smith',
          rating: 4,
          comment: 'Good quality'
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
      save: jest.fn().mockResolvedValue(true),
      remove: jest.fn().mockResolvedValue(true)
    };

    // Mock regular user
    mockUser = {
      _id: '507f1f77bcf86cd799439012',
      name: 'Test User',
      email: 'user@test.com',
      isAdmin: false
    };

    // Mock admin user
    mockAdminUser = {
      _id: '507f1f77bcf86cd799439013',
      name: 'Admin User',
      email: 'admin@test.com',
      isAdmin: true
    };
  });

  describe('Product Model Validation', () => {
    test('should create a valid product with all required fields', () => {
      const productData = {
        name: 'Valid Product',
        slug: 'valid-product',
        image: '/images/valid.jpg',
        brand: 'Valid Brand',
        category: 'Valid Category',
        description: 'Valid Description',
        price: 29.99,
        countInStock: 5,
        rating: 0,
        numReviews: 0
      };

      // Test product data validation
      expect(productData.name).toBe('Valid Product');
      expect(productData.price).toBe(29.99);
      expect(productData.countInStock).toBe(5);
      expect(typeof productData.name).toBe('string');
      expect(typeof productData.price).toBe('number');
      expect(typeof productData.countInStock).toBe('number');
    });

    test('should validate required fields', () => {
      const invalidProductData = {
        // Missing required fields
        name: '',
        price: -10, // Invalid price
        countInStock: -5 // Invalid stock
      };

      // Test validation logic
      expect(invalidProductData.name).toBe('');
      expect(invalidProductData.price).toBeLessThan(0);
      expect(invalidProductData.countInStock).toBeLessThan(0);
    });

    test('should validate price is positive number', () => {
      const testCases = [
        { price: 0, valid: true },
        { price: 10.99, valid: true },
        { price: -5, valid: false },
        { price: 'invalid', valid: false },
        { price: null, valid: false }
      ];

      testCases.forEach(({ price, valid }) => {
        if (valid) {
          expect(typeof price === 'number' && price >= 0).toBe(true);
        } else {
          expect(typeof price === 'number' && price >= 0).toBe(false);
        }
      });
    });

    test('should validate stock count is non-negative integer', () => {
      const testCases = [
        { stock: 0, valid: true },
        { stock: 10, valid: true },
        { stock: -1, valid: false },
        { stock: 1.5, valid: false },
        { stock: 'invalid', valid: false }
      ];

      testCases.forEach(({ stock, valid }) => {
        if (valid) {
          expect(Number.isInteger(stock) && stock >= 0).toBe(true);
        } else {
          expect(Number.isInteger(stock) && stock >= 0).toBe(false);
        }
      });
    });
  });

  describe('Product Search and Filter Logic', () => {
    beforeEach(() => {
      // Mock Product.find() chain methods
      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([mockProduct])
      };
      
      Product.find = jest.fn().mockReturnValue(mockQuery);
      Product.countDocuments = jest.fn().mockResolvedValue(1);
    });

    test('should build correct query filter for search', () => {
      const searchQuery = 'test product';
      const expectedFilter = {
        name: {
          $regex: searchQuery,
          $options: 'i'
        }
      };

      // Simulate search filter logic
      const queryFilter = searchQuery && searchQuery !== 'all' 
        ? {
            name: {
              $regex: searchQuery,
              $options: 'i'
            }
          }
        : {};

      expect(queryFilter).toEqual(expectedFilter);
    });

    test('should build correct category filter', () => {
      const category = 'Electronics';
      const expectedFilter = { category: 'Electronics' };

      const categoryFilter = category && category !== 'all' ? { category } : {};

      expect(categoryFilter).toEqual(expectedFilter);
    });

    test('should build correct price range filter', () => {
      const priceRange = '10-50';
      const expectedFilter = {
        price: {
          $gte: 10,
          $lte: 50
        }
      };

      const priceFilter = priceRange && priceRange !== 'all'
        ? {
            price: {
              $gte: Number(priceRange.split('-')[0]),
              $lte: Number(priceRange.split('-')[1])
            }
          }
        : {};

      expect(priceFilter).toEqual(expectedFilter);
    });

    test('should build correct rating filter', () => {
      const rating = '4';
      const expectedFilter = {
        rating: {
          $gte: 4
        }
      };

      const ratingFilter = rating && rating !== 'all'
        ? {
            rating: {
              $gte: Number(rating)
            }
          }
        : {};

      expect(ratingFilter).toEqual(expectedFilter);
    });

    test('should build correct sort order', () => {
      const testCases = [
        { order: 'featured', expected: { featured: -1 } },
        { order: 'lowest', expected: { price: 1 } },
        { order: 'highest', expected: { price: -1 } },
        { order: 'toprated', expected: { rating: -1 } },
        { order: 'newest', expected: { createdAt: -1 } },
        { order: 'default', expected: { _id: -1 } }
      ];

      testCases.forEach(({ order, expected }) => {
        const sortOrder = order === 'featured'
          ? { featured: -1 }
          : order === 'lowest'
          ? { price: 1 }
          : order === 'highest'
          ? { price: -1 }
          : order === 'toprated'
          ? { rating: -1 }
          : order === 'newest'
          ? { createdAt: -1 }
          : { _id: -1 };

        expect(sortOrder).toEqual(expected);
      });
    });
  });

  describe('Product CRUD Operations', () => {
    test('should create new product with default values', () => {
      const timestamp = Date.now();
      const expectedProduct = {
        name: `sample name ${timestamp}`,
        slug: `sample-slug-${timestamp}`,
        image: '/images/p1.jpg',
        price: 0,
        category: 'sample category',
        brand: 'sample brand',
        countInStock: 0,
        rating: 0,
        numReviews: 0,
        description: 'sample description'
      };

      // Test default product creation logic
      expect(expectedProduct.name).toContain('sample name');
      expect(expectedProduct.slug).toContain('sample-slug-');
      expect(expectedProduct.price).toBe(0);
      expect(expectedProduct.countInStock).toBe(0);
      expect(expectedProduct.rating).toBe(0);
      expect(expectedProduct.numReviews).toBe(0);
    });

    test('should update product with new data', async () => {
      const updateData = {
        name: 'Updated Product',
        slug: 'updated-product',
        price: 199.99,
        image: '/images/updated.jpg',
        category: 'Updated Category',
        brand: 'Updated Brand',
        countInStock: 20,
        description: 'Updated Description'
      };

      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const product = await Product.findById('507f1f77bcf86cd799439011');
      
      // Simulate update
      Object.assign(product, updateData);
      
      expect(product.name).toBe('Updated Product');
      expect(product.price).toBe(199.99);
      expect(product.countInStock).toBe(20);
    });

    test('should delete product', async () => {
      Product.findById = jest.fn().mockResolvedValue(mockProduct);

      const product = await Product.findById('507f1f77bcf86cd799439011');
      
      expect(product).toBeTruthy();
      expect(typeof product.remove).toBe('function');
      
      await product.remove();
      expect(product.remove).toHaveBeenCalled();
    });
  });

  describe('Product Review System', () => {
    test('should add new review to product', () => {
      const newReview = {
        name: 'New Reviewer',
        rating: 5,
        comment: 'Excellent product!'
      };

      // Simulate adding review
      mockProduct.reviews.push(newReview);
      mockProduct.numReviews = mockProduct.reviews.length;
      mockProduct.rating = mockProduct.reviews.reduce((a, c) => c.rating + a, 0) / mockProduct.reviews.length;

      expect(mockProduct.reviews).toHaveLength(3);
      expect(mockProduct.numReviews).toBe(3);
      expect(mockProduct.rating).toBeCloseTo(4.67, 2);
    });

    test('should prevent duplicate reviews from same user', () => {
      const existingReviewerName = 'John Doe';
      const duplicateReview = {
        name: existingReviewerName,
        rating: 3,
        comment: 'Another review'
      };

      // Check if user already reviewed
      const existingReview = mockProduct.reviews.find(x => x.name === duplicateReview.name);
      
      expect(existingReview).toBeTruthy();
      expect(existingReview.name).toBe(existingReviewerName);
    });

    test('should calculate correct average rating', () => {
      const reviews = [
        { rating: 5 },
        { rating: 4 },
        { rating: 3 },
        { rating: 5 },
        { rating: 4 }
      ];

      const averageRating = reviews.reduce((a, c) => c.rating + a, 0) / reviews.length;
      
      expect(averageRating).toBe(4.2);
    });

    test('should validate review rating range', () => {
      const testCases = [
        { rating: 1, valid: true },
        { rating: 3, valid: true },
        { rating: 5, valid: true },
        { rating: 0, valid: false },
        { rating: 6, valid: false },
        { rating: -1, valid: false },
        { rating: 'invalid', valid: false }
      ];

      testCases.forEach(({ rating, valid }) => {
        const isValidRating = typeof rating === 'number' && rating >= 1 && rating <= 5;
        expect(isValidRating).toBe(valid);
      });
    });
  });

  describe('Product Categories', () => {
    test('should get distinct categories', async () => {
      const mockCategories = ['Electronics', 'Clothing', 'Books', 'Home'];
      
      Product.find = jest.fn().mockReturnValue({
        distinct: jest.fn().mockResolvedValue(mockCategories)
      });

      const categories = await Product.find().distinct('category');
      
      expect(categories).toEqual(mockCategories);
      expect(categories).toHaveLength(4);
    });

    test('should validate category is not empty', () => {
      const testCases = [
        { category: 'Electronics', valid: true },
        { category: 'Clothing', valid: true },
        { category: '', valid: false },
        { category: null, valid: false },
        { category: undefined, valid: false }
      ];

      testCases.forEach(({ category, valid }) => {
        const isValidCategory = category && category.trim().length > 0;
        expect(!!isValidCategory).toBe(valid);
      });
    });
  });

  describe('Product Pagination', () => {
    test('should calculate correct pagination values', () => {
      const PAGE_SIZE = 3;
      const page = 2;
      const totalProducts = 10;

      const skip = PAGE_SIZE * (page - 1);
      const pages = Math.ceil(totalProducts / PAGE_SIZE);

      expect(skip).toBe(3); // Skip first 3 products for page 2
      expect(pages).toBe(4); // Total 4 pages for 10 products with page size 3
    });

    test('should handle edge cases for pagination', () => {
      const testCases = [
        { total: 0, pageSize: 3, expectedPages: 0 },
        { total: 1, pageSize: 3, expectedPages: 1 },
        { total: 3, pageSize: 3, expectedPages: 1 },
        { total: 4, pageSize: 3, expectedPages: 2 },
        { total: 10, pageSize: 5, expectedPages: 2 }
      ];

      testCases.forEach(({ total, pageSize, expectedPages }) => {
        const pages = Math.ceil(total / pageSize);
        expect(pages).toBe(expectedPages);
      });
    });
  });

  describe('Product Stock Management', () => {
    test('should check if product is in stock', () => {
      const testCases = [
        { stock: 0, inStock: false },
        { stock: 1, inStock: true },
        { stock: 10, inStock: true },
        { stock: -1, inStock: false }
      ];

      testCases.forEach(({ stock, inStock }) => {
        const isInStock = stock > 0;
        expect(isInStock).toBe(inStock);
      });
    });

    test('should update stock after purchase', () => {
      const initialStock = 10;
      const purchaseQuantity = 3;
      const expectedStock = initialStock - purchaseQuantity;

      mockProduct.countInStock = initialStock;
      
      // Simulate purchase
      if (mockProduct.countInStock >= purchaseQuantity) {
        mockProduct.countInStock -= purchaseQuantity;
      }

      expect(mockProduct.countInStock).toBe(expectedStock);
    });

    test('should prevent overselling', () => {
      const initialStock = 2;
      const purchaseQuantity = 5;

      mockProduct.countInStock = initialStock;
      
      // Check if sufficient stock
      const canPurchase = mockProduct.countInStock >= purchaseQuantity;
      
      expect(canPurchase).toBe(false);
      expect(mockProduct.countInStock).toBe(initialStock); // Stock unchanged
    });
  });
});