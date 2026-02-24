const tenantMiddleware = (req, res, next) => {
  try {
    // Extract tenantId from JWT token (from authMiddleware)
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(403).json({
        success: false,
        message: 'No tenantId found in token',
      });
    }

    // Attach tenantId to request for use in queries
    req.tenantId = tenantId;
    
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error in tenant middleware',
      error: error.message,
    });
  }
};

module.exports = tenantMiddleware;
