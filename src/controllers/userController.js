const User = require('../models/user');

const userRegister = async (req, res) => {
  try {
    let { name, phone, shopName } = req.body;
    // Convert phone to string
    const phoneStr = phone.toString();
    // Take first 4 digits as password
    const password = phoneStr.slice(0, 4);
    const userRegister = new User({
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
    const existingUser = await User.findOne({ phone });
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

const userList = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error,
    });
  }
};

module.exports = { userRegister, userList };
