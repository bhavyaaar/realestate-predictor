import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Bed, Bath, Square, MapPin, TrendingUp, AlertCircle, School, Car } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface PropertyDetailsPanelProps {
  property: {
    images: string[];
    price: number;
    beds: number;
    baths: number;
    sqft: number;
    location: string;
    prediction: number;
    investmentScore: number;
    priceHistory: Array<{ year: string; price: number }>;
    neighborhood: {
      crimeIndex: string;
      schoolRating: number;
      walkability: number;
      jobGrowth: string;
    };
  } | null;
}

export function PropertyDetailsPanel({ property }: PropertyDetailsPanelProps) {
  if (!property) {
    return (
      <div className="w-96 bg-slate-900/50 backdrop-blur-sm border-l border-slate-700/50 h-full flex items-center justify-center p-6">
        <div className="text-center text-gray-400">
          <MapPin className="h-16 w-16 mx-auto mb-4 text-gray-600" />
          <p>Select a property to view details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-96 bg-slate-900/50 backdrop-blur-sm border-l border-slate-700/50 h-full overflow-y-auto">
      {/* Image Gallery */}
      <div className="relative">
        <img src={property.images[0]} alt="Property" className="w-full h-64 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
        <Badge className="absolute top-4 right-4 bg-emerald-600 text-white shadow-lg">
          Investment Score: {property.investmentScore}/10
        </Badge>
      </div>

      <div className="p-6 space-y-6">
        {/* Price and Basic Info */}
        <div>
          <div className="text-3xl mb-2 text-white font-semibold">${property.price.toLocaleString()}</div>
          <div className="flex items-center gap-1 text-gray-400 mb-3">
            <MapPin className="h-4 w-4" />
            <span>{property.location}</span>
          </div>
          <div className="flex items-center gap-4 text-gray-300">
            <span className="flex items-center gap-2">
              <Bed className="h-5 w-5 text-sky-400" />
              {property.beds} Beds
            </span>
            <span className="flex items-center gap-2">
              <Bath className="h-5 w-5 text-sky-400" />
              {property.baths} Baths
            </span>
            <span className="flex items-center gap-2">
              <Square className="h-5 w-5 text-sky-400" />
              {property.sqft.toLocaleString()} sqft
            </span>
          </div>
        </div>

        {/* Price Prediction */}
        <Card className="bg-gradient-to-br from-emerald-600/20 to-emerald-700/10 border-emerald-500/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-emerald-400">
              <TrendingUp className="h-4 w-4" />
              Price Prediction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-emerald-300 mb-1 font-semibold">
              {property.prediction > 0 ? "↑" : "↓"} {Math.abs(property.prediction)}%
            </div>
            <div className="text-sm text-emerald-400">Expected growth next year</div>
          </CardContent>
        </Card>

        {/* Price History Chart */}
        <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
          <CardHeader>
            <CardTitle className="text-sm text-white">Price Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={property.priceHistory}>
                <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#475569" />
                <XAxis key="xaxis" dataKey="year" tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis key="yaxis" tick={{ fontSize: 12, fill: '#9ca3af' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip 
                  key="tooltip" 
                  formatter={(value: any) => `$${value.toLocaleString()}`}
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#fff' }}
                />
                <Line key="price" type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Neighborhood Stats */}
        <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
          <CardHeader>
            <CardTitle className="text-sm text-white">Neighborhood Intelligence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-gray-300">
                <AlertCircle className="h-4 w-4 text-sky-400" />
                Crime Index
              </span>
              <Badge variant="outline" className="bg-emerald-600/20 text-emerald-400 border-emerald-500/50">
                {property.neighborhood.crimeIndex}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-gray-300">
                <School className="h-4 w-4 text-sky-400" />
                School Rating
              </span>
              <Badge variant="outline" className="bg-blue-600/20 text-blue-400 border-blue-500/50">
                {property.neighborhood.schoolRating}/10
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-gray-300">
                <Car className="h-4 w-4 text-sky-400" />
                Walkability
              </span>
              <Badge variant="outline" className="bg-purple-600/20 text-purple-400 border-purple-500/50">
                {property.neighborhood.walkability}/100
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-gray-300">
                <TrendingUp className="h-4 w-4 text-sky-400" />
                Job Growth
              </span>
              <Badge variant="outline" className="bg-emerald-600/20 text-emerald-400 border-emerald-500/50">
                {property.neighborhood.jobGrowth}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Investment Analysis */}
        <Card className="bg-gradient-to-br from-blue-600/20 to-sky-600/10 border-sky-500/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-sm text-sky-300">Investment Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-sky-400">Population Growth</span>
              <span className="text-white font-medium">High</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sky-400">Job Market</span>
              <span className="text-white font-medium">Strong</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sky-400">Price Trend</span>
              <span className="text-white font-medium">Rising</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
