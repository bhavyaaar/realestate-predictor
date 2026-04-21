import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { TrendingUp, Users, DollarSign, Briefcase, Award } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export function MarketInsights() {
  const priceTrends = [
    { month: "Jan", price: 450000 },
    { month: "Feb", price: 455000 },
    { month: "Mar", price: 462000 },
    { month: "Apr", price: 468000 },
    { month: "May", price: 475000 },
    { month: "Jun", price: 480000 },
  ];

  const populationGrowth = [
    { year: "2021", population: 950000 },
    { year: "2022", population: 985000 },
    { year: "2023", population: 1020000 },
    { year: "2024", population: 1055000 },
    { year: "2025", population: 1090000 },
    { year: "2026", population: 1125000 },
  ];

  const topCities = [
    { name: "Frisco", score: 9.2, growth: "+12.5%" },
    { name: "Round Rock", score: 8.8, growth: "+10.8%" },
    { name: "McKinney", score: 8.5, growth: "+9.7%" },
  ];

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl mb-2 text-white font-semibold">Market Insights & Analytics</h2>
          <p className="text-gray-400">Comprehensive market data and trends for Collin County, Texas</p>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="h-8 w-8 text-sky-400" />
                <Badge className="bg-emerald-600">+5.4%</Badge>
              </div>
              <div className="text-2xl mb-1 text-white font-semibold">$475,000</div>
              <div className="text-sm text-gray-400">Median Price</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="h-8 w-8 text-purple-400" />
                <Badge className="bg-emerald-600">+3.2%</Badge>
              </div>
              <div className="text-2xl mb-1 text-white font-semibold">1.12M</div>
              <div className="text-sm text-gray-400">Population</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Briefcase className="h-8 w-8 text-blue-400" />
                <Badge className="bg-emerald-600">+4.8%</Badge>
              </div>
              <div className="text-2xl mb-1 text-white font-semibold">Strong</div>
              <div className="text-sm text-gray-400">Job Growth</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="h-8 w-8 text-emerald-400" />
                <Badge className="bg-sky-600">Low</Badge>
              </div>
              <div className="text-2xl mb-1 text-white font-semibold">7.2/10</div>
              <div className="text-sm text-gray-400">Climate Risk</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <TrendingUp className="h-5 w-5 text-sky-400" />
                Price Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={priceTrends}>
                  <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#475569" />
                  <XAxis key="xaxis" dataKey="month" tick={{ fill: '#9ca3af' }} />
                  <YAxis key="yaxis" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: '#9ca3af' }} />
                  <Tooltip 
                    key="tooltip" 
                    formatter={(value: any) => `$${value.toLocaleString()}`}
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#fff' }}
                  />
                  <Line key="price-trend" type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 text-center">
                <Badge className="bg-emerald-600">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +5.4% Year over Year
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Users className="h-5 w-5 text-purple-400" />
                Population Growth
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={populationGrowth}>
                  <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#475569" />
                  <XAxis key="xaxis" dataKey="year" tick={{ fill: '#9ca3af' }} />
                  <YAxis key="yaxis" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fill: '#9ca3af' }} />
                  <Tooltip 
                    key="tooltip" 
                    formatter={(value: any) => value.toLocaleString()}
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#fff' }}
                  />
                  <Bar key="population" dataKey="population" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 text-center">
                <Badge className="bg-purple-600">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +3.2% Annual Growth
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gradient-to-br from-sky-900/50 to-emerald-900/30 border-sky-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Award className="h-5 w-5 text-emerald-400" />
              AI Recommendation: Best Cities to Buy in Collin County
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {topCities.map((city, idx) => (
                <Card key={city.name} className="bg-slate-800/80 backdrop-blur-sm border-slate-700">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-3xl text-gray-500">#{idx + 1}</div>
                      <Badge className="bg-emerald-600">{city.growth}</Badge>
                    </div>
                    <div className="text-xl mb-1 text-white font-semibold">{city.name}</div>
                    <div className="flex items-center gap-1 text-sm text-gray-400">
                      <TrendingUp className="h-4 w-4" />
                      Investment Score: {city.score}/10
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
