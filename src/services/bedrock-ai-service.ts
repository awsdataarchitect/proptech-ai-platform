import { 
  BedrockRuntimeClient, 
  ConverseCommand,
  Message,
  ContentBlock,
  ConversationRole,
  InferenceConfiguration
} from '@aws-sdk/client-bedrock-runtime';
import { Property } from './realty-data-service';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatContext {
  messages: ChatMessage[];
  properties?: Property[];
}

export class BedrockAIService {
  private client: BedrockRuntimeClient;
  private modelId: string = 'amazon.nova-lite-v1:0';

  constructor() {
    this.client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }

  async generatePropertyInsights(property: Property): Promise<string> {
    try {
      const systemPrompt = `You are a professional real estate analyst and investment advisor. Provide detailed, actionable insights about properties with specific market analysis, investment potential, and recommendations. Use clear formatting and be specific with your assessments.`;

      const prompt = `Analyze this property and provide detailed insights:

Property Details:
- Address: ${property.address}
- Price: ${property.price}
- Bedrooms: ${property.beds}
- Bathrooms: ${property.baths}
- Square Footage: ${property.sqft} sq ft
- Property Type: ${property.propertyType}
- Price Range: ${property.priceRange}
- Location: ${property.city}, ${property.state}

Please provide insights on:
1. Investment potential and market analysis
2. Neighborhood characteristics and amenities
3. Property value assessment
4. Potential rental income (if applicable)
5. Market trends for this area
6. Pros and cons of this property
7. Recommendations for potential buyers

Format your response in a clear, structured manner with specific insights and actionable recommendations.`;

      const response = await this.invokeModel(prompt, systemPrompt);
      return response;
    } catch (error) {
      console.error('Error generating property insights:', error);
      throw new Error('Failed to generate property insights');
    }
  }

  async chat(message: string, context?: ChatContext): Promise<string> {
    try {
      const systemPrompt = `You are a knowledgeable real estate assistant and market expert. Help users with property searches, market insights, investment advice, and real estate questions. Be helpful, accurate, and provide specific actionable advice when possible.`;

      let prompt = message;

      // Add context if provided
      if (context) {
        let contextInfo = '';
        
        // Add previous messages context
        if (context.messages && context.messages.length > 0) {
          contextInfo += 'Previous conversation:\n';
          context.messages.slice(-5).forEach(msg => {
            contextInfo += `${msg.role}: ${msg.content}\n`;
          });
          contextInfo += '\n';
        }

        // Add properties context if available
        if (context.properties && context.properties.length > 0) {
          contextInfo += 'Available properties:\n';
          context.properties.slice(0, 5).forEach((prop, index) => {
            contextInfo += `${index + 1}. ${prop.address} - ${prop.price}, ${prop.beds}bed/${prop.baths}bath, ${prop.sqft}sqft\n`;
          });
          contextInfo += '\n';
        }

        prompt = `${contextInfo}User question: ${message}

Please provide a helpful response about real estate, property search, or market insights. If the user is asking about specific properties, reference the available properties listed above.`;
      }

      const response = await this.invokeModel(prompt, systemPrompt);
      return response;
    } catch (error) {
      console.error('Error in chat:', error);
      throw new Error('Failed to process chat message');
    }
  }

  private async invokeModel(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      // Create the user message using proper Converse API format
      const userMessage: Message = {
        role: ConversationRole.USER,
        content: [
          {
            text: prompt
          } as ContentBlock
        ]
      };

      // Configure inference parameters (now properly supported)
      const inferenceConfig: InferenceConfiguration = {
        maxTokens: 2000,        // Now supported with Converse API
        temperature: 0.7,       // Now supported with Converse API
        topP: 0.9              // Now supported with Converse API
      };

      // Build the Converse command
      const command = new ConverseCommand({
        modelId: this.modelId,
        messages: [userMessage],
        inferenceConfig: inferenceConfig,
        // Add system prompt if provided
        ...(systemPrompt && {
          system: [
            {
              text: systemPrompt
            }
          ]
        })
      });

      const response = await this.client.send(command);
      
      if (!response.output?.message?.content?.[0]?.text) {
        throw new Error('Invalid response format from Bedrock Converse API');
      }

      return response.output.message.content[0].text;
    } catch (error) {
      console.error('Error invoking Bedrock model with Converse API:', error);
      throw error;
    }
  }

  async generateMarketAnalysis(city: string, state: string, properties: Property[]): Promise<string> {
    try {
      const systemPrompt = `You are a professional real estate market analyst. Provide comprehensive market analysis with specific data insights, trends, and actionable recommendations for investors, buyers, and sellers. Use the property data provided to support your analysis.`;

      const prompt = `Provide a comprehensive market analysis for ${city}, ${state} based on the following property data:

Properties analyzed: ${properties.length}

Property Summary:
${properties.slice(0, 10).map((prop, index) => 
  `${index + 1}. ${prop.address} - ${prop.price}, ${prop.beds}bed/${prop.baths}bath, ${prop.sqft}sqft`
).join('\n')}

Please analyze:
1. Average price trends and market conditions
2. Property type distribution and preferences
3. Price per square foot analysis
4. Neighborhood characteristics and growth potential
5. Investment opportunities and recommendations
6. Market outlook and future predictions
7. Comparison with regional markets

Provide specific insights and actionable recommendations for buyers, sellers, and investors.`;

      const response = await this.invokeModel(prompt, systemPrompt);
      return response;
    } catch (error) {
      console.error('Error generating market analysis:', error);
      throw new Error('Failed to generate market analysis');
    }
  }
}
