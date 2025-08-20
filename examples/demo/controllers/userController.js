
module.exports = {
  userDetailsAccess: (req, res) => {
    res.json({ 
      version: 'v2', 
      userDetails: { 
        id: parseInt(req.params.id) || 1, 
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin',
        lastLogin: new Date().toISOString()
      } 
    });
  }
};
