import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

interface NegotiationRequest {
  repairItems: Array<{
    name: string;
    estimatedCost: number;
    laborHours?: number;
  }>;
  zipCode: string;
  vehicleInfo: {
    year: number;
    make: string;
    model: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: NegotiationRequest = await request.json();
    const { repairItems, zipCode, vehicleInfo } = body;

    // Calculate local market rates based on zip code
    const marketRates = await getLocalMarketRates(zipCode);
    
    // Get quotes from multiple repair shops (simulated)
    const quotes = repairItems.map((item) => {
      const basePrice = item.estimatedCost;
      const laborRate = marketRates.laborRate;
      const laborCost = (item.laborHours || 1) * laborRate;
      
      // Generate 3-5 competitive quotes
      const numQuotes = Math.floor(Math.random() * 3) + 3;
      const shopQuotes = [];
      
      for (let i = 0; i < numQuotes; i++) {
        const variance = 0.7 + Math.random() * 0.6; // 70% to 130% of base
        const totalCost = Math.round((basePrice + laborCost) * variance);
        const rating = 3.5 + Math.random() * 1.5;
        
        shopQuotes.push({
          shopName: generateShopName(),
          address: generateAddress(zipCode),
          rating: parseFloat(rating.toFixed(1)),
          reviewCount: Math.floor(Math.random() * 500) + 50,
          partsPrice: Math.round(basePrice * variance * 0.6),
          laborPrice: Math.round(laborCost * variance),
          totalPrice: totalCost,
          warranty: generateWarranty(),
          estimatedTime: `${item.laborHours || 1}-${(item.laborHours || 1) + 1} hours`,
          specializations: generateSpecializations(vehicleInfo),
          distance: parseFloat((Math.random() * 15).toFixed(1)),
          availability: generateAvailability(),
        });
      }
      
      // Sort by price
      shopQuotes.sort((a, b) => a.totalPrice - b.totalPrice);
      
      return {
        repairItem: item.name,
        quotes: shopQuotes,
        marketAverage: Math.round(basePrice + laborCost),
        potentialSavings: Math.round((basePrice + laborCost) - shopQuotes[0].totalPrice),
      };
    });

    // Calculate total savings
    const totalMarketAverage = quotes.reduce((sum, q) => sum + q.marketAverage, 0);
    const totalBestPrice = quotes.reduce((sum, q) => sum + q.quotes[0].totalPrice, 0);
    const totalSavings = totalMarketAverage - totalBestPrice;

    return NextResponse.json({
      success: true,
      quotes,
      summary: {
        totalMarketAverage,
        totalBestPrice,
        totalSavings,
        savingsPercentage: Math.round((totalSavings / totalMarketAverage) * 100),
      },
      marketData: marketRates,
    });

  } catch (error: any) {
    console.error('Pricing negotiation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get pricing' },
      { status: 500 }
    );
  }
}

async function getLocalMarketRates(zipCode: string) {
  // In production, integrate with actual market data APIs
  const baseLaborRate = 85;
  const variance = 0.8 + Math.random() * 0.4; // 80% to 120%
  
  return {
    zipCode,
    laborRate: Math.round(baseLaborRate * variance),
    marketIndex: parseFloat((0.9 + Math.random() * 0.2).toFixed(2)),
    competitionLevel: Math.random() > 0.5 ? 'high' : 'medium',
  };
}

function generateShopName() {
  const prefixes = ['Quick', 'Pro', 'Elite', 'Quality', 'Precision', 'Expert', 'Master'];
  const types = ['Auto', 'Car', 'Vehicle', 'Motor'];
  const suffixes = ['Repair', 'Service', 'Care', 'Works', 'Center', 'Shop'];
  
  return `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${types[Math.floor(Math.random() * types.length)]} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
}

function generateAddress(zipCode: string) {
  const streetNum = Math.floor(Math.random() * 9000) + 1000;
  const streets = ['Main St', 'Oak Ave', 'Maple Dr', 'Industrial Blvd', 'Commerce Way'];
  return `${streetNum} ${streets[Math.floor(Math.random() * streets.length)]}`;
}

function generateWarranty() {
  const periods = ['6 months', '1 year', '2 years', '3 years'];
  const types = ['parts', 'parts and labor', 'limited'];
  return `${periods[Math.floor(Math.random() * periods.length)]} ${types[Math.floor(Math.random() * types.length)]}`;
}

function generateSpecializations(vehicleInfo: any) {
  const specializations = [
    `${vehicleInfo.make} Specialist`,
    'ASE Certified',
    'Brake Specialist',
    'Engine Expert',
    'Transmission Specialist',
  ];
  const count = Math.floor(Math.random() * 3) + 1;
  return specializations.slice(0, count);
}

function generateAvailability() {
  const options = ['Today', 'Tomorrow', 'Within 2 days', 'Next week', 'Within 3 days'];
  return options[Math.floor(Math.random() * options.length)];
}
