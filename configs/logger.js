var winston = require('winston');

const logger = winston.createLogger({
  transports: [
    new winston.transports.File({ filename: 'ipn.log' })
  ]
});

module.exports = logger;