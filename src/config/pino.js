const pino = require('pino');

const colors = {
  trace: '\x1b[90m',
  debug: '\x1b[37m',
  info: '\x1b[32m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  fatal: '\x1b[31m\x1b[1m',
  reset: '\x1b[0m'
};

const prettyStream = {
  write(chunk) {
    const data = JSON.parse(chunk.toString());

    const levelColor = colors[data.level] || colors.reset;
    const time = new Date(data.time).toISOString().split('.')[0].replace('T', ' ');
    const level = data.level.toUpperCase().padStart(5);
    const msg = data.msg;

    const context = Object.keys(data)
      .filter(k => !['level', 'time', 'msg'].includes(k))
      .reduce((acc, k) => {
        acc[k] = data[k];
        return acc;
      }, {});

    console.log(`${levelColor}[${time}] ${level} ${colors.reset}: ${msg}`);

    if (Object.keys(context).length > 0) {
      console.log(`    ${JSON.stringify(context, null, 2).replace(/\n/g, '\n    ')}`);
    }
  }
};
const logger = pino(
  {
    level: 'trace',
    base: {},
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
  },
  prettyStream
);

module.exports = logger;