import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { RealtyDataService } from '../services/realty-data-service';
import { AlgoliaMCPService } from '../services/algolia-mcp-service';
import { BedrockAIService } from '../services/bedrock-ai-service';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Cache-Control, Pragma, Expires',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Cleanup browser on Lambda shutdown
process.on('SIGTERM', async () => {
  console.log('Lambda shutting down, cleaning up browser...');
  await RealtyDataService.cleanup();
});

process.on('SIGINT', async () => {
  console.log('Lambda interrupted, cleaning up browser...');
  await RealtyDataService.cleanup();
});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const { httpMethod, path } = event;

    // Handle CORS preflight
    if (httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: '',
      };
    }

    // Health check endpoint
    if (path === '/health') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        }),
      };
    }

    // Collect properties endpoint
    if (path === '/properties/collect' && httpMethod === 'POST') {
      const realtyService = new RealtyDataService();
      const algoliaMCP = new AlgoliaMCPService();
      
      const body = JSON.parse(event.body || '{}');
      let { city, state, location } = body;
      
      // Handle both formats: separate city/state or combined location
      if (location && !city && !state) {
        // Parse location like "Parma, OH" or "Miamisburg OH"
        const locationParts = location.split(/[,\s]+/).filter((part: string) => part.length > 0);
        if (locationParts.length >= 2) {
          // Last part is state, everything else is city
          state = locationParts[locationParts.length - 1];
          city = locationParts.slice(0, -1).join(' ');
        } else {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Location must include both city and state (e.g., "Parma, OH")' }),
          };
        }
      }
      
      if (!city || !state) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'City and state are required' }),
        };
      }

      console.log(`Collecting properties for ${city}, ${state}`);
      
      try {
        // Check if we already have properties for this location
        const existingResults = await algoliaMCP.searchProperties(`${city} ${state}`);
        const existingCount = existingResults.hits?.length || 0;
        
        // Collect real data using Playwright
        const properties = await realtyService.collectProperties(city, state);
        
        console.log(`Collected ${properties.length} new properties`);
        
        if (properties.length === 0) {
          // No new properties found
          return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
              success: true,
              collected: 0,
              existing: existingCount,
              total: existingCount,
              message: existingCount > 0 ? 
                `No new properties found. ${existingCount} existing properties available.` :
                'No properties found for this location.'
            }),
          };
        }
        
        // Index new properties in Algolia via MCP
        await algoliaMCP.indexProperties(properties);
        
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            success: true,
            collected: properties.length,
            existing: existingCount,
            total: existingCount + properties.length,
            message: `Successfully collected ${properties.length} new properties for ${city}, ${state}`
          }),
        };
        
      } catch (error) {
        console.error('Error collecting properties:', error);
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
          }),
        };
      }
      // Don't cleanup browser here - let it persist for next invocation
    }

    // Search properties endpoint
    if (path === '/properties/search' && httpMethod === 'GET') {
      const algoliaMCP = new AlgoliaMCPService();
      const query = event.queryStringParameters?.q || '';
      const filters = event.queryStringParameters?.filters || '';
      
      const results = await algoliaMCP.searchProperties(query, filters);
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(results),
      };
    }

    // Get property insights endpoint
    if (path?.startsWith('/properties/') && path.endsWith('/insights') && httpMethod === 'GET') {
      const propertyId = path.split('/')[2];
      const bedrockAI = new BedrockAIService();
      
      // Get property details first
      const algoliaMCP = new AlgoliaMCPService();
      const property = await algoliaMCP.getProperty(propertyId);
      
      if (!property) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Property not found' }),
        };
      }
      
      const insights = await bedrockAI.generatePropertyInsights(property);
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ insights }),
      };
    }

    // Chat endpoint
    if (path === '/chat' && httpMethod === 'POST') {
      const bedrockAI = new BedrockAIService();
      const body = JSON.parse(event.body || '{}');
      const { message, context } = body;
      
      if (!message) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Message is required' }),
        };
      }
      
      const response = await bedrockAI.chat(message, context);
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ response }),
      };
    }

    // Get stats endpoint
    if (path === '/stats' && httpMethod === 'GET') {
      const algoliaMCP = new AlgoliaMCPService();
      const stats = await algoliaMCP.getStats();
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(stats),
      };
    }

    // Route not found
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Route not found' }),
    };

  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
