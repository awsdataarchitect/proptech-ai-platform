# PropTech AI Platform

🚀 **AI-Powered Real Estate Intelligence Platform** - A comprehensive solution for property data collection, intelligent search, and AI-driven market insights built with the Algolia MCP Server.

## 🎯 **Overview**

PropTech AI Platform combines modern web technologies with artificial intelligence to deliver advanced real estate search and analysis capabilities. Built with React, AWS Lambda, Algolia MCP Server, and Amazon Bedrock Nova AI, it provides real-time property data collection, intelligent search, and comprehensive market insights.

## ✨ **Key Features**

### 🏠 **Property Data Collection**
- **Automated Data Collection**: Intelligent property data gathering from real estate sources
- **Real-time Processing**: Live property information with images, prices, and details
- **Quality Assurance**: Comprehensive data validation and filtering
- **Multi-city Support**: Flexible collection across different cities and states
- **MCP Integration**: Uses Algolia MCP Server for standardized data indexing

### 🔍 **Advanced Search & Discovery**
- **Algolia-Powered Search**: Lightning-fast property search with sub-second response times
- **Natural Language Queries**: Search using phrases like "3 bedroom houses under $500k in Parma OH"
- **Smart Filtering**: Advanced filters by price range, bedrooms, property type, and location
- **Real-time Results**: Instant search results with highlighted matches

### 🤖 **AI-Powered Insights**
- **Amazon Bedrock Nova Integration**: Advanced AI analysis for property insights
- **Investment Analysis**: Automated property investment scoring and recommendations
- **Market Intelligence**: Neighborhood analysis, market trends, and pricing insights
- **Contextual Chat**: Interactive AI assistant for property-related questions

### 🏗️ **Modern Architecture**
- **Serverless Infrastructure**: AWS Lambda with ECR container deployment
- **React Frontend**: Modern TypeScript React application with responsive design
- **CDK Infrastructure**: Complete Infrastructure as Code deployment
- **MCP Protocol**: Standardized communication with Algolia services
- **Production Ready**: Scalable, secure, and maintainable architecture

## 🚀 **Quick Start**

### Prerequisites
```bash
# Required tools
npm install -g aws-cdk
docker --version
aws --version
node --version  # v18 or higher (v22+ recommended for MCP)
```

### Environment Setup
```bash
# Clone and setup
git clone <repository-url>
cd proptech-ai-platform

# Configure environment
cp .env.example .env

# Set your configuration in .env
ALGOLIA_APPLICATION_ID=your_app_id
ALGOLIA_SEARCH_API_KEY=your_search_key  
ALGOLIA_ADMIN_API_KEY=your_admin_key
ALGOLIA_INDEX_NAME=proptech-properties-dev

# Algolia MCP Server Configuration
MCP_NODE_PATH=/path/to/your/algolia-mcp-node
MCP_SERVER_PORT=3001
```

### One-Command Deployment
```bash
# Deploy complete infrastructure
./deploy.sh
```

This automated deployment:
1. ✅ Validates environment configuration
2. ✅ Builds React frontend with TypeScript
3. ✅ Deploys AWS infrastructure (ECR, Lambda, API Gateway, S3)
4. ✅ Builds and pushes Docker container to ECR
5. ✅ Updates Lambda function with container image
6. ✅ Tests deployment health
7. ✅ Provides deployment summary with URLs

## 🔧 **MCP Server Setup**

### 1. Clone Algolia MCP Server

```bash
# Clone the official Algolia MCP server
git clone https://github.com/algolia/mcp-node.git
cd mcp-node
npm install
```

### 2. Configure Environment Variables

Update your `.env` file with the MCP server path:

```bash
# Add to your .env file
MCP_NODE_PATH=/path/to/your/algolia-mcp-node

```

### 3. Verify MCP Server

Test the MCP server independently:

```bash
# Navigate to your MCP server directory
cd /path/to/your/algolia-mcp-node

# Test server startup
node --experimental-strip-types --no-warnings=ExperimentalWarning src/app.ts start-server --help
```

## 📁 **Project Structure**

```
proptech-ai-platform/
├── src/
│   ├── lambda/
│   │   └── handler.ts              # Main Lambda handler
│   └── services/                   # Core business logic
│       ├── realty-data-service.ts  # Property data collection
│       ├── algolia-mcp-service.ts  # Search integration
│       └── bedrock-ai-service.ts   # AI insights service
├── infrastructure/
│   ├── app.ts                      # CDK application entry
│   └── stacks/
│       └── proptech-stack.ts       # Complete infrastructure stack
├── frontend/                       # React TypeScript frontend
│   ├── src/
│   │   ├── App.tsx                 # Main application component
│   │   └── App.css                 # Application styles
│   └── public/                     # Static assets
├── load-properties-mcp.js          # MCP-enabled data collection script
├── run-mcp-collection.sh           # MCP collection runner
├── deploy.sh                       # Automated deployment script
├── Dockerfile                      # Lambda container definition
├── package.json                    # Node.js dependencies
└── README.md                       # This documentation
```

## 🔧 **API Endpoints**

The platform provides a comprehensive REST API through AWS API Gateway:

### Property Management
- `POST /properties/collect` - Collect property data for specified locations
- `GET /properties/search` - Search indexed properties with advanced filtering
- `GET /properties/:id/insights` - Get AI-powered property insights

### AI Features
- `POST /chat` - Interactive chat with AI assistant
- `GET /stats` - Platform statistics and metrics

### System Health
- `GET /health` - API health status and diagnostics

## 🏠 **Property Data Collection with MCP**

### MCP-Enabled Collection Script

The platform includes an MCP-enabled script for property data collection:

```bash
# Quick start with convenience script
./run-mcp-collection.sh "Austin" "TX" 25

# Or run directly
node load-properties-mcp.js --city "Austin" --state "TX" --limit 25

# Default parameters
node load-properties-mcp.js
```

### MCP Integration Features
- **Standardized Protocol**: Uses Model Context Protocol for Algolia operations
- **Tool Discovery**: Automatically discovers available MCP tools
- **Batch Operations**: Efficient bulk indexing via MCP batch tool
- **Error Handling**: Comprehensive error handling and retry logic
- **Progress Tracking**: Detailed logging and progress indicators

### Data Quality Standards
- ✅ **Image Validation**: Only properties with valid images are indexed
- ✅ **Price Verification**: Numeric validation for realistic price ranges ($10K-$10M)
- ✅ **Address Parsing**: Intelligent address extraction and validation
- ✅ **Property Details**: Automated extraction of beds, baths, and square footage
- ✅ **URL Filtering**: Validation of property URLs and removal of non-property links

## 🔍 **Search Capabilities**

### Natural Language Search
```javascript
// Example search queries
"3 bedroom houses under $500k in Parma OH"
"Condos with 2+ bathrooms in Fairfield"
"Single family homes over 2000 sqft"
"Properties under $300k in Ohio"
```

### Advanced Filtering
- **Price Ranges**: Under $200K, $200K-$400K, $400K-$600K, Over $600K
- **Bedrooms**: 1+, 2+, 3+, 4+ bedrooms
- **Property Types**: Single Family Home, Townhouse/Condo, Condo/Apartment
- **Location**: City, state, or address-based filtering
- **Combined Filters**: Multiple filter combinations for precise results

### Search Performance
- **Sub-second Response**: Algolia-powered search with <100ms response times
- **Real-time Updates**: Live search results as you type
- **Highlighted Results**: Search term highlighting in results
- **Pagination**: Efficient handling of large result sets

## 🤖 **AI-Powered Insights**

### Amazon Bedrock Nova Integration

The platform leverages Amazon Bedrock Nova for comprehensive property analysis:

#### Investment Analysis
- **Market Valuation**: Current market value assessment
- **Appreciation Potential**: Historical and projected value trends
- **Rental Income Analysis**: Potential rental yields and cash flow
- **ROI Calculations**: Return on investment projections

#### Neighborhood Intelligence
- **Community Analysis**: School ratings, amenities, and safety metrics
- **Market Trends**: Local market conditions and price movements
- **Comparative Analysis**: Similar property comparisons
- **Location Scoring**: Walkability, transportation, and convenience ratings

#### Recommendations
- **Buyer Guidance**: Tailored recommendations for different buyer types
- **Investment Strategy**: Optimal investment approaches
- **Market Timing**: Buy/sell timing recommendations
- **Risk Assessment**: Investment risk analysis and mitigation strategies

### AI Chat Interface
- **Contextual Conversations**: Property-specific discussions
- **Market Questions**: General real estate market inquiries
- **Investment Guidance**: Personalized investment advice
- **Technical Support**: Platform usage assistance

## 🏗️ **Technical Architecture**

### MCP Integration Architecture

```
Property Collector → MCP Client → MCP Server → Algolia API
                                     ↑
                              (Standardized Protocol)
```

#### MCP Implementation Details

```javascript
// MCP Client Connection
async initializeMCPClient() {
  // Start MCP server process
  this.mcpProcess = spawn('node', [
    '--experimental-strip-types',
    '--no-warnings=ExperimentalWarning',
    `${mcpServerPath}/src/app.ts`,
    'start-server',
    '--credentials', `${this.applicationId}:${process.env.ALGOLIA_ADMIN_API_KEY}`
  ]);

  // Create MCP client with stdio transport
  const transport = new StdioClientTransport({
    reader: this.mcpProcess.stdout,
    writer: this.mcpProcess.stdin
  });

  this.mcpClient = new Client({
    name: "proptech-property-collector",
    version: "1.0.0"
  }, {
    capabilities: { tools: {} }
  });

  await this.mcpClient.connect(transport);
}

// MCP Tool Usage
async indexPropertiesMCP(properties) {
  const batchRequests = properties.map(property => ({
    action: 'addObject',
    body: property
  }));

  // Use MCP Server batch tool
  const result = await this.mcpClient.callTool('batch', {
    applicationId: this.applicationId,
    indexName: this.indexName,
    requests: batchRequests
  });
}
```

### Infrastructure Components

#### AWS Lambda (Container-based)
- **Runtime**: Node.js 18 with ECR container deployment
- **Memory**: 10GB for browser automation and AI processing
- **Timeout**: 15 minutes for comprehensive data collection
- **Concurrency**: Auto-scaling based on demand

#### Amazon API Gateway
- **REST API**: RESTful endpoints with CORS support
- **Rate Limiting**: Built-in request throttling
- **Authentication**: Ready for API key or JWT integration
- **Monitoring**: CloudWatch integration for metrics

#### Algolia Search via MCP
- **MCP Tools**: batch, saveObject, listIndices, getSettings
- **Index Management**: Automated index creation and updates via MCP
- **Search Configuration**: Optimized for property search patterns
- **Faceted Search**: Multi-dimensional filtering capabilities
- **Analytics**: Search analytics and performance monitoring

#### Amazon Bedrock Nova
- **AI Model**: Advanced language model for property insights
- **Context Awareness**: Property-specific analysis
- **Structured Responses**: Formatted insights and recommendations
- **Cost Optimization**: Efficient prompt engineering

### Frontend Architecture

#### React TypeScript Application
- **Modern React**: Hooks-based functional components
- **TypeScript**: Full type safety and developer experience
- **Responsive Design**: Mobile-first responsive layout
- **Component Architecture**: Reusable, maintainable components

#### State Management
- **React Hooks**: useState and useEffect for local state
- **Context API**: Global state for user preferences
- **Real-time Updates**: Live search and filter updates
- **Error Handling**: Comprehensive error boundaries

#### UI/UX Features
- **Professional Notifications**: Toast-based user feedback
- **Loading States**: Skeleton screens and progress indicators
- **Accessibility**: WCAG compliant interface design
- **Performance**: Optimized rendering and lazy loading

## 🔐 **Security & Best Practices**

### Infrastructure Security
- **IAM Least Privilege**: Role-based permissions for all services
- **VPC Integration**: Network isolation for sensitive operations
- **Encryption**: Data encryption in transit and at rest
- **API Security**: Rate limiting and input validation

### Code Quality
- **TypeScript**: Type safety throughout the application
- **ESLint**: Code quality and consistency enforcement
- **Error Handling**: Comprehensive error handling and logging
- **Testing**: Unit and integration testing capabilities

### Data Privacy
- **PII Protection**: No storage of personally identifiable information
- **Data Minimization**: Collection of only necessary property data
- **Retention Policies**: Automated data lifecycle management
- **Compliance**: GDPR and privacy regulation compliance

## 📊 **Performance & Monitoring**

### Performance Metrics
- **API Response Time**: <200ms average response time
- **Search Performance**: <100ms search query response
- **Data Collection**: 10-20 properties per minute collection rate
- **AI Insights**: <5 second insight generation

### Monitoring & Observability
- **CloudWatch Logs**: Comprehensive application logging
- **CloudWatch Metrics**: Performance and error metrics
- **Algolia Analytics**: Search performance and usage analytics
- **Custom Dashboards**: Business metrics and KPI tracking

### Scalability
- **Auto-scaling**: Lambda auto-scaling based on demand
- **CDN Integration**: CloudFront for global content delivery
- **Database Optimization**: Algolia index optimization
- **Caching Strategy**: Multi-layer caching for performance

## 🧪 **Testing & Quality Assurance**

### Testing Strategy
- **Unit Tests**: Service layer and utility function testing
- **Integration Tests**: API endpoint and service integration testing
- **End-to-End Tests**: Complete user workflow testing
- **Performance Tests**: Load testing and performance validation

### Quality Metrics
- **Code Coverage**: >80% test coverage target
- **Performance Benchmarks**: Response time and throughput metrics
- **Error Rates**: <1% error rate target
- **User Experience**: Core Web Vitals optimization

### Continuous Integration
- **Automated Testing**: CI/CD pipeline with automated tests
- **Code Quality Gates**: Quality checks before deployment
- **Security Scanning**: Automated security vulnerability scanning
- **Deployment Validation**: Post-deployment health checks

## 🚀 **Deployment & Operations**

### Deployment Process
1. **Environment Validation**: Verify all required environment variables
2. **Frontend Build**: Compile and optimize React application
3. **Infrastructure Deployment**: Deploy AWS resources via CDK
4. **Container Build**: Build and push Docker container to ECR
5. **Lambda Update**: Update Lambda function with new container
6. **Health Verification**: Validate deployment health and functionality

### Environment Management
- **Development**: Local development with hot reloading
- **Staging**: Pre-production environment for testing
- **Production**: Optimized production deployment
- **Configuration**: Environment-specific configuration management

### Operational Procedures
- **Monitoring**: 24/7 monitoring with alerting
- **Backup**: Automated backup and recovery procedures
- **Scaling**: Auto-scaling policies and manual scaling procedures
- **Incident Response**: Documented incident response procedures

## 🔍 **Troubleshooting**

### MCP Server Issues

#### Error: "MCP_NODE_PATH not set"
- **Solution**: Add `MCP_NODE_PATH=/path/to/mcp-node` to your `.env` file

#### Error: "MCP node path not found"
- **Solution**: Verify the path exists and points to the cloned `mcp-node` directory
- **Check**: `ls $MCP_NODE_PATH/src/app.ts` should exist

#### Error: "Missing Algolia credentials"
- **Solution**: Ensure these are set in `.env`:
  ```
  ALGOLIA_APPLICATION_ID=your_app_id
  ALGOLIA_ADMIN_API_KEY=your_admin_key
  ```

#### Error: "Node.js version too old"
- **Solution**: Upgrade to Node.js 18+ (22+ recommended)
- **Check**: `node --version`

### General Issues

#### Health Check
- Visit `$API_URL/health` for system status

#### Logs
- Use AWS CloudWatch for detailed application logs

#### Debug Mode
- Enable debug logging for development

## ✅ **Verification**

Your setup is correct when:

1. ✅ `MCP_NODE_PATH` points to valid MCP server directory
2. ✅ Algolia credentials are configured
3. ✅ MCP server starts without errors
4. ✅ Property collection completes successfully
5. ✅ Console shows "MCP Server Response: Success"

Success indicators when running the MCP-enabled version:

```
🔌 Initializing Algolia MCP Server connection...
Starting MCP server: node --experimental-strip-types...
✅ MCP Client connected successfully!
📋 Available MCP tools: batch, saveObject, listIndices, ...
📤 Indexing X properties using MCP Server...
🔧 Calling MCP batch tool...
✅ Properties indexed successfully via MCP Server!
```

## 🔮 **Future Roadmap**

### Phase 1: Enhanced AI Capabilities 
- **Advanced ML Models**: Integration with additional AI models for specialized analysis
- **Predictive Analytics**: Property value prediction and market forecasting
- **Personalization**: User-specific recommendations and preferences
- **Voice Interface**: Voice-activated search and interaction

### Phase 2: Extended Data Sources 
- **Multiple Data Providers**: Integration with additional property data sources
- **Historical Data**: Property history and transaction data
- **Market Data**: Comprehensive market statistics and trends
- **Neighborhood Data**: Detailed neighborhood demographics and amenities

### Phase 3: Advanced Features 
- **Mobile Application**: Native iOS and Android applications
- **User Accounts**: User registration and personalized experiences
- **Saved Searches**: Search alerts and notifications
- **Collaboration Tools**: Sharing and collaboration features

### Phase 4: Enterprise Features 
- **Multi-tenant Architecture**: Support for multiple organizations
- **Advanced Analytics**: Business intelligence and reporting
- **API Marketplace**: Third-party integrations and partnerships
- **White-label Solutions**: Customizable platform for partners

### Long-term Vision
- **Global Expansion**: International property markets
- **Blockchain Integration**: Property tokenization and smart contracts
- **IoT Integration**: Smart home and property technology integration
- **Sustainability Metrics**: Environmental impact and sustainability scoring

## 🤝 **Contributing**

### Development Setup
```bash
# Clone repository
git clone <repository-url>
cd proptech-ai-platform

# Install dependencies
npm install
cd frontend && npm install && cd ..

# Setup environment
cp .env.example .env
# Configure your environment variables including MCP_NODE_PATH

# Start development
npm run dev
```

### Code Standards
- **TypeScript**: All new code must be written in TypeScript
- **ESLint**: Follow established linting rules
- **Testing**: Include tests for new functionality
- **Documentation**: Update documentation for new features

### Pull Request Process
1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Update documentation
5. Submit pull request with detailed description

## 📄 **License**

MIT License - see LICENSE file for details

## 🆘 **Support & Documentation**

### Getting Help
- **Documentation**: Comprehensive documentation in this README
- **API Reference**: Detailed API documentation available
- **Examples**: Sample code and usage examples provided
- **Community**: GitHub issues for questions and support

### Contact Information
- **Issues**: GitHub Issues for bug reports and feature requests
- **Documentation**: README.md for comprehensive documentation
- **API Status**: Health endpoint for real-time system status

---

**PropTech AI Platform** - Transforming real estate intelligence through AI-powered insights and modern technology, built with the Algolia MCP Server for standardized, scalable data operations.

🏠 **Ready for Production** | 🚀 **Deploy with Confidence** | 🤖 **AI-Powered Intelligence** | 🔌 **MCP-Enabled**
