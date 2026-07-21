require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');

const menuItems = [
  // Snacks
  {
    name: 'Crispy French Fries',
    description: 'Golden salted potato fries served with tomato ketchup.',
    price: 80,
    category: 'Snacks',
    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=60',
    isVeg: true,
  },
  {
    name: 'Tandoori Paneer Tikka',
    description: 'Cottage cheese cubes marinated in spices, grilled in tandoor.',
    price: 160,
    category: 'Snacks',
    image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500&auto=format&fit=crop&q=60',
    isVeg: true,
  },
  {
    name: 'Classic Potato Samosa (2 pcs)',
    description: 'Flaky pastry filled with spiced potato and peas, served with sweet & sour chutney.',
    price: 40,
    category: 'Snacks',
    image: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500&auto=format&fit=crop&q=60',
    isVeg: true,
  },
  {
    name: 'Veg Spring Rolls',
    description: 'Crispy rolls filled with shredded sautéed vegetables, served with chili dip.',
    price: 90,
    category: 'Snacks',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=60',
    isVeg: true,
  },
  {
    name: 'Hot Chilli Chicken Wings',
    description: 'Juicy chicken wings glazed with hot peri peri spices and herbs.',
    price: 180,
    category: 'Snacks',
    image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=500&auto=format&fit=crop&q=60',
    isVeg: false,
  },

  // Beverages
  {
    name: 'Vanilla Iced Latte',
    description: 'Rich espresso combined with milk and vanilla syrup over ice.',
    price: 95,
    category: 'Beverages',
    image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&auto=format&fit=crop&q=60',
    isVeg: true,
  },
  {
    name: 'Fresh Mint Lime Soda',
    description: 'Refreshing lemon juice, mint leaves, sparkling soda, and ice.',
    price: 60,
    category: 'Beverages',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60',
    isVeg: true,
  },
  {
    name: 'Sweet Mango Lassi',
    description: 'Traditional Punjabi sweet yogurt drink flavored with mango pulp.',
    price: 70,
    category: 'Beverages',
    image: 'https://images.unsplash.com/photo-1534353436294-0dbd4bdac845?w=500&auto=format&fit=crop&q=60',
    isVeg: true,
  },
  {
    name: 'Adrak Masala Chai',
    description: 'Traditional Indian tea infused with ginger, cardamom, and secret spices.',
    price: 30,
    category: 'Beverages',
    image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=60',
    isVeg: true,
  },

  // Main Course
  {
    name: 'Butter Chicken Masala',
    description: 'Tender chicken cooked in rich, creamy tomato butter gravy.',
    price: 240,
    category: 'Main Course',
    image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=60',
    isVeg: false,
  },
  {
    name: 'Paneer Butter Masala',
    description: 'Soft cottage cheese cubes cooked in rich, sweet tomato creamy gravy.',
    price: 200,
    category: 'Main Course',
    image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop&q=60',
    isVeg: true,
  },
  {
    name: 'Hakka Veg Noodles',
    description: 'Stir-fried noodles with crunch vegetables and house soy sauce.',
    price: 120,
    category: 'Main Course',
    image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop&q=60',
    isVeg: true,
  },
  {
    name: 'Double Cheese Hamburger',
    description: 'Flame-grilled double beef/chicken patty loaded with cheese and lettuce.',
    price: 150,
    category: 'Main Course',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60',
    isVeg: false,
  },
  {
    name: 'Margherita Garlic Pizza',
    description: 'Thin crust topped with classic Italian marinara, fresh mozzarella, and basil.',
    price: 190,
    category: 'Main Course',
    image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=500&auto=format&fit=crop&q=60',
    isVeg: true,
  },

  // Combos
  {
    name: 'Deluxe Veg Thali',
    description: 'Paneer Butter Masala, Dal Makhani, Veg Sabji, 2 Roti, Jeera Rice, Salad, and Gulab Jamun.',
    price: 220,
    category: 'Combos',
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=60',
    isVeg: true,
  },
  {
    name: 'Burger & Fries Combo',
    description: 'Double Cheese Burger served with a side of Crispy French Fries and an iced drink.',
    price: 210,
    category: 'Combos',
    image: 'https://images.unsplash.com/photo-1610614819513-58e34989848b?w=500&auto=format&fit=crop&q=60',
    isVeg: false,
  },

  // Desserts
  {
    name: 'Sizzling Chocolate Brownie',
    description: 'Warm, gooey chocolate fudge brownie loaded with chocolate chips.',
    price: 110,
    category: 'Desserts',
    image: 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=500&auto=format&fit=crop&q=60',
    isVeg: true,
  },
  {
    name: 'Gulab Jamun (2 pcs)',
    description: 'Soft melt-in-the-mouth fried dumplings soaked in cardamom rose sugar syrup.',
    price: 50,
    category: 'Desserts',
    image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=60',
    isVeg: true,
  },
];

const seedDatabase = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Database connected for seeding...');

    // Clear existing data
    const Category = require('../models/Category');
    try {
      await mongoose.connection.db.dropCollection('categories');
      console.log('Dropped stale categories collection.');
    } catch (e) {}
    try {
      await mongoose.connection.db.dropCollection('users');
      console.log('Dropped stale users collection.');
    } catch (e) {}
    try {
      await mongoose.connection.db.dropCollection('menuitems');
      console.log('Dropped stale menuitems collection.');
    } catch (e) {}
    try {
      await mongoose.connection.db.dropCollection('orders');
      console.log('Dropped stale orders collection.');
    } catch (e) {}
    console.log('Cleared existing database entries.');

    // Seed Categories
    const categories = [
      { name: 'Snacks', description: 'Quick bites and tasty appetizers.', icon: 'Pizza', order: 1 },
      { name: 'Beverages', description: 'Refreshments, soda, teas, and coffee.', icon: 'Coffee', order: 2 },
      { name: 'Main Course', description: 'Hearty full meals, burgers, and pizzas.', icon: 'Utensils', order: 3 },
      { name: 'Combos', description: 'Discounted meal bundles and special thalis.', icon: 'Percent', order: 4 },
      { name: 'Desserts', description: 'Sweet treats, ice creams, and baked goods.', icon: 'IceCream', order: 5 },
    ];
    await Category.insertMany(categories);
    console.log('Seeded default categories.');

    // Seed Staff User
    await User.create({
      username: 'staff',
      password: 'staff123',
      name: 'Canteen Desk Staff',
      role: 'staff',
    });
    console.log(`Seeded Staff User: username = staff, password = staff123`);

    // Seed Admin User
    await User.create({
      username: 'admin',
      password: 'admin123',
      name: 'Admin Manager',
      role: 'admin',
    });
    console.log(`Seeded Admin User: username = admin, password = admin123`);

    // Seed Menu Items
    const seededMenuItems = await MenuItem.insertMany(menuItems);
    console.log(`Seeded ${seededMenuItems.length} Menu Items successfully!`);

    mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error(`Error during seeding: ${error.message}`);
    process.exit(1);
  }
};

seedDatabase();
