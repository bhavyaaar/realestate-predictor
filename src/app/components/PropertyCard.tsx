import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Bed, Bath, Square, TrendingUp, MapPin, Heart } from "lucide-react";
import { Button } from "./ui/button";

interface PropertyCardProps {
  id: number;
  image: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  location: string;
  prediction: number;
  investmentScore?: number;
  isSaved?: boolean;
  onToggleSave?: () => void;
  onClick?: () => void;
}

export function PropertyCard({
  id,
  image,
  price,
  beds,
  baths,
  sqft,
  location,
  prediction,
  investmentScore,
  isSaved,
  onToggleSave,
  onClick,
}: PropertyCardProps) {
  return (
    <Card className="cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all bg-slate-800/50 backdrop-blur-sm border-slate-700 overflow-hidden group" onClick={onClick}>
      <div className="relative overflow-hidden">
        <img src={image} alt="Property" className="w-full h-48 object-cover transition-transform group-hover:scale-110 duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
        {investmentScore && (
          <Badge className="absolute top-3 right-3 bg-emerald-600 shadow-lg">
            Score: {investmentScore}/10
          </Badge>
        )}
        <Button
          type="button"
          size="icon"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave?.();
          }}
          className="absolute top-3 left-3 bg-slate-900/70 hover:bg-slate-900 text-white border border-slate-600"
          aria-label={isSaved ? `Remove house ${id} from saved` : `Save house ${id}`}
        >
          <Heart className={`h-4 w-4 ${isSaved ? "fill-red-400 text-red-400" : "text-white"}`} />
        </Button>
      </div>
      <CardContent className="p-4">
        <div className="mb-3">
          <div className="text-2xl text-white font-semibold">${price.toLocaleString()}</div>
          <div className="flex items-center gap-4 text-sm text-gray-400 mt-2">
            <span className="flex items-center gap-1">
              <Bed className="h-4 w-4" />
              {beds} Bed
            </span>
            <span className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              {baths} Bath
            </span>
            <span className="flex items-center gap-1">
              <Square className="h-4 w-4" />
              {sqft.toLocaleString()} sqft
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-300 mb-3">
          <MapPin className="h-4 w-4" />
          {location}
        </div>
        <Badge
          variant="outline"
          className={`${
            prediction > 0 ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/50" : "bg-red-600/20 text-red-400 border-red-500/50"
          }`}
        >
          <TrendingUp className="h-3 w-3 mr-1" />
          Predicted Value: {prediction > 0 ? "↑" : "↓"} {Math.abs(prediction)}% next year
        </Badge>
      </CardContent>
    </Card>
  );
}
