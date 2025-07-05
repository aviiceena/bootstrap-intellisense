const fs = require('fs');
const path = require('path');

// Load bootstrap versions
const versionsPath = path.join(__dirname, '..', 'assets', 'bootstrap-versions.json');
const versionsData = JSON.parse(fs.readFileSync(versionsPath, 'utf8'));
const latestVersion = versionsData.v5[0];

// Load package.json
const packagePath = path.join(__dirname, '..', 'package.json');
const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Update the default version in the configuration properties
if (
  packageData.contributes &&
  packageData.contributes.configuration &&
  packageData.contributes.configuration.properties &&
  packageData.contributes.configuration.properties.bootstrapIntelliSense &&
  packageData.contributes.configuration.properties.bootstrapIntelliSense.properties
) {
  const bsVersionProp = packageData.contributes.configuration.properties.bootstrapIntelliSense.properties.bsVersion;

  if (bsVersionProp && bsVersionProp.default) {
    const oldVersion = bsVersionProp.default;
    bsVersionProp.default = latestVersion;

    // Write back to package.json
    fs.writeFileSync(packagePath, JSON.stringify(packageData, null, 2) + '\n');

    console.log(`✅ Updated Bootstrap version in package.json: ${oldVersion} → ${latestVersion}`);
  } else {
    console.log('⚠️  Could not find bsVersion default in package.json');
  }
} else {
  console.log('⚠️  Could not find configuration structure in package.json');
}
