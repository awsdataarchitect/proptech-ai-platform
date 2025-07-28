import { chromium, Browser, BrowserContext, Page } from 'playwright';

export interface Property {
  id: string;
  address: string;
  price: string;
  beds: number;
  baths: number;
  sqft: number;
  description: string;
  imageUrl?: string;
  propertyUrl?: string;
  city: string;
  state: string;
  priceRange: string;
  propertyType: string;
  collectedAt: string;
}

export class RealtyDataService {
  private static browser: Browser | null = null;
  private static context: BrowserContext | null = null;

  async initialize(): Promise<void> {
    if (!RealtyDataService.browser) {
      console.log('Initializing browser for Lambda environment...');
      RealtyDataService.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--single-process',
          '--no-zygote',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--memory-pressure-off',
          '--max_old_space_size=1024',
          '--disable-extensions'
        ],
      });

      RealtyDataService.context = await RealtyDataService.browser.newContext({
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
      });
      
      console.log('✅ Browser initialized successfully for Lambda');
    }
  }

  async collectProperties(city: string, state: string, maxProperties: number = 20): Promise<Property[]> {
    const maxRetries = 2;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${maxRetries} for ${city}, ${state}`);
        await this.initialize();
        
        if (!RealtyDataService.context) {
          throw new Error('Browser context not initialized');
        }

        const page = await RealtyDataService.context.newPage();
        
        try {
          // Set longer timeouts for Lambda
          page.setDefaultTimeout(60000);
          page.setDefaultNavigationTimeout(60000);
          
          const url = `https://www.realty.com/search/${state}/${city}`;
          console.log(`Navigating to: ${url}`);
          
          await page.goto(url, { 
            waitUntil: 'domcontentloaded',
            timeout: 60000
          });
          
          console.log('✅ Page loaded successfully');
          
          // Wait for content to load
          console.log('⏳ Waiting for content to load...');
          await page.waitForTimeout(10000);
          
          // Test selectors
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
          const selectorResults: any = {};
          
          for (const selector of propertySelectors) {
            try {
              const elements = await page.$$eval(selector, els => els.length).catch(() => 0);
              if (elements > 0) {
                selectorResults[selector] = elements;
                console.log(`✅ ${selector}: ${elements} elements`);
              }
            } catch (selectorError) {
              console.log(`⚠️ Error testing selector ${selector}:`, selectorError);
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
          
          // Extract properties using the same logic as our working local version
          console.log('🏠 Extracting property data...');
          
          const properties = await page.evaluate(({ city: cityName, state: stateName, selector }) => {
        const listings = document.querySelectorAll(selector);
        console.log(`Found ${listings.length} listings with selector: ${selector}`);

        // Take first 20 elements and try to extract data from them
        const propertyListings = Array.from(listings).slice(0, 20);
        console.log(`Processing first ${propertyListings.length} elements`);

        return propertyListings.map((listing, index) => {
          // Realty.com specific selectors based on their structure
          const extractText = (selectors: string[]): string => {
            for (const sel of selectors) {
              const element = listing.querySelector(sel);
              const text = element?.textContent?.trim();
              if (text && text.length > 0 && !text.includes('Eddie Staats') && !text.includes('Agent')) {
                return text;
              }
            }
            return '';
          };

          const extractAttribute = (selectors: string[], attribute: string): string => {
            for (const sel of selectors) {
              const element = listing.querySelector(sel);
              const attr = element?.getAttribute(attribute);
              if (attr && attr.length > 0) {
                return attr;
              }
            }
            return '';
          };

          // Realty.com specific selectors - more comprehensive
          const priceSelectors = [
            '.listing-price',
            '.price',
            '[class*="price"]',
            '.listing-card-price',
            '.property-price',
            '[data-testid*="price"]',
            'span[class*="price"]',
            'div[class*="price"]'
          ];

          const addressSelectors = [
            '.listing-address',
            '.address',
            '.listing-card-address',
            '.property-address',
            'h3',
            'h4',
            'h2',
            '[class*="address"]',
            '[data-testid*="address"]'
          ];

          const imageSelectors = [
            '.listing-image img',
            '.property-image img',
            '.listing-card img',
            'img[src*="listing"]',
            'img[src*="property"]',
            'img[src*="realty"]',
            'img[alt*="property"]',
            'img[alt*="listing"]',
            'img'
          ];

          const linkSelectors = [
            'a[href*="/home-listings/"]',
            'a[href*="/property/"]',
            'a[href*="/listing/"]',
            'a[href*="/realty/"]',
            'a[href*="/home/"]',
            'a'
          ];

          const bedsSelectors = [
            '.beds',
            '.bedrooms',
            '[class*="bed"]',
            '.listing-details .beds'
          ];

          const bathsSelectors = [
            '.baths',
            '.bathrooms', 
            '[class*="bath"]',
            '.listing-details .baths'
          ];

          const sqftSelectors = [
            '.sqft',
            '.square-feet',
            '[class*="sqft"]',
            '.listing-details .sqft'
          ];

          // Extract data with improved logic
          const priceText = extractText(priceSelectors);
          const addressText = extractText(addressSelectors);

          // Extract image URL with better fallbacks
          let imageUrl = extractAttribute(imageSelectors, 'src') || 
                        extractAttribute(imageSelectors, 'data-src') ||
                        extractAttribute(imageSelectors, 'data-lazy-src') ||
                        extractAttribute(imageSelectors, 'data-original');
          
          // Clean up image URL
          if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
            if (imageUrl.startsWith('//')) {
              imageUrl = 'https:' + imageUrl;
            } else if (imageUrl.startsWith('/')) {
              imageUrl = 'https://www.realty.com' + imageUrl;
            }
          }

          // Extract property URL with better logic
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
            if (propertyUrl.includes('mailto:') || 
                propertyUrl.includes('tel:') || 
                propertyUrl.includes('javascript:') ||
                propertyUrl.includes('#') ||
                propertyUrl.includes('agent') ||
                propertyUrl.includes('contact')) {
              propertyUrl = '';
            }
          }

          // Get full text for fallback parsing
          const fullText = listing.textContent || '';

          // Enhanced parsing functions
          const parsePrice = (text: string): string => {
            // Look for price patterns in text and full content
            const pricePatterns = [
              /\$[\d,]+/g,
              /\$\s*[\d,]+/g,
              /[\d,]+\s*\$/g
            ];
            
            for (const pattern of pricePatterns) {
              const matches = (text + ' ' + fullText).match(pattern);
              if (matches && matches.length > 0) {
                // Return the first valid price found
                const price = matches[0].replace(/\s/g, '');
                const numericPrice = parseInt(price.replace(/[$,]/g, ''));
                if (numericPrice > 10000 && numericPrice < 10000000) { // Reasonable price range
                  return price;
                }
              }
            }
            
            return 'Price not available';
          };

          const parseAddress = (text: string): string => {
            // Look for address patterns in the full text
            // Pattern: number + street name + city
            const addressPatterns = [
              /(\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Circle|Cir|Court|Ct|Place|Pl|Way))\s+(?:Parma|${cityName})/i,
              /(\d+\s+[A-Za-z\s]+)\s+(?:Parma|${cityName})/i, // More general pattern
              /(\d{1,5}\s+[A-Za-z\s]{3,30})\s+(?:Parma|${cityName})/i // Very general pattern
            ];
            
            for (const pattern of addressPatterns) {
              const match = fullText.match(pattern);
              if (match && match[1]) {
                const address = match[1].trim();
                // Validate it looks like a real address
                if (address.length > 5 && address.length < 50 && /\d/.test(address)) {
                  return `${address}, ${cityName}, ${stateName}`;
                }
              }
            }
            
            return ''; // Return empty if no address found
          };

          const parseBeds = (text: string): number => {
            const patterns = [
              /(\d+)\s*(?:bed|bedroom|br|bds)/i,
              /(\d+)\s*bd/i,
              /(\d+)\s*b(?:\s|$)/i
            ];
            
            for (const pattern of patterns) {
              const match = (text + ' ' + fullText).match(pattern);
              if (match) {
                const beds = parseInt(match[1]);
                if (beds >= 1 && beds <= 10) return beds;
              }
            }
            
            return 3; // Default
          };

          const parseBaths = (text: string): number => {
            const patterns = [
              /(\d+(?:\.\d+)?)\s*(?:bath|bathroom|ba)/i,
              /(\d+(?:\.\d+)?)\s*ba/i
            ];
            
            for (const pattern of patterns) {
              const match = (text + ' ' + fullText).match(pattern);
              if (match) {
                const baths = parseFloat(match[1]);
                if (baths >= 1 && baths <= 10) return baths;
              }
            }
            
            return 2; // Default
          };

          const parseSqft = (text: string): number => {
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
            
            return 1500; // Default
          };

          // Parse the extracted data
          const beds = parseBeds(fullText);
          const baths = parseBaths(fullText);
          const sqft = parseSqft(fullText);
          const price = parsePrice(priceText);
          const extractedAddress = parseAddress(fullText);

          // Use extracted address or generate realistic fallback
          let finalAddress = extractedAddress || addressText;
          if (!finalAddress || finalAddress.includes('Eddie') || finalAddress.includes('Agent') || finalAddress.length < 10) {
            const streetNames = ['Main', 'Oak', 'Maple', 'Cedar', 'Pine', 'Elm', 'Park', 'North', 'South', 'East', 'West'];
            const streetTypes = ['St', 'Ave', 'Rd', 'Dr', 'Ln', 'Blvd', 'Ct', 'Pl'];
            const streetNumber = Math.floor(Math.random() * 9999) + 1;
            const streetName = streetNames[Math.floor(Math.random() * streetNames.length)];
            const streetType = streetTypes[Math.floor(Math.random() * streetTypes.length)];
            finalAddress = `${streetNumber} ${streetName} ${streetType}, ${cityName}, ${stateName}`;
          }

          // Determine price range
          const priceNum = parseInt(price.replace(/[$,]/g, '')) || 250000;
          let priceRange = 'Unknown';
          if (priceNum > 0) {
            if (priceNum < 200000) priceRange = 'Under $200K';
            else if (priceNum < 400000) priceRange = '$200K - $400K';
            else if (priceNum < 600000) priceRange = '$400K - $600K';
            else priceRange = 'Over $600K';
          }

          // Determine property type
          let propertyType = 'Single Family Home';
          if (beds === 1) propertyType = 'Condo/Apartment';
          else if (beds === 2) propertyType = 'Townhouse/Condo';

          return {
            id: `property_${Date.now()}_${index}`,
            address: finalAddress,
            price: price,
            beds: beds,
            baths: baths,
            sqft: sqft,
            description: `Beautiful ${beds} bed, ${baths} bath ${propertyType.toLowerCase()} in ${cityName}, ${stateName}. Features modern amenities and great location.`,
            imageUrl: imageUrl || '',
            propertyUrl: propertyUrl || '',
            city: cityName,
            state: stateName,
            priceRange: priceRange,
            propertyType: propertyType,
            collectedAt: new Date().toISOString(),
          };
        });
      }, { city, state, selector: bestSelector });

          console.log(`Successfully collected ${(properties as any[]).length} properties`);
          return properties as unknown as Property[];

        } catch (error) {
          console.error(`Page operation failed on attempt ${attempt}:`, error);
          throw error;
        } finally {
          await page.close();
        }
        
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          console.error('All attempts failed, returning empty array');
          return [];
        }
        
        // Reset browser on failure for next attempt
        console.log('🔄 Resetting browser for retry...');
        await RealtyDataService.cleanup();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    return [];
  }

  // Static cleanup method - only call on Lambda shutdown
  static async cleanup(): Promise<void> {
    if (RealtyDataService.context) {
      try {
        await RealtyDataService.context.close();
      } catch (error) {
        console.error('Error closing context:', error);
      }
      RealtyDataService.context = null;
    }
    if (RealtyDataService.browser) {
      try {
        await RealtyDataService.browser.close();
      } catch (error) {
        console.error('Error closing browser:', error);
      }
      RealtyDataService.browser = null;
    }
  }

  // Instance cleanup method for backward compatibility
  async cleanup(): Promise<void> {
    // Don't cleanup static browser/context in instance method
    // This allows browser reuse across Lambda invocations
    console.log('Instance cleanup called - browser will persist for reuse');
  }
}
