// test-ai.js — Tests all AI methods: aiDo, aiAsk, aiExtract, aiScreenshot
const { chromium } = require('./packages/playwright-core');

(async () => {
  console.log('🚀 Starting AI browser tests...\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // ── Test 1: aiAsk ────────────────────────────────────────
  console.log('📋 Test 1: page.aiAsk()');
  await page.goto('https://example.com');
  try {
    const answer = await page.aiAsk('What is the main heading on this page?');
    console.log('  ✅ aiAsk result:', answer);
  } catch (e) {
    console.log('  ❌ aiAsk failed:', e.message);
  }

  // ── Test 2: aiExtract ────────────────────────────────────
  console.log('\n📋 Test 2: page.aiExtract()');
  try {
    const data = await page.aiExtract({ heading: 'string', description: 'string' });
    console.log('  ✅ aiExtract result:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.log('  ❌ aiExtract failed:', e.message);
  }

  // ── Test 3: aiScreenshot ─────────────────────────────────
  console.log('\n📋 Test 3: page.aiScreenshot()');
  try {
    const desc = await page.aiScreenshot('Describe what you see on this page briefly');
    console.log('  ✅ aiScreenshot result:', desc);
  } catch (e) {
    console.log('  ❌ aiScreenshot failed:', e.message);
  }

  // ── Test 4: aiDo ─────────────────────────────────────────
  console.log('\n📋 Test 4: page.aiDo()');
  try {
    const result = await page.aiDo('Click on the "More information..." link');
    console.log('  ✅ aiDo result:', JSON.stringify(result));
  } catch (e) {
    console.log('  ❌ aiDo failed:', e.message);
  }

  await browser.close();
  console.log('\n✅ All tests complete!');
})().catch(e => {
  console.error('\n❌ Fatal error:', e.message);
  process.exit(1);
});
