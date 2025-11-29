import { main } from './src/index.js';

// デモを実行
main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
