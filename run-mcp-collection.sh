#!/bin/bash

# PropTech AI Platform - MCP Property Collection Runner
# This script runs the MCP-compliant property collection with our custom implementation

echo "🎯 PropTech AI Platform - MCP Property Collection"
echo "============================================================"

# Load environment variables from .env file
if [ -f .env ]; then
    echo "📋 Loading environment variables from .env file..."
    export $(grep -v '^#' .env | xargs)
else
    echo "⚠️  Warning: .env file not found. Please ensure environment variables are set."
fi

# Check if required environment variables are set
if [ -z "$ALGOLIA_APPLICATION_ID" ] || [ -z "$ALGOLIA_ADMIN_API_KEY" ]; then
    echo "❌ Error: Missing Algolia credentials"
    echo "Please ensure ALGOLIA_APPLICATION_ID and ALGOLIA_ADMIN_API_KEY are set in .env"
    exit 1
fi

echo "✅ Algolia credentials configured"

# Check if index name is set
if [ -z "$ALGOLIA_INDEX_NAME" ]; then
    echo "⚠️  Warning: ALGOLIA_INDEX_NAME not set, using default: proptech-properties-dev"
    export ALGOLIA_INDEX_NAME="proptech-properties-dev"
fi

echo "✅ Algolia index: $ALGOLIA_INDEX_NAME"

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Error: Node.js version $NODE_VERSION detected. Requires Node 18+"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if required packages are installed
if ! npm list algoliasearch > /dev/null 2>&1; then
    echo "❌ Error: algoliasearch package not found"
    echo "Please run: npm install"
    exit 1
fi

if ! npm list playwright > /dev/null 2>&1; then
    echo "❌ Error: playwright package not found"
    echo "Please run: npm install"
    exit 1
fi

echo "✅ Required packages installed"

# Default parameters
CITY="${1:-Houston}"
STATE="${2:-TX}"
LIMIT="${3:-5}"

echo ""
echo "🏠 Collection Parameters:"
echo "   City: $CITY"
echo "   State: $STATE"
echo "   Limit: $LIMIT properties"
echo ""

# Validate parameters
if [ -z "$CITY" ] || [ -z "$STATE" ]; then
    echo "❌ Error: City and State are required"
    echo ""
    echo "Usage: $0 [CITY] [STATE] [LIMIT]"
    echo ""
    echo "Examples:"
    echo "  $0 Austin TX 10"
    echo "  $0 Columbus OH 15"
    echo "  $0 \"New York\" NY 20"
    echo ""
    exit 1
fi

# Validate limit is a number
if ! [[ "$LIMIT" =~ ^[0-9]+$ ]] || [ "$LIMIT" -lt 1 ] || [ "$LIMIT" -gt 50 ]; then
    echo "❌ Error: Limit must be a number between 1 and 50"
    exit 1
fi

echo "🚀 Starting MCP property collection..."
echo "============================================================"

# Run the MCP property collection script
node load-properties-mcp.js --city "$CITY" --state "$STATE" --limit "$LIMIT"

# Capture exit code
EXIT_CODE=$?

echo ""
echo "============================================================"

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ MCP property collection completed successfully!"
    echo ""
    echo "📊 Next Steps:"
    echo "   • Check your Algolia dashboard to verify the indexed properties"
    echo "   • Run the frontend to search and view the collected properties"
    echo "   • Use the AWS Lambda deployment for production scaling"
    echo ""
else
    echo "❌ MCP property collection failed with exit code: $EXIT_CODE"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "   • Check your .env file for correct Algolia credentials"
    echo "   • Ensure you have a stable internet connection"
    echo "   • Verify the target city/state combination exists"
    echo "   • Check the console output above for specific error details"
    echo ""
fi

exit $EXIT_CODE
