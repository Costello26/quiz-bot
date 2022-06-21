// eslint-disable-next-line no-undef
module.exports = {
  apps : [{
    name: 'oprosnik_bot',
    script: 'app.js',
    watch: '.'
  }, {
    script: './service-worker/',
    watch: ['./service-worker']
  }]
};
