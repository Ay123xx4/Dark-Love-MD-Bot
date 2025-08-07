require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose'); // ✅ This line was missing
const path = require('path');
const bodyParser = require('body-parser');

const authRoutes = require('./routes/auth');
const botRoutes = require('./routes/bots');
