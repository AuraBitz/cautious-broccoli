const winston = require('winston');
const config = require('../config/Development');

const { combine, timestamp, printf, colorize, json } = winston.format;

const devFormat = printf(({ level, message, timestamp: ts, ...meta }) => {
  const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${ts} [${level}]: ${message}${extra}`;
});

const logger = winston.createLogger({
  level: config.log.level,
  defaultMeta: { service: 'backend' },
  transports: [
    new winston.transports.Console({
      format:
        config.env === 'production'
          ? combine(timestamp(), json())
          : combine(colorize(), timestamp(), devFormat),
    }),
  ],
});

module.exports = logger;
