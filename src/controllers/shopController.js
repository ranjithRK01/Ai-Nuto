const Shop = require('../models/shop');

const shopRegister = async (req, res) => {
  try {
    let { name, phone, shopName } = req.body;
    // Convert phone to string
    const phoneStr = phone.toString();
    // Take first 4 digits as password
    const password = phoneStr.slice(0, 4); 
    const userRegister = new Shop({
      shopName,
      name,
      phone,
      password,
    });
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be exactly 10 digits',
      });
    }
    const existingUser = await Shop.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Phone number already registered!',
      });
    }
    await userRegister.save();
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      userRegister,
    });
  } catch (error) {
    console.error('Error registering user:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: error,
    });
  }
};

const shopList = async (req, res) => {
  try {
    const shop = await Shop.find();
    res.status(200).json(shop);
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error,
    });
  }
};

module.exports = { shopRegister, shopList };
