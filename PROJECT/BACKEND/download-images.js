const fs = require('fs');
const path = require('path');
const https = require('https');

const queries = [
  { file: 'bread-omelette-2-eggs.webp', query: 'Omelette' },
  { file: 'idli-sambar-2pcs.webp', query: 'Idli' },
  { file: 'paneer-tikka-masala.webp', query: 'Paneer_tikka_masala' },
  { file: 'chicken-biryani.webp', query: 'Biryani' },
  { file: 'royal-vegetarian-thali.webp', query: 'Thali' },
  { file: 'butter-chicken.webp', query: 'Butter_chicken' },
  { file: 'chocolate-brownie.webp', query: 'Chocolate_brownie' },
  { file: 'cold-coffee-with-ice-cream.webp', query: 'Iced_coffee' },
  { file: 'virgin-mojito.webp', query: 'Mojito' }
];

const destFolder = 'd:\\Documents\\hotel\\PROJECT\\dbms project\\images';

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'BookBuddyApp/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirect = new URL(res.headers.location, url).href;
        return resolve(get(redirect));
      }
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => resolve(Buffer.concat(data)));
    }).on('error', reject);
  });
}

async function run() {
  for (const item of queries) {
    try {
      const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles=${item.query}`;
      const res = await get(apiUrl);
      const json = JSON.parse(res.toString());
      const pages = json.query.pages;
      const pageId = Object.keys(pages)[0];
      
      if (pageId !== '-1' && pages[pageId].original) {
        const imageUrl = pages[pageId].original.source;
        console.log(`Downloading ${item.query} from ${imageUrl}`);
        const imgBuffer = await get(imageUrl);
        fs.writeFileSync(path.join(destFolder, item.file), imgBuffer);
        console.log(`Saved ${item.file}`);
      } else {
        console.log(`No image found for ${item.query}`);
      }
    } catch (e) {
      console.error(`Failed ${item.query}:`, e.message);
    }
  }
}

run();
