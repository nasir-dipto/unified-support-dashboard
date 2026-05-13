import { createApp } from './app.js';
import { getServerEnv, loadServerEnv } from './config/loadEnv.js';

loadServerEnv();
const app = createApp();
const env = getServerEnv();

app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${String(env.PORT)}`);
});
