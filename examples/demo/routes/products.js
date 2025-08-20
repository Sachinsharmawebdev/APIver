
module.exports = (req, res) => {
  res.json({ 
    version: 'v1', 
    products: ['laptop', 'phone'],
    count: 2
  });
};
