import React, { useState, useEffect } from 'react';
import { Home, Search, Brain, MapPin, DollarSign, Bed, Bath, Square, ExternalLink, Heart, MessageCircle, X, Send, Loader } from 'lucide-react';
import './App.css';

// Types - Updated to match actual API response structure
interface Property {
  objectID: string;     // API returns objectID, not id
  address: string;
  price: string;        
  beds?: number;        // These fields might be missing from API response
  baths?: number;       
  sqft: number;
  description: string;
  imageUrl?: string;
  propertyUrl?: string;
  priceRange: string;
  propertyType: string;
  city?: string;        // Might need to extract from address
  state?: string;       // Might need to extract from address
  collectedAt?: string; // Might be missing
}

interface ChatMessage {
  id: string;
  message: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

function App() {
  // Configuration - Dynamic API URL loading
  const [apiBaseUrl, setApiBaseUrl] = useState<string>('');
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      message: '👋 Hi! I\'m your PropTech AI assistant. I can help you with property insights, market analysis, and answer questions about real estate. How can I help you today?',
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [stats, setStats] = useState({ totalProperties: 0, totalCities: 0 });
  const [currentPropertyContext, setCurrentPropertyContext] = useState<Property | null>(null);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    priceRange: '',
    bedrooms: '',
    propertyType: '',
    location: ''
  });

  useEffect(() => {
    // Load API configuration dynamically
    const loadApiConfig = async () => {
      try {
        const response = await fetch('/config.json');
        const config = await response.json();
        setApiBaseUrl(config.apiUrl);
      } catch (error) {
        console.error('Failed to load API config, using fallback:', error);
        setApiBaseUrl(process.env.REACT_APP_API_URL || 'https://api.proptech-ai.com');
      }
    };
    
    loadApiConfig();
  }, []);

  useEffect(() => {
    if (apiBaseUrl) {
      console.log('🚀 API URL loaded, starting data fetch:', apiBaseUrl);
      const fetchData = async () => {
        try {
          console.log('📡 Calling loadProperties...');
          await loadProperties();
          // Don't call loadStats() here as loadProperties() already calculates correct stats
          console.log('✅ Data fetch completed');
        } catch (error) {
          console.error('❌ Error in data fetch:', error);
        }
      };
      fetchData();
    } else {
      console.log('⏳ API URL not ready yet');
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    filterProperties();
    updateAvailableCities();
  }, [properties, searchQuery, filters]);

  const updateAvailableCities = () => {
    const cities = new Set<string>();
    properties.forEach(property => {
      if (property.city) {
        cities.add(property.city);
      }
    });
    const sortedCities = Array.from(cities).sort();
    setAvailableCities(sortedCities);
    console.log('🏙️ Available cities updated:', sortedCities);
  };

  const loadProperties = async () => {
    if (!apiBaseUrl) {
      console.log('API URL not ready');
      return;
    }
    
    console.log('🔄 Loading properties from API...');
    setIsLoading(true);
    
    try {
      // Use search API to get all properties (empty query returns all)
      const response = await fetch(`${apiBaseUrl}/properties/search?q=`, {
        method: 'GET',
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📊 API Response:', data);
      console.log('📊 Properties received:', data.hits?.length || 0);
      
      if (Array.isArray(data.hits)) {
        console.log(`📊 Raw properties received: ${data.hits.length}`);
        
        // Filter out properties without images and process data
        const processedProperties = data.hits
          .filter((property: any) => property.imageUrl && property.imageUrl.trim() !== '')
          .map((property: any) => {
            // Extract city and state from address if not present
            let city = property.city;
            let state = property.state;
            
            if (!city || !state) {
              // Extract from address like "8293 Pine Rd, Miamisburg, OH"
              const addressParts = property.address.split(',').map((part: string) => part.trim());
              if (addressParts.length >= 2) {
                city = addressParts[addressParts.length - 2]; // Second to last part
                state = addressParts[addressParts.length - 1]; // Last part
              }
            }
            
            // Extract beds and baths from description if not present
            let beds = property.beds;
            let baths = property.baths;
            
            if (!beds || !baths) {
              const description = property.description || '';
              const bedsMatch = description.match(/(\d+)\s*bed/i);
              const bathsMatch = description.match(/(\d+(?:\.\d+)?)\s*bath/i);
              
              if (bedsMatch) beds = parseInt(bedsMatch[1]);
              if (bathsMatch) baths = parseFloat(bathsMatch[1]);
            }
            
            return {
              ...property,
              city: city || 'Unknown',
              state: state || 'Unknown',
              beds: beds || 3,
              baths: baths || 2,
              collectedAt: property.collectedAt || new Date().toISOString()
            };
          });
        
        console.log(`✅ Filtered properties with images: ${processedProperties.length}`);
        console.log('📊 First processed property sample:', processedProperties[0]);
        setProperties(processedProperties);
        
        // Update stats with processed data
        const uniqueCities = new Set(
          processedProperties
            .map((p: Property) => p.city)
            .filter((city: string) => city && city !== 'Unknown')
        );
        
        setStats({
          totalProperties: processedProperties.length,
          totalCities: uniqueCities.size
        });
        
        showNotification(`Loaded ${processedProperties.length} properties with images`, 'success');
      } else {
        console.error('❌ Invalid API response:', data);
        setProperties([]);
        showNotification('Failed to load properties - invalid response', 'error');
      }
    } catch (error) {
      console.error('❌ Error loading properties:', error);
      setProperties([]);
      showNotification(`Error loading properties: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    if (!apiBaseUrl) return;
    
    // Don't override stats if we already have them from loadProperties
    if (stats.totalProperties > 0) {
      console.log('📊 Stats already calculated from properties, skipping API call');
      return;
    }
    
    try {
      const response = await fetch(`${apiBaseUrl}/stats`);
      if (response.ok) {
        const data = await response.json();
        if (data.totalProperties !== undefined) {
          setStats({
            totalProperties: data.totalProperties,
            totalCities: data.totalCities || 0
          });
          return;
        }
      }
    } catch (error) {
      console.log('Stats endpoint not available, calculating from properties');
    }
    
    // Fallback: calculate from current properties (only if no stats yet)
    if (properties.length > 0) {
      const uniqueCities = new Set(
        properties
          .map(p => p.city)
          .filter(city => city && city !== 'Unknown')
      );
      setStats({
        totalProperties: properties.length,
        totalCities: uniqueCities.size
      });
    }
  };

  const filterProperties = () => {
    console.log('🔍 Filtering properties...', {
      totalProperties: properties.length,
      searchQuery,
      filters
    });
    
    let filtered = properties;

    // Search filter - Enhanced to handle price-based searches and more descriptive terms
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      
      filtered = filtered.filter(property => {
        // Basic text matching
        const basicMatch = 
          property.address.toLowerCase().includes(query) ||
          property.description?.toLowerCase().includes(query) ||
          property.propertyType.toLowerCase().includes(query) ||
          (property.city && property.city.toLowerCase().includes(query)) ||
          (property.state && property.state.toLowerCase().includes(query)) ||
          property.priceRange.toLowerCase().includes(query);
        
        // Enhanced price-based search
        const priceMatch = (() => {
          // Extract price number from property
          const priceNum = parseInt(property.price.replace(/[$,]/g, '')) || 0;
          
          // Handle "under X" searches
          if (query.includes('under')) {
            const underMatch = query.match(/under\s*[$]?(\d+)k?/);
            if (underMatch) {
              const searchPrice = parseInt(underMatch[1]) * (underMatch[0].includes('k') ? 1000 : 1);
              return priceNum < searchPrice;
            }
          }
          
          // Handle "over X" searches  
          if (query.includes('over') || query.includes('above')) {
            const overMatch = query.match(/(over|above)\s*[$]?(\d+)k?/);
            if (overMatch) {
              const searchPrice = parseInt(overMatch[2]) * (overMatch[0].includes('k') ? 1000 : 1);
              return priceNum > searchPrice;
            }
          }
          
          // Handle price range searches like "300k" or "$300,000"
          const priceRangeMatch = query.match(/[$]?(\d+)k?/);
          if (priceRangeMatch) {
            const searchPrice = parseInt(priceRangeMatch[1]) * (priceRangeMatch[0].includes('k') ? 1000 : 1);
            // Allow some flexibility in price matching (within 50k)
            return Math.abs(priceNum - searchPrice) < 50000;
          }
          
          return false;
        })();
        
        // Enhanced descriptive search
        const descriptiveMatch = (() => {
          // Handle bedroom searches
          if (query.includes('bed') || query.includes('br')) {
            const bedMatch = query.match(/(\d+)\s*(bed|br)/);
            if (bedMatch && property.beds) {
              return property.beds >= parseInt(bedMatch[1]);
            }
          }
          
          // Handle bathroom searches
          if (query.includes('bath') || query.includes('ba')) {
            const bathMatch = query.match(/(\d+)\s*(bath|ba)/);
            if (bathMatch && property.baths) {
              return property.baths >= parseInt(bathMatch[1]);
            }
          }
          
          // Handle house/home/property type searches
          if (query.includes('house') || query.includes('home')) {
            return property.propertyType.toLowerCase().includes('single family') ||
                   property.propertyType.toLowerCase().includes('house');
          }
          
          if (query.includes('condo') || query.includes('apartment')) {
            return property.propertyType.toLowerCase().includes('condo') ||
                   property.propertyType.toLowerCase().includes('apartment');
          }
          
          return false;
        })();
        
        return basicMatch || priceMatch || descriptiveMatch;
      });
      console.log(`🔍 After search filter: ${filtered.length} properties`);
    }

    // Price range filter
    if (filters.priceRange) {
      filtered = filtered.filter(property => {
        // Skip properties without valid prices
        if (!property.price || property.price === 'Price not available') {
          return false;
        }
        
        // Parse price string to number (e.g., "$250,000" -> 250000)
        const priceStr = property.price.replace(/[$,]/g, '');
        const priceNum = parseInt(priceStr) || 0;
        
        if (priceNum === 0) return false;
        
        switch (filters.priceRange) {
          case 'under-300k':
            return priceNum < 300000;
          case '300k-500k':
            return priceNum >= 300000 && priceNum < 500000;
          case '500k-750k':
            return priceNum >= 500000 && priceNum < 750000;
          case '750k-1m':
            return priceNum >= 750000 && priceNum < 1000000;
          case 'over-1m':
            return priceNum >= 1000000;
          default:
            return true;
        }
      });
      console.log(`🔍 After price filter: ${filtered.length} properties`);
    }

    // Bedrooms filter
    if (filters.bedrooms) {
      const minBedrooms = parseInt(filters.bedrooms);
      filtered = filtered.filter(property => (property.beds || 3) >= minBedrooms);
      console.log(`🔍 After bedrooms filter: ${filtered.length} properties`);
    }

    // Property type filter
    if (filters.propertyType) {
      filtered = filtered.filter(property => 
        property.propertyType.toLowerCase().includes(filters.propertyType.toLowerCase())
      );
      console.log(`🔍 After property type filter: ${filtered.length} properties`);
    }

    // Location filter
    if (filters.location) {
      filtered = filtered.filter(property =>
        property.address.toLowerCase().includes(filters.location.toLowerCase()) ||
        (property.city && property.city.toLowerCase().includes(filters.location.toLowerCase()))
      );
      console.log(`🔍 After location filter: ${filtered.length} properties`);
    }

    console.log(`🔍 Final filtered properties: ${filtered.length}`);
    setFilteredProperties(filtered);
  };

  // Add debugging for properties state changes
  useEffect(() => {
    console.log('📊 Properties state changed:', {
      count: properties.length,
      sample: properties.slice(0, 2)
    });
  }, [properties]);

  // Add debugging for filteredProperties state changes
  useEffect(() => {
    console.log('🎯 Filtered properties state changed:', {
      count: filteredProperties.length,
      sample: filteredProperties.slice(0, 2)
    });
  }, [filteredProperties]);

  const loadPropertiesForLocation = async (location: string) => {
    console.log('🔔 Load Properties button clicked, showing alert...');
    
    // Show professional message about service temporarily disabled
    showNotification(
      'Property collection service is temporarily unavailable due to high API traffic and system optimization. Our team is working to restore this feature. Please use the existing property data for now.',
      'info'
    );
    
    console.log('✅ Alert should be displayed now');
    return;
  };

  const loadSampleData = async () => {
    // Show professional message about service temporarily disabled
    showNotification(
      'Sample data loading is temporarily disabled while we optimize our property collection system. The current property data is already available for your review and testing.',
      'info'
    );
    return;
    
    /* Temporarily disabled - will be re-enabled after Playwright Lambda optimization
    const locations = ['Austin, TX', 'Houston, TX', 'Columbus, OH', 'Parma, OH'];
    
    for (const location of locations) {
      await loadPropertiesForLocation(location);
      // Wait a bit between locations
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    */
  };

  const getAIInsights = async (propertyId: string) => {
    try {
      if (!isChatOpen) {
        setIsChatOpen(true);
      }

      const tempMessage: ChatMessage = {
        id: Date.now().toString(),
        message: 'Getting AI insights for this property...',
        sender: 'ai',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, tempMessage]);

      const response = await fetch(`${apiBaseUrl}/properties/${propertyId}/insights`);
      
      // Remove temp message
      setChatMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));

      if (response.ok) {
        const result = await response.json();
        
        if (result.insights) {
          const insights = result.insights;
          const message = `🏠 **Property Insights**\n\n${insights}`;
          
          const insightMessage: ChatMessage = {
            id: Date.now().toString(),
            message: message,
            sender: 'ai',
            timestamp: new Date()
          };
          setChatMessages(prev => [...prev, insightMessage]);
          
          // Find the property from our current properties list
          const property = properties.find(p => p.objectID === propertyId);
          if (property) {
            setCurrentPropertyContext(property);
          }
        } else {
          const errorMessage: ChatMessage = {
            id: Date.now().toString(),
            message: 'Sorry, I couldn\'t generate insights for this property right now.',
            sender: 'ai',
            timestamp: new Date()
          };
          setChatMessages(prev => [...prev, errorMessage]);
        }
      } else {
        // Handle API error
        const errorMessage: ChatMessage = {
          id: Date.now().toString(),
          message: `AI insights service is currently unavailable (${response.status}). Please try again later.`,
          sender: 'ai',
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, errorMessage]);
      }

    } catch (error) {
      console.error('Error getting insights:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        message: 'Error connecting to AI insights service. Please try again.',
        sender: 'ai',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      message: chatInput,
      sender: 'user',
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: chatInput,
          propertyContext: currentPropertyContext
        })
      });

      const result = await response.json();

      const aiMessage: ChatMessage = {
        id: Date.now().toString(),
        message: result.response || 'Sorry, I encountered an error. Please try again.',
        sender: 'ai',
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        message: 'Sorry, I\'m having trouble connecting. Please try again.',
        sender: 'ai',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const [notifications, setNotifications] = useState<Array<{id: string, message: string, type: 'success' | 'error' | 'info'}>>([]);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    const notification = { id, message, type };
    
    // Add notification to state
    setNotifications(prev => [...prev, notification]);
    
    // Auto-remove after 5 seconds (8 seconds for info messages)
    const timeout = type === 'info' ? 8000 : 5000;
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, timeout);
    
    // Also log to console for debugging
    console.log(`${type.toUpperCase()}: ${message}`);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const PropertyCard = ({ property }: { property: Property }) => (
    <div className="property-card">
      <div className="property-image">
        {property.imageUrl ? (
          <img src={property.imageUrl} alt="Property" loading="lazy" />
        ) : (
          <div className="property-image-placeholder">
            <Home size={48} />
            <span>Property Image</span>
          </div>
        )}
        <div className="property-badge">{property.city && property.state ? `${property.city}, ${property.state}` : 'Location'}</div>
      </div>
      
      <div className="property-content">
        <div className="property-price">
          {property.price && property.price !== 'Price not available' ? property.price : 'Price Available'}
        </div>
        
        <div className="property-address">{property.address}</div>
        
        <div className="property-details">
          <div className="property-detail">
            <Bed size={16} />
            <span>{property.beds || 3} beds</span>
          </div>
          <div className="property-detail">
            <Bath size={16} />
            <span>{property.baths || 2} baths</span>
          </div>
          <div className="property-detail">
            <Square size={16} />
            <span>{property.sqft ? `${property.sqft.toLocaleString()} sqft` : '1,500 sqft'}</span>
          </div>
        </div>

        <div className="property-tags">
          <span className="property-tag price-range">{property.priceRange}</span>
          <span className="property-tag">{property.propertyType}</span>
          <span className="property-tag">
            Updated {property.collectedAt ? new Date(property.collectedAt).toLocaleDateString() : 'Recently'}
          </span>
        </div>

        <div className="property-actions">
          {property.propertyUrl && (
            <a href={property.propertyUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
              <ExternalLink size={16} />
              View Details
            </a>
          )}
          <button className="btn btn-outline btn-sm" onClick={() => getAIInsights(property.objectID)}>
            <Brain size={16} />
            AI Insights
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => showNotification(`Property ${property.objectID} saved!`, 'success')}>
            <Heart size={16} />
            Save
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="App">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <Home size={32} />
            <span>PropTech AI</span>
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={loadSampleData} disabled={isLoading}>
              {isLoading ? <Loader className="animate-spin" size={16} /> : <Search size={16} />}
              Load Sample Data
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">Intelligent Real Estate Platform</h1>
          <p className="hero-subtitle">
            Powered by Algolia MCP Server, AI-driven insights, and real-time property data collection
          </p>
          
          <div className="hero-stats">
            <div className="stat-card">
              <div className="stat-number">{stats.totalProperties}</div>
              <div className="stat-label">Properties Indexed</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.totalCities}</div>
              <div className="stat-label">Cities Covered</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">AI-Powered</div>
              <div className="stat-label">Market Insights</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">Real-time</div>
              <div className="stat-label">Data Updates</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <div className="main-container">
        {/* Control Panel */}
        <div className="control-panel">
          <div className="panel-header">
            <h2 className="panel-title">Property Data Management</h2>
            <div className="load-properties-section">
              <input 
                type="text" 
                className="location-input" 
                placeholder="Enter location (e.g., Austin TX, Columbus OH, Houston TX)"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    loadPropertiesForLocation((e.target as HTMLInputElement).value);
                  }
                }}
              />
              <button 
                className="btn btn-load" 
                onClick={() => {
                  const input = document.querySelector('.location-input') as HTMLInputElement;
                  const location = input?.value?.trim() || 'Default Location';
                  loadPropertiesForLocation(location);
                }}
                disabled={isLoading}
              >
                {isLoading ? <Loader className="animate-spin" size={16} /> : <Search size={16} />}
                Load Properties
              </button>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="control-panel">
          <div className="search-section">
            <div className="search-header">
              <h2 className="search-title">Find Your Perfect Property</h2>
              <p className="search-subtitle">Search through indexed properties with natural language queries</p>
            </div>

            <div className="search-box-container">
              <input
                type="text"
                className="search-input"
                placeholder="Search properties... (e.g., 'Austin house under $500k')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filters */}
            <div className="filters-grid">
              <div className="filter-card">
                <div className="filter-title">
                  <DollarSign size={16} />
                  Price Range
                </div>
                <select 
                  value={filters.priceRange} 
                  onChange={(e) => setFilters({...filters, priceRange: e.target.value})}
                  className="filter-select"
                >
                  <option value="">All Prices</option>
                  <option value="under-300k">Under $300k</option>
                  <option value="300k-500k">$300k - $500k</option>
                  <option value="500k-750k">$500k - $750k</option>
                  <option value="750k-1m">$750k - $1M</option>
                  <option value="over-1m">Over $1M</option>
                </select>
              </div>
              
              <div className="filter-card">
                <div className="filter-title">
                  <Bed size={16} />
                  Bedrooms
                </div>
                <select 
                  value={filters.bedrooms} 
                  onChange={(e) => setFilters({...filters, bedrooms: e.target.value})}
                  className="filter-select"
                >
                  <option value="">Any</option>
                  <option value="1">1+ bed</option>
                  <option value="2">2+ beds</option>
                  <option value="3">3+ beds</option>
                  <option value="4">4+ beds</option>
                  <option value="5">5+ beds</option>
                </select>
              </div>
              
              <div className="filter-card">
                <div className="filter-title">
                  <Home size={16} />
                  Property Type
                </div>
                <select 
                  value={filters.propertyType} 
                  onChange={(e) => setFilters({...filters, propertyType: e.target.value})}
                  className="filter-select"
                >
                  <option value="">All Types</option>
                  <option value="Single Family Home">Single Family Home</option>
                  <option value="Townhouse">Townhouse/Condo</option>
                  <option value="Condo">Condo/Apartment</option>
                </select>
              </div>
              
              <div className="filter-card">
                <div className="filter-title">
                  <MapPin size={16} />
                  Location
                </div>
                <select 
                  value={filters.location} 
                  onChange={(e) => setFilters({...filters, location: e.target.value})}
                  className="filter-select"
                >
                  <option value="">All Locations</option>
                  {availableCities.map(city => (
                    <option key={city} value={city.toLowerCase()}>{city}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="results-section">
          <div className="results-header">
            <div className="results-stats">
              {filteredProperties.length} properties found
              {searchQuery && ` for "${searchQuery}"`}
            </div>
          </div>

          <div className="property-grid">
            {filteredProperties.length > 0 ? (
              filteredProperties.map((property) => (
                <PropertyCard key={property.objectID} property={property} />
              ))
            ) : (
              <div className="no-results">
                <Home size={48} />
                <h3>No properties found</h3>
                <p>Try loading properties for your desired location first, then search again</p>
                <button className="btn btn-primary mt-4" onClick={loadSampleData}>
                  <Search size={16} />
                  Load Sample Properties
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="notifications-container">
          {notifications.map((notification) => (
            <div 
              key={notification.id} 
              className={`notification notification-${notification.type}`}
              onClick={() => removeNotification(notification.id)}
            >
              <div className="notification-content">
                <span className="notification-message">{notification.message}</span>
                <button className="notification-close" onClick={() => removeNotification(notification.id)}>
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Chat Toggle */}
      <button 
        className="ai-chat-toggle" 
        onClick={() => setIsChatOpen(!isChatOpen)}
      >
        {isChatOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* AI Chat Panel */}
      {isChatOpen && (
        <div className="ai-chat-panel">
          <div className="chat-header">
            <div className="chat-title">
              <Brain size={20} />
              PropTech AI Assistant
            </div>
            <button className="chat-close" onClick={() => setIsChatOpen(false)}>
              <X size={20} />
            </button>
          </div>
          
          <div className="chat-messages">
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`chat-message ${msg.sender}`}>
                {msg.message}
              </div>
            ))}
            {isChatLoading && (
              <div className="chat-message ai">
                <Loader className="animate-spin" size={16} />
                AI is thinking...
              </div>
            )}
          </div>
          
          <div className="chat-input-container">
            <input 
              type="text" 
              className="chat-input" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask about properties, market trends, or get insights..."
              onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
            />
            <button className="chat-send" onClick={sendChatMessage}>
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
