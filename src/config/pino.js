import pino from 'pino';

const isProd = true;

const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'trace',
    base: {},
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
  },
  isProd
    ? undefined
    : pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          levelFirst: false,
          translateTime: 'yyyy-mm-dd HH:MM:ss',
          ignore: 'pid,hostname',
        },
      })
);

export default logger;