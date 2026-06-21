const fs = require('fs');
const path = require('path');

const projectDir = 'd:\\Documents\\hotel\\PROJECT\\dbms project';
const homeHtmlPath = path.join(projectDir, 'home.html');

let homeHtml = fs.readFileSync(homeHtmlPath, 'utf8');

const replacements = {
  'Coromandel.jpg': 'taj-coromandel.jpg',
  'itc.webp': 'itc-hotel.jpg',
  'leela.jpg': 'the-leela-palace.jpg',
  'radision.jpg': 'Radisson Blu Hotel.jpg',
  'novotol.jpg': 'novotel.jpg',
  'sheraton.jpg': 'sheraton.jpg',
  'taj.jpg': 'taj-connemara.jpg',
  'the park.jpg': 'the-park.jpg',
  'trident.webp': 'trident.jpg',
  'ramada.jpg': 'ramada.jpg',
  'hol.webp': 'holiday-lnn.jpg'
};

for (const [oldImg, newImg] of Object.entries(replacements)) {
  const regex = new RegExp(`src="images/${oldImg}"`, 'g');
  homeHtml = homeHtml.replace(regex, `src="images/${newImg}"`);
}

fs.writeFileSync(homeHtmlPath, homeHtml);
console.log('home.html updated to use the same image paths as book.html (database)');

// Also ensure taj-coromandel.jpg exists
const imagesDir = path.join(projectDir, 'images');
const srcPath = path.join(imagesDir, 'Coromandel.jpg');
const dstPath = path.join(imagesDir, 'taj-coromandel.jpg');
if (fs.existsSync(srcPath) && !fs.existsSync(dstPath)) {
    fs.copyFileSync(srcPath, dstPath);
    console.log('Copied Coromandel.jpg to taj-coromandel.jpg');
}
