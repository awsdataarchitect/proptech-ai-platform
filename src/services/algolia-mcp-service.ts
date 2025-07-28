import algoliasearch, { SearchClient, SearchIndex } from 'algoliasearch';
import { Property } from './realty-data-service';

interface SearchParams {
  query: string;
  page?: number;
  hitsPerPage?: number;
  filters?: string;
}

interface SearchResult {
  hits: Property[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  processingTimeMS: number;
}

interface Stats {
  totalProperties: number;
  uniqueCities: number;
  averagePrice: number;
  priceRanges: Record<string, number>;
  propertyTypes: Record<string, number>;
}

export class AlgoliaMCPService {
  private client: SearchClient;
  private index: SearchIndex;
  private indexName: string;

  constructor() {
    const appId = process.env.ALGOLIA_APPLICATION_ID;
    const adminKey = process.env.ALGOLIA_ADMIN_API_KEY;
    this.indexName = process.env.ALGOLIA_INDEX_NAME || 'proptech-properties-dev';

    if (!appId || !adminKey) {
      throw new Error('Algolia credentials not found in environment variables');
    }

    console.log(`Using Algolia index: ${this.indexName}`);
    this.client = algoliasearch(appId, adminKey);
    this.index = this.client.initIndex(this.indexName);
  }

  async indexProperties(properties: Property[]): Promise<void> {
    try {
      console.log(`Indexing ${properties.length} properties in Algolia...`);

      // Prepare properties for Algolia (ensure objectID is set)
      const algoliaProperties = properties.map(property => ({
        ...property,
        objectID: property.id, // Use id as objectID for Algolia
      }));

      // Save objects to Algolia
      const response = await this.index.saveObjects(algoliaProperties);
      console.log('Algolia indexing response:', response);

      // Configure index settings for better search
      await this.index.setSettings({
        searchableAttributes: [
          'address',
          'description',
          'city',
          'state',
          'propertyType',
        ],
        attributesForFaceting: [
          'priceRange',
          'beds',
          'baths',
          'propertyType',
          'city',
          'state',
        ],
        customRanking: ['desc(collectedAt)'],
        ranking: [
          'typo',
          'geo',
          'words',
          'filters',
          'proximity',
          'attribute',
          'exact',
          'custom',
        ],
      });

      console.log(`Successfully indexed ${properties.length} properties`);
    } catch (error) {
      console.error('Error indexing properties:', error);
      throw error;
    }
  }

  async searchProperties(query: string = '', filters: string = ''): Promise<SearchResult> {
    try {
      console.log(`Searching properties with query: "${query}", filters: "${filters}"`);

      const searchParams: any = {
        query,
        hitsPerPage: 50,
      };

      if (filters) {
        searchParams.filters = filters;
      }

      const response = await this.index.search(query, searchParams);

      return {
        hits: response.hits as unknown as Property[],
        nbHits: response.nbHits,
        page: response.page,
        nbPages: response.nbPages,
        hitsPerPage: response.hitsPerPage,
        processingTimeMS: response.processingTimeMS,
      };
    } catch (error) {
      console.error('Error searching properties:', error);
      throw error;
    }
  }

  async getProperty(propertyId: string): Promise<Property | null> {
    try {
      const property = await this.index.getObject(propertyId);
      return property as unknown as Property;
    } catch (error) {
      console.error('Error getting property:', error);
      return null;
    }
  }

  async getStats(): Promise<Stats> {
    try {
      // Get all properties to calculate stats
      const response = await this.index.search('', {
        hitsPerPage: 1000, // Adjust based on expected data size
      });

      const properties = response.hits as unknown as Property[];
      const totalProperties = properties.length;

      // Calculate unique cities
      const uniqueCities = new Set(properties.map(p => `${p.city}, ${p.state}`)).size;

      // Calculate average price
      const prices = properties
        .map(p => {
          const priceNum = parseInt(p.price.replace(/[$,]/g, '')) || 0;
          return priceNum;
        })
        .filter(price => price > 0);
      
      const averagePrice = prices.length > 0 
        ? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length)
        : 0;

      // Calculate price range distribution
      const priceRanges: Record<string, number> = {};
      properties.forEach(property => {
        const range = property.priceRange || 'Unknown';
        priceRanges[range] = (priceRanges[range] || 0) + 1;
      });

      // Calculate property type distribution
      const propertyTypes: Record<string, number> = {};
      properties.forEach(property => {
        const type = property.propertyType || 'Unknown';
        propertyTypes[type] = (propertyTypes[type] || 0) + 1;
      });

      return {
        totalProperties,
        uniqueCities,
        averagePrice,
        priceRanges,
        propertyTypes,
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        totalProperties: 0,
        uniqueCities: 0,
        averagePrice: 0,
        priceRanges: {},
        propertyTypes: {},
      };
    }
  }

  async clearIndex(): Promise<void> {
    try {
      await this.index.clearObjects();
      console.log('Index cleared successfully');
    } catch (error) {
      console.error('Error clearing index:', error);
      throw error;
    }
  }
}
