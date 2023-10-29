const dotenv = require('dotenv');
const mongoose = require('mongoose');

process.on('uncaughtException', (error) => {
  process.exit(1);
});

dotenv.config({
  path: './config.env',
});

const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(() => {});

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Server is live, PORT[${port}]`);
});

process.on('unhandledRejection', (error) => {
  console.log('uncaught rejection shutting down');
  console.log(error, error.name, error.message);
  server.close(() => process.exit(1));
});
