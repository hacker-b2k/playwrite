// test-youtube-songs.js — YouTube pe 7 songs search karo
const { chromium } = require('./packages/playwright-core');

const songs = [
  'Tum Hi Ho Aashiqui 2',
  'Shape of You Ed Sheeran',
  'Kesariya Brahmastra',
  'Blinding Lights The Weeknd',
  'Raataan Lambiyan',
  'Believer Imagine Dragons',
  'Dil Diyan Gallan',
  'Levitating Dua Lipa',
  'Pasoori Ali Sethi',
  'Stay The Kid LAROI Justin Bieber',
  'Tera Ban Jaunga Kabir Singh',
  'Dynamite BTS',
  'Ae Dil Hai Mushkil',
  'As It Was Harry Styles',
  'Judaai Badlapur',
  'Peaches Justin Bieber',
  'Tere Bina Guru Randhawa',
  'Save Your Tears The Weeknd',
  'Kahani Suno Kaifi Khalil',
  'Heat Waves Glass Animals',
];

(async () => {
  console.log('🎵 YouTube 20 Songs Search Test\n');

  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const context = await browser.newContext();
  const page = await context.newPage();

  // YouTube open karo — fully load hone do
  console.log('🌐 YouTube open ho raha hai...');
  await page.goto('https://www.youtube.com', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];
    console.log(`\n🎵 [${i + 1}/20] Searching: "${song}"`);

    try {
      // Correct selector — visible search input
      const searchBox = page.locator('[name="search_query"]');
      await searchBox.waitFor({ state: 'visible', timeout: 10000 });

      // Click karke focus do
      await searchBox.click();
      await page.waitForTimeout(300);

      // Pehle clear karo
      await page.keyboard.press('Control+a');
      await page.keyboard.press('Backspace');
      await page.waitForTimeout(200);

      // Song ka naam type karo
      await searchBox.type(song, { delay: 60 });
      await page.waitForTimeout(400);

      // Enter dabao — search karo
      await page.keyboard.press('Enter');

      // Results aane ka wait karo
      await page.waitForURL('**/results**', { timeout: 10000 });
      await page.waitForTimeout(2000);

      // URL se confirm karo
      const url = page.url();
      const searchParam = new URL(url).searchParams.get('search_query');
      console.log(`  ✅ [${i + 1}/20] Searched: "${searchParam}" — Results loaded!`);

      // Thoda ruko next search se pehle
      await page.waitForTimeout(1500);

    } catch (e) {
      console.log(`  ❌ Error: ${e.message.split('\n')[0]}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ Saare 20 songs search complete!');
  console.log('🌐 Browser khula hai — dekho results');
  console.log('='.repeat(50));

  // Browser khula rehne do
  await new Promise(() => {});
})().catch(e => {
  console.error('❌ Fatal:', e.message);
  process.exit(1);
});
