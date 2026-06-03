const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const { startServer } = require('./src/app');

startServer();
