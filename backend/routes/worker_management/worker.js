const express = require('express');
const router = express.Router();
const WorkerService = require('../../services/worker.service');
const verifyToken = require('../middlewares/verify_token');
const authorizeRole = require('../middlewares/authorizeRole');

// ------------------------
// Worker Registration Route
// ------------------------
router.post('/worker/register', async (req, res) => {
  const { firstName, lastName, email, phone, password, role, providerData } = req.body;
  
  // Validate required fields
  if (!firstName || !lastName || !email || !password || !providerData) {
    return res.status(400).json({ 
      message: 'Missing required fields',
      required: ['firstName', 'lastName', 'email', 'password', 'providerData']
    });
  }
  
  // Validate provider data
  const requiredProviderFields = ['experience_years', 'bio', 'service_radius_km', 'location_lat', 'location_lng'];
  const missingProviderFields = requiredProviderFields.filter(field => 
    providerData[field] === undefined || providerData[field] === null
  );
  
  if (missingProviderFields.length > 0) {
    return res.status(400).json({ 
      message: 'Missing required provider fields',
      missingFields: missingProviderFields
    });
  }
  
  try {
    console.log('Worker registration attempt:', { email, firstName, lastName, hasProviderData: !!providerData });
    
    const result = await WorkerService.registerWorker({
      firstName,
      lastName,
      email,
      phone,
      password,
      providerData
    });
    
    console.log('Worker registration successful:', { userId: result.user.id, email });
    
    res.status(201).json({
      message: 'Worker registered successfully',
      ...result
    });
    
  } catch (error) {
    console.error('Worker registration error:', error);
    
    if (error.message === 'Email already registered') {
      return res.status(409).json({ message: error.message });
    }
    
    if (error.message === 'Worker role not found in system') {
      return res.status(500).json({ message: 'System configuration error' });
    }
    
    res.status(500).json({ 
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ------------------------
// Get Worker Profile
// ------------------------
router.get('/worker/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Update last active timestamp
    await WorkerService.updateLastActive(userId);
    
    const profile = await WorkerService.getWorkerProfile(userId);
    
    res.json({
      message: 'Profile retrieved successfully',
      profile
    });
    
  } catch (error) {
    console.error('Get profile error:', error);
    
    if (error.message === 'Worker not found') {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ 
      message: 'Failed to retrieve profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ------------------------
// Update Worker Profile
// ------------------------
router.put('/worker/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;
    
    // Remove sensitive fields that shouldn't be updated via this endpoint
    const allowedFields = [
      'name', 'phone_number', 'experience_years', 'bio', 
      'service_radius_km', 'location_lat', 'location_lng', 'active'
    ];
    
    const filteredData = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        filteredData[key] = updateData[key];
      }
    });
    
    if (Object.keys(filteredData).length === 0) {
      return res.status(400).json({ 
        message: 'No valid fields to update',
        allowedFields
      });
    }
    
    console.log('Worker profile update:', { userId, fields: Object.keys(filteredData) });
    
    const updatedProfile = await WorkerService.updateWorkerProfile(userId, filteredData);
    
    res.json({
      message: 'Profile updated successfully',
      profile: updatedProfile
    });
    
  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.message === 'Worker not found') {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ 
      message: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ------------------------
// Get All Workers (Admin Only)
// ------------------------
router.get('/worker/all', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filters = {};
    
    // Parse filters from query params
    if (req.query.verified !== undefined) {
      filters.verified = req.query.verified === 'true';
    }
    
    if (req.query.active !== undefined) {
      filters.active = req.query.active === 'true';
    }
    
    if (req.query.location) {
      filters.location = true;
    }
    
    console.log('Admin fetching workers:', { page, limit, filters });
    
    const result = await WorkerService.getAllWorkers(page, limit, filters);
    
    res.json({
      message: 'Workers retrieved successfully',
      ...result
    });
    
  } catch (error) {
    console.error('Get all workers error:', error);
    
    res.status(500).json({ 
      message: 'Failed to retrieve workers',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ------------------------
// Get Specific Worker (Admin Only)
// ------------------------
router.get('/worker/:workerId', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const workerId = req.params.workerId;
    
    if (!workerId || isNaN(workerId)) {
      return res.status(400).json({ message: 'Invalid worker ID' });
    }
    
    const profile = await WorkerService.getWorkerProfile(parseInt(workerId));
    
    res.json({
      message: 'Worker profile retrieved successfully',
      profile
    });
    
  } catch (error) {
    console.error('Get worker by ID error:', error);
    
    if (error.message === 'Worker not found') {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ 
      message: 'Failed to retrieve worker profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ------------------------
// Update Worker Verification Status (Admin Only)
// ------------------------
router.patch('/worker/:workerId/verify', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const workerId = req.params.workerId;
    const { verified } = req.body;
    
    if (!workerId || isNaN(workerId)) {
      return res.status(400).json({ message: 'Invalid worker ID' });
    }
    
    if (typeof verified !== 'boolean') {
      return res.status(400).json({ message: 'Verified status must be a boolean' });
    }
    
    console.log('Admin updating worker verification:', { 
      workerId, 
      verified, 
      adminId: req.user.id 
    });
    
    const updatedProfile = await WorkerService.updateVerificationStatus(parseInt(workerId), verified);
    
    res.json({
      message: `Worker ${verified ? 'verified' : 'unverified'} successfully`,
      profile: updatedProfile
    });
    
  } catch (error) {
    console.error('Update verification status error:', error);
    
    if (error.message === 'Worker not found') {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ 
      message: 'Failed to update verification status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ------------------------
// Update Worker Activity Status (Admin Only)
// ------------------------
router.patch('/worker/:workerId/activity', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const workerId = req.params.workerId;
    const { active } = req.body;
    
    if (!workerId || isNaN(workerId)) {
      return res.status(400).json({ message: 'Invalid worker ID' });
    }
    
    if (typeof active !== 'boolean') {
      return res.status(400).json({ message: 'Active status must be a boolean' });
    }
    
    console.log('Admin updating worker activity:', { 
      workerId, 
      active, 
      adminId: req.user.id 
    });
    
    const updatedProfile = await WorkerService.updateWorkerProfile(parseInt(workerId), { active });
    
    res.json({
      message: `Worker ${active ? 'activated' : 'deactivated'} successfully`,
      profile: updatedProfile
    });
    
  } catch (error) {
    console.error('Update activity status error:', error);
    
    if (error.message === 'Worker not found') {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ 
      message: 'Failed to update activity status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ------------------------
// Worker Dashboard Stats
// ------------------------
router.get('/worker/dashboard/stats', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Update last active
    await WorkerService.updateLastActive(userId);
    
    // Get worker profile for basic stats
    const profile = await WorkerService.getWorkerProfile(userId);
    
    // Basic stats structure (expand as needed)
    const stats = {
      profile: {
        verified: profile.verified,
        active: profile.active,
        rating: parseFloat(profile.rating) || 0,
        experience_years: profile.experience_years,
        service_radius: profile.service_radius_km
      },
      // Placeholder for job-related stats
      jobs: {
        total: 0,
        completed: 0,
        pending: 0,
        cancelled: 0
      },
      earnings: {
        total: 0,
        thisMonth: 0,
        lastMonth: 0
      }
    };
    
    res.json({
      message: 'Dashboard stats retrieved successfully',
      stats
    });
    
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    
    res.status(500).json({ 
      message: 'Failed to retrieve dashboard stats',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;