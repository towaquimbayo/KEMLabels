module.exports = (...args) => {
  if (process.env.NODE_ENV !== 'prod') {
    console.log(...args);
  }
};