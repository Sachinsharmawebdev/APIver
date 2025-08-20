
module.exports = {
  get: (req, res) => {
    res.json({ 
      version: 'v2', 
      users: ['alice', 'bob', 'charlie'],
      total: 3,
      timestamp: new Date().toISOString()
    });
  },
  post: (req, res) => {
    res.json({ 
      version: 'v2', 
      message: 'User created with enhanced validation',
      data: req.body,
      validated: true
    });
  }
};
