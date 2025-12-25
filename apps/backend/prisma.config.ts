import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export default {
  datasource: {
    url: process.env.DATABASE_URL || process.env.DIRECT_URL,
  },
};
