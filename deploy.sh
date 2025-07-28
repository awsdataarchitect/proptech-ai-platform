#!/bin/bash

set -e

echo "🚀 Starting PropTech AI Platform Deployment (Pure CDK)..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Load environment variables
if [ -f .env ]; then
    print_status "Loading environment variables from .env file..."
    export $(cat .env | grep -v '^#' | xargs)
else
    print_warning ".env file not found, using system environment variables"
fi

# Validate required environment variables
print_status "Validating environment variables..."
if [ -z "$ALGOLIA_APPLICATION_ID" ] || [ -z "$ALGOLIA_SEARCH_API_KEY" ] || [ -z "$ALGOLIA_ADMIN_API_KEY" ]; then
    print_error "Missing required Algolia environment variables"
    print_error "Please set ALGOLIA_APPLICATION_ID, ALGOLIA_SEARCH_API_KEY, and ALGOLIA_ADMIN_API_KEY"
    exit 1
fi

print_success "Environment variables validated"

# Always build fresh frontend
print_status "Building fresh frontend (removing old build)..."
rm -rf frontend/build

cd frontend

if [ ! -d "node_modules" ]; then
    print_status "Installing frontend dependencies..."
    npm install
fi

print_status "Building frontend..."
npm run build
cd ..
print_success "Frontend built successfully"

# Install root dependencies
print_status "Installing root dependencies..."
npm install

# Bootstrap CDK (if needed)
print_status "Bootstrapping CDK..."
cdk bootstrap --require-approval never 2>/dev/null || print_warning "Bootstrap already exists or failed"

# Deploy using pure CDK
print_status "Deploying with pure CDK (this will build Docker image, push to ECR, and deploy Lambda)..."
cdk deploy --require-approval never

print_success "CDK deployment completed successfully"

# Get stack outputs
print_status "Retrieving stack outputs..."
API_URL=$(cdk output ApiUrl 2>/dev/null || echo "")
FRONTEND_URL=$(cdk output FrontendUrl 2>/dev/null || echo "")
LAMBDA_NAME=$(cdk output LambdaFunctionName 2>/dev/null || echo "")
ECR_URI=$(cdk output ECRRepositoryUri 2>/dev/null || echo "")

# Test deployment (wait a bit for Lambda to be ready)
if [ -n "$API_URL" ]; then
    print_status "Testing deployment health..."
    HEALTH_URL="${API_URL%/}/health"
    print_status "Testing health endpoint: $HEALTH_URL"
    
    # Wait for the function to be ready
    sleep 15
    
    if curl -f -s "$HEALTH_URL" > /dev/null; then
        print_success "Health check passed"
    else
        print_warning "Health check failed, but deployment may still be successful"
        print_warning "The Lambda function might need a few more minutes to be ready"
    fi
else
    print_warning "API URL not found, skipping health check"
fi

# Display deployment summary
echo ""
echo "=========================================="
print_success "🎉 PURE CDK DEPLOYMENT COMPLETED!"
echo "=========================================="
echo ""
print_status "📊 Deployment Summary:"
echo "  • Deployment Type: Pure CDK with cdk-ecr-deployment"
echo "  • ECR Repository: $ECR_URI"
echo "  • Lambda Function: $LAMBDA_NAME"
echo "  • API URL: $API_URL"
echo "  • Frontend URL: $FRONTEND_URL"
echo ""
print_status "🧪 Test your deployment:"
echo "  • Health Check: curl $API_URL/health"
echo "  • Frontend: Open $FRONTEND_URL in your browser"
echo ""
print_status "📝 Next Steps:"
echo "  1. Visit the frontend URL to test the application"
echo "  2. Try collecting properties from Ohio cities (Parma, Miamisburg, Fairfield)"
echo "  3. Test the search and AI features"
echo ""
print_status "🔍 Monitoring:"
echo "  • Lambda Logs: aws logs tail /aws/lambda/$LAMBDA_NAME --follow"
echo "  • CloudWatch: Check AWS Console for detailed metrics"
echo ""
print_success "Pure CDK deployment completed at $(date)"
