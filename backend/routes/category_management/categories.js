const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const verifyToken = require('../../middlewares/verify_token');
const authorizeRole = require('../../middlewares/authorizeRole');
const AWS = require('aws-sdk');

// AWS S3 Configuration
const S3_REGION = process.env.AWS_REGION;
const S3_BUCKET = process.env.S3_BUCKET || process.env.S3_BUCKET_PROVIDER_DOCS || process.env.AWS_BUCKET_NAME;
const s3 = new AWS.S3({ region: S3_REGION });

router.post('/create-category', verifyToken, authorizeRole(['admin', 'super admin']), async (req, res) => {
  try {
    const { name, category_type } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    if (!category_type) return res.status(400).json({ message: 'Category type is required' });

    const { image_url } = req.body;
    const sql = 'INSERT INTO service_categories (name, category_type, is_active, image_url) VALUES (?, ?, ?, ?)';
    const [result] = await pool.query(sql, [name, category_type, 1, image_url || null]);

    res.status(201).json({ id: result.insertId, name });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/get-categories', verifyToken, authorizeRole(['admin', 'super admin']), async (req, res) => {
  try {

    // Pagination implementation
    let { page = 1, limit = 10 } = req.query;
    page = parseInt(page, 10);
    limit = parseInt(limit, 10);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;

    const offset = (page - 1) * limit;

    // Get total count for pagination metadata
    const [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM service_categories');

    // Fetch paginated results
    const [rows] = await pool.query(
      'SELECT id, name, is_active, category_type, image_url FROM service_categories LIMIT ? OFFSET ?',
      [limit, offset]
    );

    res.json({
      category_data: rows,
      pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// edit category name
router.put('/edit-category/:id', verifyToken, authorizeRole(['admin', 'super admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, is_active, category_type, image_url } = req.body;
    if (!id) return res.status(400).json({ message: 'ID is required' });
    console.log("EDIT CATEGORY ", req.body);
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const sql = 'UPDATE service_categories SET name = ?, is_active = ?, category_type = ?, image_url = ? WHERE id = ?';
    const [result] = await pool.query(sql, [name, is_active, category_type, image_url || null, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json({ id, name });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.delete('/delete-category/:id', verifyToken, authorizeRole(['admin', 'super admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Get category info to delete S3 image if exists
    const [categories] = await pool.query('SELECT image_url FROM service_categories WHERE id = ?', [id]);
    
    if (categories.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Delete from database
    const sql = 'DELETE FROM service_categories WHERE id = ?';
    const [result] = await pool.query(sql, [id]);

    // Delete S3 image if exists
    if (categories[0].image_url && S3_BUCKET) {
      try {
        const s3Key = categories[0].image_url.split('.amazonaws.com/')[1];
        if (s3Key) {
          await s3.deleteObject({ Bucket: S3_BUCKET, Key: s3Key }).promise();
        }
      } catch (s3Error) {
        console.error('Error deleting S3 image:', s3Error);
        // Continue even if S3 deletion fails
      }
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
router.post('/create-sub-category', verifyToken, authorizeRole(['admin', 'super admin']), async (req, res) => {
    try {
        
        console.log(req.body);
        const { name, category_id, description, base_price, is_active, image_url } = req.body;
        if (!name || !category_id) {
            return res.status(400).json({ message: 'Name and category_id are required' });
        }
        const sql = `INSERT INTO subcategories (name, category_id, description, base_price, is_active, image_url)
         VALUES (?, ?, ?, ?, ?, ?)`;
        const [result] = await pool.query(sql, [name, category_id, description || null, base_price || null, is_active !== undefined ? is_active : 1, image_url || null]);
        res.status(201).json({ id: result.insertId, name, category_id, description, base_price, is_active: is_active !== undefined ? is_active : 1, image_url: image_url || null });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.get('/sub-categories', verifyToken, authorizeRole(['admin', 'super admin']), async (req, res) => {
    try {
        const { categoryId } = req.query;
        console.log("categoryId from query:", categoryId);
        const sql = 'SELECT * FROM subcategories WHERE category_id = ?';
        const [rows] = await pool.query(sql, [categoryId]);
        res.json(rows);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.get('/sub-categories/:id', verifyToken, authorizeRole(['admin', 'super admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const sql = 'SELECT * FROM subcategories WHERE id = ?';
        const [rows] = await pool.query(sql, [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Subcategory not found' });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.put('/:category_id/subcategories/:id', verifyToken, authorizeRole(['admin', 'super admin']), async (req, res) => {
    try {
        const { category_id, id } = req.params;
        console.log("Updating subcategory with ID:", id, "in category:", category_id);
        const { name, description, base_price, is_active, image_url } = req.body;
        const sql = `UPDATE subcategories SET name = ?, category_id = ?, description = ?, base_price = ?, is_active = ?, image_url = ? 
                    WHERE id = ? AND category_id = ?`;
        const [result] = await pool.query(sql, [name, category_id, description, base_price, is_active !== undefined ? is_active : 1, image_url || null, id, category_id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Subcategory not found' });
        }
        res.json({ id, name, category_id, description, base_price, is_active, image_url: image_url || null });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.delete('/delete-sub-category/:categoryId/:subcategoryId', verifyToken, authorizeRole(['admin', 'super admin']), async (req, res) => {
    try {
        const { categoryId, subcategoryId } = req.params;
        
        // Get subcategory info to delete S3 image if exists
        const [subcategories] = await pool.query('SELECT image_url FROM subcategories WHERE id = ? AND category_id = ?', [subcategoryId, categoryId]);
        
        if (subcategories.length === 0) {
            return res.status(404).json({ message: 'Subcategory not found' });
        }
        
        // Delete from database
        const sql = 'DELETE FROM subcategories WHERE id = ? AND category_id = ?';
        const [result] = await pool.query(sql, [subcategoryId, categoryId]);
        
        // Delete S3 image if exists
        if (subcategories[0].image_url && S3_BUCKET) {
            try {
                const s3Key = subcategories[0].image_url.split('.amazonaws.com/')[1];
                if (s3Key) {
                    await s3.deleteObject({ Bucket: S3_BUCKET, Key: s3Key }).promise();
                }
            } catch (s3Error) {
                console.error('Error deleting S3 image:', s3Error);
                // Continue even if S3 deletion fails
            }
        }
        
        res.json({ message: 'Subcategory deleted successfully' });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// ===========================
// S3 Presigned URL Endpoints
// ===========================

/**
 * Generate presigned URL for category image upload
 * POST /api/categories/categories/:categoryId/image/presign
 */
router.post('/categories/:categoryId/image/presign', verifyToken, authorizeRole(['admin', 'super admin']), async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { fileName, fileType } = req.body;

        if (!fileName || !fileType) {
            return res.status(400).json({ message: 'fileName and fileType are required' });
        }

        // Validate file type (images only)
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(fileType.toLowerCase())) {
            return res.status(400).json({ message: 'Invalid file type. Only images are allowed.' });
        }

        if (!S3_BUCKET) {
            return res.status(500).json({ message: 'S3 bucket not configured' });
        }

        // Verify category exists
        const [categories] = await pool.query('SELECT id FROM service_categories WHERE id = ?', [categoryId]);
        if (categories.length === 0) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // Generate unique file name with timestamp
        const timestamp = Date.now();
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const s3Key = `category_images/${categoryId}/${timestamp}_${sanitizedFileName}`;

        // Generate presigned URL for PUT operation (5 minutes expiry)
        const presignedUrl = s3.getSignedUrl('putObject', {
            Bucket: S3_BUCKET,
            Key: s3Key,
            ContentType: fileType,
            Expires: 300 // 5 minutes
        });

        // Generate the final S3 URL (what will be stored in database)
        const s3Url = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${s3Key}`;

        res.json({
            uploadUrl: presignedUrl,
            fileUrl: s3Url,
            s3Key: s3Key
        });

    } catch (err) {
        console.error('Error generating presigned URL:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

/**
 * Generate presigned URL for subcategory image upload
 * POST /api/categories/subcategories/:subcategoryId/image/presign
 */
router.post('/subcategories/:subcategoryId/image/presign', verifyToken, authorizeRole(['admin', 'super admin']), async (req, res) => {
    try {
        const { subcategoryId } = req.params;
        const { fileName, fileType } = req.body;

        if (!fileName || !fileType) {
            return res.status(400).json({ message: 'fileName and fileType are required' });
        }

        // Validate file type (images only)
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(fileType.toLowerCase())) {
            return res.status(400).json({ message: 'Invalid file type. Only images are allowed.' });
        }

        if (!S3_BUCKET) {
            return res.status(500).json({ message: 'S3 bucket not configured' });
        }

        // Verify subcategory exists
        const [subcategories] = await pool.query('SELECT id, category_id FROM subcategories WHERE id = ?', [subcategoryId]);
        if (subcategories.length === 0) {
            return res.status(404).json({ message: 'Subcategory not found' });
        }

        const categoryId = subcategories[0].category_id;

        // Generate unique file name with timestamp
        const timestamp = Date.now();
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const s3Key = `subcategory_images/${categoryId}/${subcategoryId}/${timestamp}_${sanitizedFileName}`;

        // Generate presigned URL for PUT operation (5 minutes expiry)
        const presignedUrl = s3.getSignedUrl('putObject', {
            Bucket: S3_BUCKET,
            Key: s3Key,
            ContentType: fileType,
            Expires: 300 // 5 minutes
        });

        // Generate the final S3 URL (what will be stored in database)
        const s3Url = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${s3Key}`;

        res.json({
            uploadUrl: presignedUrl,
            fileUrl: s3Url,
            s3Key: s3Key
        });

    } catch (err) {
        console.error('Error generating presigned URL:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

/**
 * Get presigned URL to view category image
 * GET /api/categories/categories/:categoryId/image/presign
 */
router.get('/categories/:categoryId/image/presign', verifyToken, async (req, res) => {
    try {
        const { categoryId } = req.params;

        if (!S3_BUCKET) {
            return res.status(500).json({ message: 'S3 bucket not configured' });
        }

        // Get category image URL
        const [categories] = await pool.query('SELECT image_url FROM service_categories WHERE id = ?', [categoryId]);
        if (categories.length === 0 || !categories[0].image_url) {
            return res.status(404).json({ message: 'Category image not found' });
        }

        const imageUrl = categories[0].image_url;
        
        // Handle local files (legacy)
        if (imageUrl.startsWith('/uploads/') || imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            if (!imageUrl.includes('.amazonaws.com')) {
                // Local file or external URL - return as is
                return res.json({ url: imageUrl, storage: 'local' });
            }
        }
        
        // Extract S3 key from URL - handle different URL formats
        let s3Key;
        if (imageUrl.includes('.amazonaws.com/')) {
            s3Key = imageUrl.split('.amazonaws.com/')[1];
        } else if (imageUrl.startsWith('category_images/')) {
            // Already a key
            s3Key = imageUrl;
        } else {
            return res.status(400).json({ message: 'Invalid S3 URL format' });
        }

        if (!s3Key) {
            return res.status(400).json({ message: 'Could not extract S3 key from URL' });
        }

        // Generate presigned URL for GET operation (5 minutes expiry)
        const params = {
            Bucket: S3_BUCKET,
            Key: s3Key,
            Expires: 300
        };
        
        const presignedUrl = await s3.getSignedUrlPromise('getObject', params);
        res.json({ url: presignedUrl, storage: 's3', expiresIn: 300 });

    } catch (err) {
        console.error('Error generating view presigned URL:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

/**
 * Get presigned URL to view category image (PUBLIC - for customer landing page)
 * GET /api/categories/public/categories/:categoryId/image
 */
router.get('/public/categories/:categoryId/image', async (req, res) => {
    try {
        const { categoryId } = req.params;

        if (!S3_BUCKET) {
            return res.status(500).json({ message: 'S3 bucket not configured' });
        }

        // Get category image URL
        const [categories] = await pool.query('SELECT image_url FROM service_categories WHERE id = ? AND is_active = 1', [categoryId]);
        if (categories.length === 0 || !categories[0].image_url) {
            return res.status(404).json({ message: 'Category image not found' });
        }

        const imageUrl = categories[0].image_url;
        
        // Handle local files (legacy)
        if (imageUrl.startsWith('/uploads/') || imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            if (!imageUrl.includes('.amazonaws.com')) {
                // Local file or external URL - return as is
                return res.json({ url: imageUrl, storage: 'local' });
            }
        }
        
        // Extract S3 key from URL - handle different URL formats
        let s3Key;
        if (imageUrl.includes('.amazonaws.com/')) {
            s3Key = imageUrl.split('.amazonaws.com/')[1];
        } else if (imageUrl.startsWith('category_images/')) {
            // Already a key
            s3Key = imageUrl;
        } else {
            return res.status(400).json({ message: 'Invalid S3 URL format' });
        }

        if (!s3Key) {
            return res.status(400).json({ message: 'Could not extract S3 key from URL' });
        }

        // Generate presigned URL for GET operation (30 minutes expiry for public access)
        const params = {
            Bucket: S3_BUCKET,
            Key: s3Key,
            Expires: 1800 // 30 minutes for public access
        };
        
        const presignedUrl = await s3.getSignedUrlPromise('getObject', params);
        res.json({ url: presignedUrl, storage: 's3', expiresIn: 1800 });

    } catch (err) {
        console.error('Error generating public category image presigned URL:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

/**
 * Get presigned URL to view subcategory image (PUBLIC - for customer landing page)
 * GET /api/categories/public/subcategories/:subcategoryId/image
 */
router.get('/public/subcategories/:subcategoryId/image', async (req, res) => {
    try {
        const { subcategoryId } = req.params;

        if (!S3_BUCKET) {
            return res.status(500).json({ message: 'S3 bucket not configured' });
        }

        // Get subcategory image URL
        const [subcategories] = await pool.query('SELECT image_url FROM subcategories WHERE id = ? AND is_active = 1', [subcategoryId]);
        if (subcategories.length === 0 || !subcategories[0].image_url) {
            return res.status(404).json({ message: 'Subcategory image not found' });
        }

        const imageUrl = subcategories[0].image_url;
        
        // Handle local files (legacy)
        if (imageUrl.startsWith('/uploads/') || imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            if (!imageUrl.includes('.amazonaws.com')) {
                // Local file or external URL - return as is
                return res.json({ url: imageUrl, storage: 'local' });
            }
        }
        
        // Extract S3 key from URL - handle different URL formats
        let s3Key;
        if (imageUrl.includes('.amazonaws.com/')) {
            s3Key = imageUrl.split('.amazonaws.com/')[1];
        } else if (imageUrl.startsWith('subcategory_images/')) {
            // Already a key
            s3Key = imageUrl;
        } else {
            return res.status(400).json({ message: 'Invalid S3 URL format' });
        }

        if (!s3Key) {
            return res.status(400).json({ message: 'Could not extract S3 key from URL' });
        }

        // Generate presigned URL for GET operation (30 minutes expiry for public access)
        const params = {
            Bucket: S3_BUCKET,
            Key: s3Key,
            Expires: 1800 // 30 minutes for public access
        };
        
        const presignedUrl = await s3.getSignedUrlPromise('getObject', params);
        res.json({ url: presignedUrl, storage: 's3', expiresIn: 1800 });

    } catch (err) {
        console.error('Error generating public subcategory image presigned URL:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

/**
 * Get presigned URL to view subcategory image
 * GET /api/categories/subcategories/:subcategoryId/image/presign
 */
router.get('/subcategories/:subcategoryId/image/presign', verifyToken, async (req, res) => {
    try {
        const { subcategoryId } = req.params;

        if (!S3_BUCKET) {
            return res.status(500).json({ message: 'S3 bucket not configured' });
        }

        // Get subcategory image URL
        const [subcategories] = await pool.query('SELECT image_url FROM subcategories WHERE id = ?', [subcategoryId]);
        if (subcategories.length === 0 || !subcategories[0].image_url) {
            return res.status(404).json({ message: 'Subcategory image not found' });
        }

        const imageUrl = subcategories[0].image_url;
        
        // Handle local files (legacy)
        if (imageUrl.startsWith('/uploads/') || imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            if (!imageUrl.includes('.amazonaws.com')) {
                // Local file or external URL - return as is
                return res.json({ url: imageUrl, storage: 'local' });
            }
        }
        
        // Extract S3 key from URL - handle different URL formats
        let s3Key;
        if (imageUrl.includes('.amazonaws.com/')) {
            s3Key = imageUrl.split('.amazonaws.com/')[1];
        } else if (imageUrl.startsWith('subcategory_images/')) {
            // Already a key
            s3Key = imageUrl;
        } else {
            return res.status(400).json({ message: 'Invalid S3 URL format' });
        }

        if (!s3Key) {
            return res.status(400).json({ message: 'Could not extract S3 key from URL' });
        }

        // Generate presigned URL for GET operation (5 minutes expiry)
        const params = {
            Bucket: S3_BUCKET,
            Key: s3Key,
            Expires: 300
        };
        
        const presignedUrl = await s3.getSignedUrlPromise('getObject', params);
        res.json({ url: presignedUrl, storage: 's3', expiresIn: 300 });

    } catch (err) {
        console.error('Error generating view presigned URL:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;