const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir);
}

// Path to the source logo image
const sourceLogoPath = path.join(iconsDir, 'logo.png');

// Function to create resized icons from the source logo
async function createResizedIcon(size) {
  try {
    const image = await Jimp.read(sourceLogoPath);
    image.resize(size, size); // Redimensiona para o tamanho desejado
    return image.getBufferAsync(Jimp.MIME_PNG);
  } catch (error) {
    console.error(`Error creating icon of size ${size}:`, error);
    throw error;
  }
}

// Create different icon sizes
const sizes = [16, 48, 128];

(async () => {
  for (const size of sizes) {
    try {
      const icon = await createResizedIcon(size);
      fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), icon);
      console.log(`Created icon${size}.png from logo.png`);
    } catch (error) {
      console.error(`Failed to create icon${size}.png:`, error.message);
    }
  }
  console.log('Icons creation process finished!');
})();
