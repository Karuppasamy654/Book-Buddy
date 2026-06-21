const fs = require('fs');
const path = require('path');

const projectDir = 'd:\\Documents\\hotel\\PROJECT\\dbms project';
const imagesDir = path.join(projectDir, 'images');
const defaultFood = path.join(imagesDir, 'default-food.svg');

// List of all reported missing images
const missingImages = [
  'chicken biriyani.webp', 'mutton biriyani.webp', 'paneer tikka.webp', 
  'veg biriyani.webp', 'mini lunch.webp', 'idli.jpg', 'dosa.webp', 
  'bread omlete.webp', 'pongal.webp', 'poori.jpg', 'veg fried rice.webp', 
  'chicken fried rice.webp', 'tandoori roti.webp', 'butter naan.webp', 
  'dal tadka.webp', 'chicken curry.webp', 'chai.webp', 'water bottle.webp', 
  'coffee.webp', 'tea.webp', 'lemon soda.webp', 'milk.webp', 'butter milk.webp', 
  'rose milk.webp', 'kesari.webp', 'payasam.webp', 'ice cream.webp'
];

// Create missing images as copies of default-food.svg
for (const img of missingImages) {
  const targetPath = path.join(imagesDir, img);
  if (!fs.existsSync(targetPath)) {
    fs.copyFileSync(defaultFood, targetPath);
    console.log(`Created placeholder for ${img}`);
  }
}

// Fix food.html paths
const foodHtmlPath = path.join(projectDir, 'food.html');
let foodHtml = fs.readFileSync(foodHtmlPath, 'utf8');

// Replace src="filename" with src="images/filename"
for (const img of missingImages) {
  // Replace instances where it's missing the images/ prefix
  const regex = new RegExp(`src="${img}"`, 'g');
  foodHtml = foodHtml.replace(regex, `src="images/${img}"`);
}

fs.writeFileSync(foodHtmlPath, foodHtml);
console.log('Fixed paths in food.html');
