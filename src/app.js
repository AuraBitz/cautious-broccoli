const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const config = require('./config/Development');
const connectivity = require('./connectivity');
const createRoutes = require('./routes/create-routes');
const { requestContextMiddleware } = require('./middleware/request-context');
const requestLoggerMiddleware = require('./middleware/request-logger');
const errorHandlerMiddleware = require('./middleware/error-handler');
const controller = require('./controller');
const logger = require('./logger');

const createApp = () => {
  const app = express();

  app.set('trust proxy', true);
  app.use(helmet());
  app.use(
    cors({
      origin: config.cors.origin,
      credentials: config.cors.credentials,
    })
  );
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan('dev'));
  app.use(requestContextMiddleware);
  app.use(requestLoggerMiddleware);

  app.use('/api', createRoutes());
  app.use(controller.notFound);
  app.use(errorHandlerMiddleware);

  return app;
};

const startServer = async () => {
  try {
    await connectivity.postgres.connect();
    const app = createApp();
    app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`, {
        env: config.env,
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { message: error.message });
    process.exit(1);
  }
};

module.exports = { createApp, startServer };
