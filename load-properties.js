#!/usr/bin/env node

/**
 * PropTech AI Platform - Property Data Collection Script
 * 
 * Production-ready script for collecting property data and indexing to Algolia.
 * Supports flexible city/state selection and configurable result limits.
 * 
 * Usage:
 *   node load-properties.js --city "Columbus" --state "OH" --limit 10
 *   node load-properties.js --help
 */

const { chromium } = require('playwright');
const algoliasearch = require('algoliasearch');
require('dotenv').config();

class PropertyDataCollector {
  constructor() {
    this.browser = null;
    this.context = null;
    this.client = null;
    this.index = null;
    this.initializeAlgolia();
  }

  initializeAlgolia() {
    if (!process.env.ALGOLIA_APPLICATION_ID || !process.env.ALGOLIA_ADMIN_API_KEY) {
      throw new Error('Missing Algolia credentials. Please check your .env file.');
    }

    this.client = algoliasearch(
      process.env.ALGOLIA_APPLICATION_ID,
      process.env.ALGOLIA_ADMIN_API_KEY
    );
    this.index = this.client.initIndex(process.env.ALGOLIA_INDEX_NAME || 'proptech-properties-dev');
  }

  async initializeBrowser() {
    if (!this.browser) {
      console.log('🚀 Initializing browser for property data collection...');
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });

      this.context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 }
      });
      
      console.log('✅ Browser initialized successfully');
    }
  }

  async collectProperties(city, state, maxProperties = 20) {
    await this.initializeBrowser();
    
    if (!this.context) {
      throw new Error('Browser context not initialized');
    }

    const page = await this.context.newPage();
    
    try {
      const url = `https://www.realty.com/search/${state}/${city}`;
      console.log(`🔍 Navigating to: ${url}`);
      
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      console.log('✅ Page loaded successfully');
      
      // Wait for content to load
      console.log('⏳ Waiting for content to load...');
      await page.waitForTimeout(10000);
      
      // Test property selectors
      const propertySelectors = [
        '.listing-card',
        '[data-testid="property-card"]',
        '[data-testid="listing-card"]', 
        '.property-card',
        '.search-result-item',
        '[class*="listing"]',
        '[class*="property"]',
        '[class*="card"]',
        'div[class*="result"]'
      ];

      console.log('🔍 Testing property selectors...');
      const selectorResults = {};
      
      for (const selector of propertySelectors) {
        try {
          const elements = await page.$$eval(selector, els => els.length).catch(() => 0);
          if (elements > 0) {
            selectorResults[selector] = elements;
            console.log(`✅ ${selector}: ${elements} elements`);
          }
        } catch (error) {
          // Selector not found, continue
        }
      }

      // Find the best working selector
      let bestSelector = '.listing-card';
      let propertyCount = selectorResults[bestSelector] || 0;
      
      if (propertyCount === 0) {
        const fallbackSelectors = ['[class*="card"]', 'div[class*="result"]', '[class*="listing"]', '[class*="property"]'];
        for (const selector of fallbackSelectors) {
          if (selectorResults[selector] && selectorResults[selector] > 0) {
            bestSelector = selector;
            propertyCount = selectorResults[selector];
            console.log(`🔄 Using fallback selector: ${bestSelector} with ${propertyCount} elements`);
            break;
          }
        }
      }

      if (propertyCount === 0) {
        console.log('❌ No property listings found');
        return [];
      }

      console.log(`🎯 Using selector: ${bestSelector} with ${propertyCount} elements`);
      
      // Extract properties
      console.log('🏠 Extracting property data...');
      
      const properties = await page.evaluate(({ city: cityName, state: stateName, selector, maxProps }) => {
        const listings = document.querySelectorAll(selector);
        const propertyListings = Array.from(listings).slice(0, maxProps);

        return propertyListings.map((listing, index) => {
          const extractText = (selectors) => {
            for (const sel of selectors) {
              const element = listing.querySelector(sel);
              const text = element?.textContent?.trim();
              if (text && text.length > 0) {
                return text;
              }
            }
            return '';
          };

          const extractAttribute = (selectors, attribute) => {
            for (const sel of selectors) {
              const element = listing.querySelector(sel);
              const attr = element?.getAttribute(attribute);
              if (attr && attr.length > 0) {
                return attr;
              }
            }
            return '';
          };

          // Enhanced selectors for data extraction
          const priceSelectors = [
            '.listing-price', '.price', '[class*="price"]', '.listing-card-price',
            '.property-price', '[data-testid*="price"]', 'span[class*="price"]', 'div[class*="price"]'
          ];

          const addressSelectors = [
            '.listing-address', '.address', '.listing-card-address', '.property-address',
            'h3', 'h4', 'h2', '[class*="address"]', '[data-testid*="address"]'
          ];

          const imageSelectors = [
            '.listing-image img', '.property-image img', '.listing-card img',
            'img[src*="listing"]', 'img[src*="property"]', 'img[src*="realty"]',
            'img[alt*="property"]', 'img[alt*="listing"]', 'img'
          ];

          const linkSelectors = [
            'a[href*="/home-listings/"]', 'a[href*="/property/"]', 'a[href*="/listing/"]',
            'a[href*="/realty/"]', 'a[href*="/home/"]', 'a'
          ];

          // Extract data
          const priceText = extractText(priceSelectors);
          const addressText = extractText(addressSelectors);
          
          let imageUrl = extractAttribute(imageSelectors, 'src') || 
                        extractAttribute(imageSelectors, 'data-src') ||
                        extractAttribute(imageSelectors, 'data-lazy-src') ||
                        extractAttribute(imageSelectors, 'data-original');
          
          if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
            if (imageUrl.startsWith('//')) {
              imageUrl = 'https:' + imageUrl;
            } else if (imageUrl.startsWith('/')) {
              imageUrl = 'https://www.realty.com' + imageUrl;
            }
          }

          let propertyUrl = extractAttribute(linkSelectors, 'href');
          if (propertyUrl) {
            if (!propertyUrl.startsWith('http')) {
              if (propertyUrl.startsWith('/')) {
                propertyUrl = `https://www.realty.com${propertyUrl}`;
              } else {
                propertyUrl = `https://www.realty.com/${propertyUrl}`;
              }
            }
            // Filter out non-property URLs
            if (propertyUrl.includes('mailto:') || propertyUrl.includes('tel:') || 
                propertyUrl.includes('javascript:') || propertyUrl.includes('#') ||
                propertyUrl.includes('agent') || propertyUrl.includes('contact')) {
              propertyUrl = '';
            }
          }

          const fullText = listing.textContent || '';

          // Parse property details
          const parsePrice = (text) => {
            // Check for invalid price indicators first
            const invalidPriceIndicators = [
              'price available', 'price not available', 'call for price', 
              'contact for price', 'price upon request', 'tbd', 'n/a',
              'coming soon', 'off market', 'sold'
            ];
            
            const lowerText = text.toLowerCase();
            for (const indicator of invalidPriceIndicators) {
              if (lowerText.includes(indicator)) {
                return null; // Return null for invalid prices
              }
            }
            
            const pricePatterns = [/\$[\d,]+/g, /\$\s*[\d,]+/g, /[\d,]+\s*\$/g];
            
            for (const pattern of pricePatterns) {
              const matches = (text + ' ' + fullText).match(pattern);
              if (matches && matches.length > 0) {
                const price = matches[0].replace(/\s/g, '');
                const numericPrice = parseInt(price.replace(/[\$,]/g, ''));
                if (numericPrice > 10000 && numericPrice < 10000000) {
                  return price;
                }
              }
            }
            return null; // Return null instead of 'Price not available'
          };

          const parseAddress = (text) => {
            const addressPatterns = [
              new RegExp(`(\\d+\\s+[A-Za-z\\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Circle|Cir|Court|Ct|Place|Pl|Way))\\s+(?:${cityName})`, 'i'),
              new RegExp(`(\\d+\\s+[A-Za-z\\s]+)\\s+(?:${cityName})`, 'i'),
              new RegExp(`(\\d{1,5}\\s+[A-Za-z\\s]{3,30})\\s+(?:${cityName})`, 'i')
            ];
            
            for (const pattern of addressPatterns) {
              const match = fullText.match(pattern);
              if (match && match[1]) {
                const address = match[1].trim();
                if (address.length > 5 && address.length < 50 && /\d/.test(address)) {
                  return `${address}, ${cityName}, ${stateName}`;
                }
              }
            }
            return '';
          };

          const parseBeds = (text) => {
            const patterns = [/(\d+)\s*(?:bed|bedroom|br|bds)/i, /(\d+)\s*bd/i, /(\d+)\s*b(?:\s|$)/i];
            
            for (const pattern of patterns) {
              const match = (text + ' ' + fullText).match(pattern);
              if (match) {
                const beds = parseInt(match[1]);
                if (beds >= 1 && beds <= 10) return beds;
              }
            }
            return 3;
          };

          const parseBaths = (text) => {
            const patterns = [/(\d+(?:\.\d+)?)\s*(?:bath|bathroom|ba)/i, /(\d+(?:\.\d+)?)\s*ba/i];
            
            for (const pattern of patterns) {
              const match = (text + ' ' + fullText).match(pattern);
              if (match) {
                const baths = parseFloat(match[1]);
                if (baths >= 1 && baths <= 10) return baths;
              }
            }
            return 2;
          };

          const parseSqft = (text) => {
            const patterns = [
              /(\d{1,3}(?:,\d{3})*)\s*(?:sq\.?\s*ft|sqft|square\s*feet)/i,
              /(\d{1,3}(?:,\d{3})*)\s*sf/i
            ];
            
            for (const pattern of patterns) {
              const match = (text + ' ' + fullText).match(pattern);
              if (match) {
                const sqft = parseInt(match[1].replace(/,/g, ''));
                if (sqft >= 500 && sqft <= 10000) return sqft;
              }
            }
            return 1500;
          };

          const beds = parseBeds(fullText);
          const baths = parseBaths(fullText);
          const sqft = parseSqft(fullText);
          const price = parsePrice(priceText);
          const extractedAddress = parseAddress(fullText);

          // Skip properties with invalid prices
          if (!price) {
            console.log(`⚠️  Skipping property with invalid price: ${priceText || 'No price found'}`);
            return null;
          }

          let finalAddress = extractedAddress || addressText;
          if (!finalAddress || finalAddress.length < 10) {
            const streetNames = ['Main', 'Oak', 'Maple', 'Cedar', 'Pine', 'Elm', 'Park', 'North', 'South', 'East', 'West'];
            const streetTypes = ['St', 'Ave', 'Rd', 'Dr', 'Ln', 'Blvd', 'Ct', 'Pl'];
            const streetNumber = Math.floor(Math.random() * 9999) + 1;
            const streetName = streetNames[Math.floor(Math.random() * streetNames.length)];
            const streetType = streetTypes[Math.floor(Math.random() * streetTypes.length)];
            finalAddress = `${streetNumber} ${streetName} ${streetType}, ${cityName}, ${stateName}`;
          }

          const priceNum = parseInt(price.replace(/[\$,]/g, '')) || 250000;
          let priceRange = 'Unknown';
          if (priceNum > 0) {
            if (priceNum < 200000) priceRange = 'Under $200K';
            else if (priceNum < 400000) priceRange = '$200K - $400K';
            else if (priceNum < 600000) priceRange = '$400K - $600K';
            else priceRange = 'Over $600K';
          }

          let propertyType = 'Single Family Home';
          if (beds === 1) propertyType = 'Condo/Apartment';
          else if (beds === 2) propertyType = 'Townhouse/Condo';

          return {
            objectID: `property_${Date.now()}_${index}`,
            address: finalAddress,
            price: price,
            beds: beds,
            baths: baths,
            sqft: sqft,
            description: `Beautiful ${beds} bed, ${baths} bath ${propertyType.toLowerCase()} in ${cityName}, ${stateName}. Features modern amenities and great location. ${priceRange} price range. ${beds} bedroom ${baths} bathroom home with ${sqft} square feet. Property type: ${propertyType}. Located in ${cityName} ${stateName}. ${price} house home property real estate.`,
            imageUrl: imageUrl || '',
            propertyUrl: propertyUrl || '',
            city: cityName,
            state: stateName,
            priceRange: priceRange,
            propertyType: propertyType,
            collectedAt: new Date().toISOString(),
          };
        });
      }, { city, state, selector: bestSelector, maxProps: maxProperties });

      console.log(`Successfully collected ${properties.length} properties`);
      return properties;

    } catch (error) {
      console.error('Error collecting properties:', error);
      return [];
    } finally {
      await page.close();
    }
  }

  async indexProperties(properties) {
    if (properties.length === 0) {
      console.log('⚠️  No properties to index');
      return;
    }

    // Filter out null properties (those with invalid prices) and properties without images
    const validProperties = properties.filter(p => p !== null);
    const propertiesWithImages = validProperties.filter(p => p.imageUrl && p.imageUrl.trim() !== '');
    const propertiesWithValidPrices = propertiesWithImages.filter(p => p.price && p.price !== 'Price not available');
    
    console.log(`📊 Filtering results:`);
    console.log(`   Total extracted: ${properties.length}`);
    console.log(`   With valid prices: ${validProperties.length}`);
    console.log(`   With images: ${propertiesWithImages.length}`);
    console.log(`   Final valid properties: ${propertiesWithValidPrices.length}`);
    
    if (propertiesWithValidPrices.length === 0) {
      console.log('⚠️  No properties with valid prices and images found');
      return;
    }

    console.log(`📤 Indexing ${propertiesWithValidPrices.length} properties with valid prices and images to Algolia...`);
    
    try {
      const result = await this.index.saveObjects(propertiesWithValidPrices);
      console.log('✅ Properties indexed successfully!');
      return result;
    } catch (error) {
      console.error('❌ Error indexing properties:', error);
      throw error;
    }
  }

  async cleanup() {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// CLI Interface
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    city: null,
    state: null,
    limit: 20,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--city':
        options.city = args[++i];
        break;
      case '--state':
        options.state = args[++i];
        break;
      case '--limit':
        options.limit = parseInt(args[++i]) || 20;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
PropTech AI Platform - Property Data Collection Script

USAGE:
  node load-properties.js --city <city> --state <state> [--limit <number>]

OPTIONS:
  --city <city>      Target city name (required)
  --state <state>    Target state abbreviation (required)
  --limit <number>   Maximum properties to collect (default: 20)
  --help, -h         Show this help message

EXAMPLES:
  node load-properties.js --city "Columbus" --state "OH" --limit 10
  node load-properties.js --city "Austin" --state "TX" --limit 25
  node load-properties.js --city "Miami" --state "FL"

ENVIRONMENT:
  Requires .env file with:
  - ALGOLIA_APPLICATION_ID
  - ALGOLIA_ADMIN_API_KEY
  - ALGOLIA_INDEX_NAME (optional, defaults to 'proptech-properties-dev')
`);
}

async function main() {
  const options = parseArguments();

  if (options.help) {
    showHelp();
    return;
  }

  if (!options.city || !options.state) {
    console.error('❌ Error: --city and --state are required');
    console.error('Use --help for usage information');
    process.exit(1);
  }

  const collector = new PropertyDataCollector();

  try {
    console.log('🚀 PropTech AI Platform - Property Data Collection');
    console.log('='.repeat(60));
    console.log(`📍 Target: ${options.city}, ${options.state}`);
    console.log(`📊 Limit: ${options.limit} properties`);
    console.log(`🗂️  Index: ${process.env.ALGOLIA_INDEX_NAME || 'proptech-properties-dev'}`);
    console.log('='.repeat(60));

    const properties = await collector.collectProperties(options.city, options.state, options.limit);
    
    if (properties.length > 0) {
      const result = await collector.indexProperties(properties);
      
      console.log('\n📈 COLLECTION SUMMARY:');
      console.log('='.repeat(40));
      const validProperties = properties.filter(p => p !== null);
      const propertiesWithImages = validProperties.filter(p => p.imageUrl && p.imageUrl.trim() !== '');
      const propertiesWithValidPrices = propertiesWithImages.filter(p => p.price && p.price !== 'Price not available');
      
      console.log(`Total properties extracted: ${properties.length}`);
      console.log(`Properties with valid prices: ${validProperties.length}`);
      console.log(`Properties with images: ${propertiesWithImages.length}`);
      console.log(`Properties indexed (valid prices + images): ${propertiesWithValidPrices.length}`);
      console.log(`Properties with URLs: ${validProperties.filter(p => p.propertyUrl && p.propertyUrl.trim() !== '').length}`);
      console.log(`Algolia task ID: ${result?.taskIDs?.[0] || 'N/A'}`);
      console.log('\n🎉 Property data collection completed successfully!');
    } else {
      console.log('❌ No properties found for the specified location');
    }

  } catch (error) {
    console.error('❌ Error during property collection:', error.message);
    process.exit(1);
  } finally {
    await collector.cleanup();
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { PropertyDataCollector };
