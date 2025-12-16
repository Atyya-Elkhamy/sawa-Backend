const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Item = require('../models/item.model');

dotenv.config();
const { MONGODB_URL } = process.env;

const seedItems = async () => {
  await mongoose.connect(MONGODB_URL);

  // Define base URLs
  const baseUrl = 'https://app.sawalive.live/';
  const fullUrl = `${baseUrl}public/items`;

  // Define item types
  const itemTypes = {
    frame: 'frame',
    wing: 'wing',
  };

  // Define store seed data
  const storeSeedData = [
    // Frames
    {
      name: 'VIP1 Frame',
      type: itemTypes.frame,
      price: 100,
      file: `${fullUrl}/vip_items/files/frame/VIP1.svga`,
      image: `${fullUrl}/vip_items/images/frame/VIP1.png`,
      description: 'VIP level 1 frame.',
      vipLevel: '1',
      vipOnly: true,
    },
    {
      name: 'VIP2 Frame',
      type: itemTypes.frame,
      price: 120,
      file: `${fullUrl}/vip_items/files/frame/VIP2.svga`,
      image: `${fullUrl}/vip_items/images/frame/VIP2.png`,
      description: 'VIP level 2 frame.',
      vipLevel: '2',
      vipOnly: true,
    },
    {
      name: 'VIP3 Frame',
      type: itemTypes.frame,
      price: 140,
      file: `${fullUrl}/vip_items/files/frame/VIP3.svga`,
      image: `${fullUrl}/vip_items/images/frame/VIP3.png`,
      description: 'VIP level 3 frame.',
      vipLevel: '3',
      vipOnly: true,
    },
    {
      name: 'VIP4 Frame',
      type: itemTypes.frame,
      price: 160,
      file: `${fullUrl}/vip_items/files/frame/VIP4.svga`,
      image: `${fullUrl}/vip_items/images/frame/VIP4.png`,
      description: 'VIP level 4 frame.',
      vipLevel: '4',
      vipOnly: true,
    },
    {
      name: 'VIP5 Frame',
      type: itemTypes.frame,
      price: 180,
      file: `${fullUrl}/vip_items/files/frame/VIP5.svga`,
      image: `${fullUrl}/vip_items/images/frame/VIP5.png`,
      description: 'VIP level 5 frame.',
      vipLevel: '5',
      vipOnly: true,
    },
    {
      name: 'VIP6 Frame',
      type: itemTypes.frame,
      price: 200,
      file: `${fullUrl}/vip_items/files/frame/VIP6.svga`,
      image: `${fullUrl}/vip_items/images/frame/VIP6.png`,
      description: 'VIP level 6 frame.',
      vipLevel: '6',
      vipOnly: true,
    },
    {
      name: 'VIP7 Frame',
      type: itemTypes.frame,
      price: 220,
      file: `${fullUrl}/vip_items/files/frame/VIP7.svga`,
      image: `${fullUrl}/vip_items/images/frame/VIP7.png`,
      description: 'VIP level 7 frame.',
      vipLevel: '7',
      vipOnly: true,
    },

    // wing
    {
      name: 'VIP1 wing',
      type: itemTypes.wing,
      price: 150,
      file: `${fullUrl}/vip_items/files/wing/namecard_vip1.svga`,
      image: `${fullUrl}/vip_items/images/wing/namecard_vip1.png`,
      description: 'VIP level 1 wing.',
      vipLevel: '1',
      vipOnly: true,
    },
    {
      name: 'VIP2 wing',
      type: itemTypes.wing,
      price: 170,
      file: `${fullUrl}/vip_items/files/wing/namecard_vip2.svga`,
      image: `${fullUrl}/vip_items/images/wing/namecard_vip2.png`,
      description: 'VIP level 2 wing.',
      vipLevel: '2',
      vipOnly: true,
    },
    {
      name: 'VIP3 wing',
      type: itemTypes.wing,
      price: 190,
      file: `${fullUrl}/vip_items/files/wing/namecard_vip3.svga`,
      image: `${fullUrl}/vip_items/images/wing/namecard_vip3.png`,
      description: 'VIP level 3 wing.',
      vipLevel: '3',
      vipOnly: true,
    },
    {
      name: 'VIP4 wing',
      type: itemTypes.wing,
      price: 210,
      file: `${fullUrl}/vip_items/files/wing/namecard_vip4.svga`,
      image: `${fullUrl}/vip_items/images/wing/namecard_vip4.png`,
      description: 'VIP level 4 wing.',
      vipLevel: '4',
      vipOnly: true,
    },
    {
      name: 'VIP5 wing',
      type: itemTypes.wing,
      price: 230,
      file: `${fullUrl}/vip_items/files/wing/namecard_vip5.svga`,
      image: `${fullUrl}/vip_items/images/wing/namecard_vip5.png`,
      description: 'VIP level 5 wing.',
      vipLevel: '5',
      vipOnly: true,
    },
    {
      name: 'VIP6 wing',
      type: itemTypes.wing,
      price: 250,
      file: `${fullUrl}/vip_items/files/wing/namecard_vip6.svga`,
      image: `${fullUrl}/vip_items/images/wing/namecard_vip6.png`,
      description: 'VIP level 6 wing.',
      vipLevel: '6',
      vipOnly: true,
    },
    {
      name: 'VIP7 wing',
      type: itemTypes.wing,
      price: 270,
      file: `${fullUrl}/vip_items/files/wing/namecard_vip7.svga`,
      image: `${fullUrl}/vip_items/images/wing/namecard_vip7.png`,
      description: 'VIP level 7 wing.',
      vipLevel: '7',
      vipOnly: true,
    },
  ];

  // Insert items into the database
  await Item.insertMany(storeSeedData);

  // Close the database connection
  mongoose.connection.close();
  console.log('Database connection closed and items seeded successfully');
};

seedItems().catch((error) => {
  console.error('Error seeding data:', error);
  mongoose.connection.close();
});
