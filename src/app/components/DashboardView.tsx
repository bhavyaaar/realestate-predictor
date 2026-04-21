import { useState } from "react";
import { FilterSidebar } from "./FilterSidebar";
import { PropertyCard } from "./PropertyCard";
import { PropertyDetailsPanel } from "./PropertyDetailsPanel";
import { MarketInsights } from "./MarketInsights";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { LayoutGrid, BarChart3 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export function DashboardView() {
  const { saveHouse, removeHouse, isHouseSaved } = useAuth();
  const [filters, setFilters] = useState({
    priceMin: "",
    priceMax: "",
    bedrooms: "any",
    bathrooms: "any",
    propertyType: "all",
    schoolRating: [7],
    investmentScore: [7],
  });

  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [activeView, setActiveView] = useState<"properties" | "insights">("properties");

  const handleToggleSaved = async (property: any) => {
    const propertyId = String(property.id);
    if (isHouseSaved(propertyId)) {
      await removeHouse(propertyId);
      return;
    }

    await saveHouse({
      propertyId,
      image: property.image,
      price: property.price,
      beds: property.beds,
      baths: property.baths,
      sqft: property.sqft,
      location: property.location,
      prediction: property.prediction,
      investmentScore: property.investmentScore,
    });
  };

  // Mock property data
  const properties = [
    {
      id: 1,
      image: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&h=300&fit=crop",
      price: 525000,
      beds: 4,
      baths: 3,
      sqft: 2400,
      location: "Austin, TX",
      prediction: 7.2,
      investmentScore: 8.4,
      images: ["https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=600&fit=crop"],
      priceHistory: [
        { year: "2021", price: 425000 },
        { year: "2022", price: 455000 },
        { year: "2023", price: 485000 },
        { year: "2024", price: 510000 },
        { year: "2025", price: 525000 },
        { year: "2026", price: 563000 },
      ],
      neighborhood: {
        crimeIndex: "Low",
        schoolRating: 9,
        walkability: 72,
        jobGrowth: "+4.8%",
      },
    },
    {
      id: 2,
      image: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&h=300&fit=crop",
      price: 385000,
      beds: 3,
      baths: 2,
      sqft: 1850,
      location: "Frisco, TX",
      prediction: 9.5,
      investmentScore: 9.2,
      images: ["https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=600&fit=crop"],
      priceHistory: [
        { year: "2021", price: 305000 },
        { year: "2022", price: 328000 },
        { year: "2023", price: 352000 },
        { year: "2024", price: 370000 },
        { year: "2025", price: 385000 },
        { year: "2026", price: 422000 },
      ],
      neighborhood: {
        crimeIndex: "Very Low",
        schoolRating: 10,
        walkability: 68,
        jobGrowth: "+6.2%",
      },
    },
    {
      id: 3,
      image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=300&fit=crop",
      price: 695000,
      beds: 5,
      baths: 4,
      sqft: 3200,
      location: "Round Rock, TX",
      prediction: 6.8,
      investmentScore: 8.8,
      images: ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop"],
      priceHistory: [
        { year: "2021", price: 575000 },
        { year: "2022", price: 610000 },
        { year: "2023", price: 645000 },
        { year: "2024", price: 675000 },
        { year: "2025", price: 695000 },
        { year: "2026", price: 742000 },
      ],
      neighborhood: {
        crimeIndex: "Low",
        schoolRating: 8,
        walkability: 65,
        jobGrowth: "+5.1%",
      },
    },
    {
      id: 4,
      image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=300&fit=crop",
      price: 445000,
      beds: 3,
      baths: 2.5,
      sqft: 2100,
      location: "McKinney, TX",
      prediction: 8.3,
      investmentScore: 8.5,
      images: ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop"],
      priceHistory: [
        { year: "2021", price: 365000 },
        { year: "2022", price: 390000 },
        { year: "2023", price: 415000 },
        { year: "2024", price: 432000 },
        { year: "2025", price: 445000 },
        { year: "2026", price: 482000 },
      ],
      neighborhood: {
        crimeIndex: "Low",
        schoolRating: 9,
        walkability: 70,
        jobGrowth: "+4.5%",
      },
    },
    {
      id: 5,
      image: "https://images.unsplash.com/photo-1605146769289-440113cc3d00?w=400&h=300&fit=crop",
      price: 575000,
      beds: 4,
      baths: 3.5,
      sqft: 2800,
      location: "Plano, TX",
      prediction: 7.8,
      investmentScore: 8.7,
      images: ["https://images.unsplash.com/photo-1605146769289-440113cc3d00?w=800&h=600&fit=crop"],
      priceHistory: [
        { year: "2021", price: 475000 },
        { year: "2022", price: 505000 },
        { year: "2023", price: 535000 },
        { year: "2024", price: 558000 },
        { year: "2025", price: 575000 },
        { year: "2026", price: 620000 },
      ],
      neighborhood: {
        crimeIndex: "Low",
        schoolRating: 9,
        walkability: 75,
        jobGrowth: "+5.3%",
      },
    },
    {
      id: 6,
      image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400&h=300&fit=crop",
      price: 425000,
      beds: 3,
      baths: 2,
      sqft: 1950,
      location: "Denton, TX",
      prediction: 6.5,
      investmentScore: 7.9,
      images: ["https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop"],
      priceHistory: [
        { year: "2021", price: 355000 },
        { year: "2022", price: 378000 },
        { year: "2023", price: 398000 },
        { year: "2024", price: 412000 },
        { year: "2025", price: 425000 },
        { year: "2026", price: 453000 },
      ],
      neighborhood: {
        crimeIndex: "Medium",
        schoolRating: 8,
        walkability: 68,
        jobGrowth: "+3.9%",
      },
    },
  ];

  return (
    <div className="flex" style={{ height: "calc(100vh - 64px)" }}>
      {/* Left Sidebar - Filters */}
      <FilterSidebar filters={filters} onFilterChange={setFilters} />

      {/* Center - Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
        {/* View Toggle */}
        <div className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-700/50 px-6 py-3">
          <div className="flex items-center gap-2">
            <Button
              variant={activeView === "properties" ? "default" : "ghost"}
              onClick={() => setActiveView("properties")}
              className={`gap-2 ${activeView === "properties" ? "bg-sky-600 hover:bg-sky-500" : "text-gray-300 hover:text-white hover:bg-slate-800"}`}
            >
              <LayoutGrid className="h-4 w-4" />
              Properties
            </Button>
            <Button
              variant={activeView === "insights" ? "default" : "ghost"}
              onClick={() => setActiveView("insights")}
              className={`gap-2 ${activeView === "insights" ? "bg-sky-600 hover:bg-sky-500" : "text-gray-300 hover:text-white hover:bg-slate-800"}`}
            >
              <BarChart3 className="h-4 w-4" />
              Market Insights
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {activeView === "properties" ? (
            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl text-white mb-1 font-semibold">Available Properties</h2>
                  <p className="text-gray-400">{properties.length} homes found in Collin County, Texas</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-slate-800/50 backdrop-blur-sm text-gray-300 border-slate-700">
                    Sort: Best Match
                  </Badge>
                  <Badge variant="outline" className="bg-slate-800/50 backdrop-blur-sm text-gray-300 border-slate-700">
                    Investment Score: High to Low
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {properties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    {...property}
                    isSaved={isHouseSaved(String(property.id))}
                    onToggleSave={() => handleToggleSaved(property)}
                    onClick={() => setSelectedProperty(property)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <MarketInsights />
          )}
        </div>
      </div>

      {/* Right Panel - Property Details */}
      <PropertyDetailsPanel property={selectedProperty} />
    </div>
  );
}
