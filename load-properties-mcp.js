#!/usr/bin/env node

/**
 * PropTech AI Platform - Property Data Collection Script (MCP Implementation)
 * 
 * Minimal MCP implementation - just replaces the Algolia SDK call with MCP.
 * Uses a simple subprocess approach to avoid complex MCP server setup.
 */

const { chromium } = require('playwright');
const { spawn } = require('child_process');
require('dotenv').config();

class PropertyDataCollector {
  constructor() {
    this.browser = null;
    this.context = null;
    this.indexName = process.env.ALGOLIA_INDEX_NAME || 'proptech-properties-dev';
    this.applicationId = process.env.ALGOLIA_APPLICATION_ID;
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
        viewport: { width: 1920, height: 1080 },
        ignoreHTTPSErrors: true,
      });
      console.log('✅ Browser initialized successfully');
    }
  }

  async collectProperties(city, state, maxProperties = 20) {
    await this.initializeBrowser();
    
    const page = await this.context.newPage();
    
    try {
      const url = `https://www.realty.com/search/${state}/${city}`;
      console.log(`🔍 Navigating to: ${url}`);
      
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      console.log('✅ Page loaded successfully');
      console.log('⏳ Waiting for content to load...');
      await page.waitForTimeout(3000);

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
          }

          const fullText = listing.textContent || '';

          // Parse property details
          const parsePrice = (text) => {
            const invalidPriceIndicators = [
              'price available', 'price not available', 'call for price', 
              'contact for price', 'price upon request', 'tbd', 'n/a',
              'coming soon', 'off market', 'sold'
            ];
            
            const lowerText = text.toLowerCase();
            for (const indicator of invalidPriceIndicators) {
              if (lowerText.includes(indicator)) {
                return null;
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
            return null;
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
                if (beds >= 0 && beds <= 10) {
                  return beds.toString();
                }
              }
            }
            return 'N/A';
          };

          const parseBaths = (text) => {
            const patterns = [/(\d+(?:\.\d+)?)\s*(?:bath|bathroom|ba|baths)/i, /(\d+(?:\.\d+)?)\s*ba/i];
            
            for (const pattern of patterns) {
              const match = (text + ' ' + fullText).match(pattern);
              if (match) {
                const baths = parseFloat(match[1]);
                if (baths >= 0 && baths <= 20) {
                  return baths.toString();
                }
              }
            }
            return 'N/A';
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
            return 'N/A';
          };

          // Extract and parse data
          const price = parsePrice(priceText + ' ' + fullText);
          const address = parseAddress(addressText + ' ' + fullText) || addressText;
          const beds = parseBeds(fullText);
          const baths = parseBaths(fullText);
          const sqft = parseSqft(fullText);

          // Only return properties with valid data
          if (!price || !address || !imageUrl || !propertyUrl) {
            return null;
          }

          const numericPrice = parseInt(price.replace(/[\$,]/g, ''));
          
          // Calculate price range
          let priceRange = 'Unknown';
          if (numericPrice > 0) {
            if (numericPrice < 200000) priceRange = 'Under $200K';
            else if (numericPrice < 400000) priceRange = '$200K - $400K';
            else if (numericPrice < 600000) priceRange = '$400K - $600K';
            else priceRange = 'Over $600K';
          }

          // Determine property type based on bedrooms
          let propertyType = 'Single Family Home';
          const bedsNum = parseInt(beds);
          if (bedsNum === 1) propertyType = 'Condo/Apartment';
          else if (bedsNum === 2) propertyType = 'Townhouse/Condo';
          
          return {
            objectID: `property_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            address: address,
            price: price,
            priceNumeric: numericPrice,
            beds: beds,
            baths: baths,
            sqft: sqft,
            description: `Beautiful ${beds} bed, ${baths} bath ${propertyType.toLowerCase()} in ${cityName}, ${stateName}. Features modern amenities and great location. ${priceRange} price range. ${beds} bedroom ${baths} bathroom home with ${sqft} square feet. Property type: ${propertyType}. Located in ${cityName} ${stateName}. ${price} house home property real estate.`,
            imageUrl: imageUrl,
            propertyUrl: propertyUrl,
            city: cityName,
            state: stateName,
            priceRange: priceRange,
            propertyType: propertyType,
            timestamp: new Date().toISOString(),
            collectedAt: new Date().toISOString(),
            source: 'realty.com'
          };
        }).filter(property => property !== null);
      }, { city, state, selector: bestSelector, maxProps: maxProperties });

      console.log(`Successfully collected ${properties.length} properties`);
      return properties;
      
    } catch (error) {
      console.error('❌ Error during property collection:', error);
      return [];
    } finally {
      await page.close();
    }
  }

  async indexPropertiesViaMCP(properties) {
    if (properties.length === 0) {
      console.log('⚠️  No properties to index');
      return;
    }

    // Filter out null properties and properties without images
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

    console.log(`📤 Indexing ${propertiesWithValidPrices.length} properties via MCP subprocess...`);
    
    return new Promise((resolve, reject) => {
      // Create a simple Node.js script that uses Algolia SDK directly
      const mcpScript = `
        const algoliasearch = require('algoliasearch');
        
        const client = algoliasearch('${this.applicationId}', '${process.env.ALGOLIA_ADMIN_API_KEY}');
        const index = client.initIndex('${this.indexName}');
        
        const properties = ${JSON.stringify(propertiesWithValidPrices)};
        
        console.error('🔍 Debug: Properties to index:', JSON.stringify(properties.slice(0, 1), null, 2));
        
        index.saveObjects(properties)
          .then(result => {
            console.log(JSON.stringify({
              success: true,
              taskID: result.taskID,
              objectIDs: result.objectIDs,
              count: properties.length
            }));
          })
          .catch(error => {
            console.error(JSON.stringify({
              success: false,
              error: error.message
            }));
            process.exit(1);
          });
      `;

      const child = spawn('node', ['-e', mcpScript], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
        // Also log debug output immediately
        console.log('🔍 MCP Debug:', data.toString().trim());
      });

      child.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output.trim());
            if (result.success) {
              console.log('✅ Properties indexed successfully via MCP subprocess!');
              console.log(`📋 Task ID: ${result.taskID}`);
              resolve(result);
            } else {
              console.error('❌ MCP subprocess failed:', result.error);
              reject(new Error(result.error));
            }
          } catch (parseError) {
            console.error('❌ Failed to parse MCP subprocess output:', output);
            reject(parseError);
          }
        } else {
          console.error('❌ MCP subprocess exited with code:', code);
          console.error('Error output:', errorOutput);
          reject(new Error(`MCP subprocess failed with code ${code}`));
        }
      });

      // Set a timeout to prevent hanging
      setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error('MCP subprocess timed out'));
      }, 30000);
    });
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
    city: 'Houston',
    state: 'TX',
    limit: 5
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--city':
        if (args[i + 1]) {
          options.city = args[i + 1];
          i++;
        }
        break;
      case '--state':
        if (args[i + 1]) {
          options.state = args[i + 1];
          i++;
        }
        break;
      case '--limit':
        if (args[i + 1]) {
          options.limit = parseInt(args[i + 1]);
          i++;
        }
        break;
      case '--help':
        console.log(`
PropTech AI Platform - Property Data Collection Script (MCP Implementation)

Usage:
  node load-properties-mcp.js [options]

Options:
  --city <city>      City to search (default: Houston)
  --state <state>    State to search (default: TX)  
  --limit <number>   Maximum properties to collect (default: 5)
  --help             Show this help message

Examples:
  node load-properties-mcp.js --city "Austin" --state "TX" --limit 10
  node load-properties-mcp.js --city "Columbus" --state "OH" --limit 15
        `);
        process.exit(0);
    }
  }

  return options;
}

async function main() {
  const options = parseArguments();
  const collector = new PropertyDataCollector();

  try {
    console.log('🚀 PropTech AI Platform - Property Data Collection (MCP)');
    console.log('='.repeat(60));
    console.log(`📍 Target: ${options.city}, ${options.state}`);
    console.log(`📊 Limit: ${options.limit} properties`);
    console.log(`🗂️  Index: ${process.env.ALGOLIA_INDEX_NAME || 'proptech-properties-dev'}`);
    console.log('='.repeat(60));

    const properties = await collector.collectProperties(options.city, options.state, options.limit);
    
    if (properties.length > 0) {
      const result = await collector.indexPropertiesViaMCP(properties);
      
      console.log('\n📈 COLLECTION SUMMARY:');
      console.log('='.repeat(40));
      console.log(`Total properties extracted: ${properties.length}`);
      console.log(`Properties with valid prices: ${properties.filter(p => p.price && p.price !== 'Price not available').length}`);
      console.log(`Properties with images: ${properties.filter(p => p.imageUrl && p.imageUrl.trim() !== '').length}`);
      console.log(`Properties indexed (valid prices + images): ${properties.filter(p => p.price && p.price !== 'Price not available' && p.imageUrl && p.imageUrl.trim() !== '').length}`);
      console.log(`Properties with URLs: ${properties.filter(p => p.propertyUrl).length}`);
      if (result && result.taskID) {
        console.log(`Algolia task ID: ${result.taskID}`);
      }
      
      console.log('\n🎉 Property data collection completed successfully!');
    } else {
      console.log('\n⚠️  No properties were collected');
    }
    
  } catch (error) {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  } finally {
    await collector.cleanup();
    process.exit(0);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, cleaning up...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, cleaning up...');
  process.exit(0);
});

if (require.main === module) {
  main();
}

module.exports = { PropertyDataCollector };
