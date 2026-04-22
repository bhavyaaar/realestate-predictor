import { TrendingUp, Calculator, BarChart3, Brain, MapPin, Clock } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

interface LandingPageProps {
  onNavigate: (page: string) => void;
}

export function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-stone-100 via-amber-50 to-stone-100 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block mb-4 px-4 py-2 bg-stone-200 text-stone-700 rounded-full text-sm">
              Advanced Predictive Analytics
            </div>
            <h1 className="text-5xl md:text-6xl mb-6 bg-gradient-to-r from-stone-800 via-amber-800 to-stone-700 bg-clip-text text-transparent">
              Make Informed Real Estate Decisions
            </h1>
            <p className="text-xl text-gray-700 mb-8 leading-relaxed">
              Beyond basic listings. Our platform uses predictive models and opportunity cost analysis 
              to help you make data-driven real estate decisions across any region in the United States.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => onNavigate("estimator")}
                className="bg-stone-800 hover:bg-stone-700 gap-2"
              >
                <TrendingUp className="h-5 w-5" />
                Try Cost Estimator
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => onNavigate("opportunity")}
                className="gap-2 border-2"
              >
                <Calculator className="h-5 w-5" />
                Calculate Opportunity Cost
              </Button>
            </div>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-amber-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-stone-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-amber-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </section>

      {/* What Makes Us Different */}
      <section className="py-20 bg-[#f5f0e8]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl mb-4">Why Choose RE Insights?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We go beyond basic property listings with advanced analytics and unique tools
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="border-2 hover:border-amber-600 transition-all hover:shadow-lg">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-stone-200 flex items-center justify-center mb-4">
                  <Brain className="h-6 w-6 text-stone-700" />
                </div>
                <CardTitle>Predictive Models</CardTitle>
                <CardDescription>
                  Advanced machine learning models that analyze multiple factors to predict real estate prices
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-amber-500 transition-all hover:shadow-lg">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-amber-100 flex items-center justify-center mb-4">
                  <Calculator className="h-6 w-6 text-amber-700" />
                </div>
                <CardTitle>Opportunity Cost Analysis</CardTitle>
                <CardDescription>
                  Unique tool to compare scenarios and understand the true cost of your decisions
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-stone-400 transition-all hover:shadow-lg">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-stone-100 flex items-center justify-center mb-4">
                  <MapPin className="h-6 w-6 text-stone-600" />
                </div>
                <CardTitle>Regional Insights</CardTitle>
                <CardDescription>
                  Customize analysis by state, city, or neighborhood with comprehensive data sources
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl mb-4">Powerful Features</h2>
            <p className="text-xl text-gray-600">
              Everything you need to make confident real estate decisions
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-stone-700 to-stone-800 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  Multi-Factor Cost Estimator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-stone-600 mt-1">✓</span>
                    <span>Property features (size, bedrooms, bathrooms, age)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-stone-600 mt-1">✓</span>
                    <span>Location-based pricing with regional trends</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-stone-600 mt-1">✓</span>
                    <span>Condition assessment and upgrades impact</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-stone-600 mt-1">✓</span>
                    <span>Market timing and seasonal adjustments</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-700 to-amber-800 flex items-center justify-center">
                    <Calculator className="h-5 w-5 text-white" />
                  </div>
                  Opportunity Cost Calculator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-700 mt-1">✓</span>
                    <span>Buy vs. Rent scenario comparison</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-700 mt-1">✓</span>
                    <span>Wait vs. Buy now timing analysis</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-700 mt-1">✓</span>
                    <span>Side-by-side property comparisons</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-700 mt-1">✓</span>
                    <span>Investment ROI projections</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  Visual Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">✓</span>
                    <span>Interactive price trend charts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">✓</span>
                    <span>Market condition indicators</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">✓</span>
                    <span>Comparative market analysis</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">✓</span>
                    <span>Forecast visualizations</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  Time-Based Predictions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 mt-1">✓</span>
                    <span>Historical trend analysis</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 mt-1">✓</span>
                    <span>Future price projections</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 mt-1">✓</span>
                    <span>Seasonal market patterns</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 mt-1">✓</span>
                    <span>Economic indicator integration</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Use our advanced tools to analyze real estate opportunities and make informed decisions
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => onNavigate("estimator")}
              className="bg-white text-blue-600 hover:bg-gray-100 gap-2"
            >
              <TrendingUp className="h-5 w-5" />
              Start Estimating
            </Button>
            <Button
              size="lg"
              onClick={() => onNavigate("opportunity")}
              variant="outline"
              className="border-2 border-white text-white hover:bg-white/10 gap-2"
            >
              <Calculator className="h-5 w-5" />
              Compare Scenarios
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
