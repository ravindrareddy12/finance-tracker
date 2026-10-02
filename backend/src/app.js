const express = require('express');
const cors    = require('cors');

const routes       = require('./routes');
const notFound     = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', 'loopback'); // behind nginx

app.use(cors());
app.use(express.json({ limit: '10mb' })); // backups carry a user's full portfolio

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
