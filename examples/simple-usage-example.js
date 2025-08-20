const express = require('express');
const { versionMiddleware } = require('../lib/smartVersionMiddleware');

const app = express();

// Your controllers
const userController = {
  getUserDetails: (req, res) => {
    const version = req.apiVersion; // Automatically set by middleware
    
    if (version === 'v1') {
      res.json({ id: 1, name: 'John' });
    } else if (version === 'v2') {
      res.json({ id: 1, name: 'John', email: 'john@example.com', premium: true });
    }
  }
};

// Your router
const userRoute = express.Router();
userRoute.get('/', (req, res) => {
  res.json({ 
    version: req.apiVersion,
    message: `Hello from ${req.apiVersion} router!` 
  });
});

// Usage exactly as you requested:

// 1. Direct controller call
app.get("/user", versionMiddleware(["v1","v2"], userController.getUserDetails));

// 2. Router forwarding  
app.use("/user-route", versionMiddleware(["v1","v2"], userRoute));

// 3. With path parameter
app.get("/api/:version/user", versionMiddleware(["v1","v2"], userController.getUserDetails));

app.listen(3000, () => {
  console.log('🚀 Simple Usage Example Running on port 3000');
  console.log('\n📋 Test these URLs:');
  console.log('Path:   GET /api/v1/user');
  console.log('Header: GET /user (with x-api-version: v1)');
  console.log('Query:  GET /user?version=v2');
  console.log('Router: GET /user-route?version=v1');
});