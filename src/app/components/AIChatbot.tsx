import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { MessageCircle, Send, X, Bot, User } from "lucide-react";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I'm your Collin County real estate AI assistant. I can help you with property searches, market insights, financing questions, and more. How can I help you today?",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");

  const getAIResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();

    // Property search queries
    if (lowerMessage.includes("property") || lowerMessage.includes("home") || lowerMessage.includes("house")) {
      if (lowerMessage.includes("frisco")) {
        return "Frisco is one of the hottest markets in Collin County! I found 24 properties ranging from $350k-$700k. Frisco has excellent schools (avg rating 9/10), low crime, and strong job growth (+6.2%). Would you like to see specific listings or learn about neighborhoods?";
      }
      if (lowerMessage.includes("mckinney")) {
        return "McKinney offers great value! I found 18 properties from $350k-$550k. McKinney has historic charm, top-rated schools, and family-friendly amenities. The market shows +8.3% growth projection. Want to explore specific areas?";
      }
      if (lowerMessage.includes("plano")) {
        return "Plano is perfect for families! Currently 31 listings from $400k-$650k. Plano features Fortune 500 companies, excellent schools (rating 9/10), and strong property appreciation. Interested in particular neighborhoods?";
      }
      return "I can help you find homes in Collin County! We have properties in Frisco, McKinney, Plano, Allen, and Prosper. What's your budget and preferred number of bedrooms?";
    }

    // Price/budget queries
    if (lowerMessage.includes("price") || lowerMessage.includes("cost") || lowerMessage.includes("budget") || lowerMessage.includes("afford")) {
      return "The median home price in Collin County is $475,000. Here's a breakdown: Starter homes (2-3BR) start at $250k-$400k, Family homes (3-4BR) range $400k-$600k, and Luxury properties (4+BR) go from $600k-$1M+. I can calculate what you can afford based on your income and down payment. What's your monthly budget?";
    }

    // Financing queries
    if (lowerMessage.includes("loan") || lowerMessage.includes("mortgage") || lowerMessage.includes("down payment") || lowerMessage.includes("financing")) {
      return "Great question about financing! For Collin County: Current interest rates are around 6.5-7.5%. First-time buyers can use FHA loans (3.5% down), conventional loans typically need 5-20% down. Texas offers special programs like TSAHC with down payment assistance. Would you like me to connect you with pre-approved lenders?";
    }

    // Market trends
    if (lowerMessage.includes("market") || lowerMessage.includes("trend") || lowerMessage.includes("investment") || lowerMessage.includes("appreciation")) {
      return "Collin County market is strong! 📈 Key trends: +5.4% price appreciation YoY, +3.2% population growth, +4.8% job growth, and low inventory (2.1 months). Best investment areas: Frisco (+9.2 score), McKinney (+8.5), Allen (+8.7). The market favors buyers who act quickly. Want detailed analytics?";
    }

    // School information
    if (lowerMessage.includes("school") || lowerMessage.includes("education") || lowerMessage.includes("district")) {
      return "Collin County has excellent schools! Top districts: Frisco ISD (9/10 rating), Plano ISD (9/10), Allen ISD (9/10), McKinney ISD (8/10). All districts offer advanced programs, sports, and technology. Properties near top schools typically appreciate 15-20% more. Which city interests you?";
    }

    // First time buyer
    if (lowerMessage.includes("first time") || lowerMessage.includes("first-time") || lowerMessage.includes("new buyer")) {
      return "Perfect! First-time buyers in Texas get great benefits: FHA loans (3.5% down), TSAHC loans (low rates + assistance), potential tax credits, and seller concessions. I recommend starting with homes under $400k in McKinney or Prosper. You can often get in for $15k-$25k total. Ready to explore options?";
    }

    // Location/neighborhood
    if (lowerMessage.includes("where") || lowerMessage.includes("area") || lowerMessage.includes("neighborhood") || lowerMessage.includes("location")) {
      return "Let me recommend based on your needs: Young professionals → Frisco (nightlife, jobs), Growing families → Allen/McKinney (schools, parks), Established buyers → Plano (amenities, luxury), Retirees → Prosper/McKinney (quiet, low maintenance). What's most important to you?";
    }

    // Specific numbers or ages
    if (lowerMessage.match(/\d+/)) {
      const number = parseInt(lowerMessage.match(/\d+/)?.[0] || "0");
      if (number >= 2 && number <= 6) {
        return `Looking for ${number} bedrooms? I found several options in Collin County! Typical prices: ${number}BR homes range from $${(number * 100 + 150)}k to $${(number * 150 + 200)}k. Popular areas for ${number}BR: McKinney, Frisco, and Allen. Would you like to see available listings?`;
      }
      if (number >= 100000) {
        return `With a $${(number / 1000).toFixed(0)}k budget, you have great options in Collin County! You can find quality 3-4BR homes in McKinney, Frisco, or Allen. I estimate monthly payments around $${Math.round(number * 0.006)} (with 20% down, 7% rate). Want to see properties in your range?`;
      }
    }

    // Comparison queries
    if (lowerMessage.includes("vs") || lowerMessage.includes("compare") || lowerMessage.includes("difference")) {
      return "I can compare cities, properties, or scenarios (buy vs rent, wait vs buy now). For example: Frisco vs McKinney → Frisco has more nightlife & job growth, McKinney has more charm & value. What would you like to compare?";
    }

    // General help
    if (lowerMessage.includes("help") || lowerMessage.includes("can you") || lowerMessage.includes("what can")) {
      return "I can assist with: 🏠 Property searches by city/budget/size, 📊 Market analysis & trends, 💰 Financing & affordability calculations, 🏫 School district information, 📈 Investment recommendations, ⚖️ Buy vs Rent analysis. What interests you most?";
    }

    // Default response
    return "That's a great question! While I'm still learning about Collin County real estate, I can help you with property searches, market insights, financing options, and school information. Try asking about specific cities like Frisco, McKinney, or Plano, or let me know your budget and I'll find matches!";
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    // Simulate AI response delay
    setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: getAIResponse(inputValue),
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-blue-900 hover:bg-blue-800 z-50"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[600px] flex flex-col shadow-2xl z-50 bg-white border-gray-200">
      <CardHeader className="bg-gradient-to-r from-blue-900 to-blue-700 text-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-lg">AI Assistant</CardTitle>
              <div className="flex items-center gap-2 text-xs text-blue-100">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                Online
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-2 ${message.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.sender === "user" ? "bg-blue-900" : "bg-emerald-600"
              }`}
            >
              {message.sender === "user" ? (
                <User className="h-4 w-4 text-white" />
              ) : (
                <Bot className="h-4 w-4 text-white" />
              )}
            </div>
            <div
              className={`max-w-[75%] rounded-lg p-3 ${
                message.sender === "user"
                  ? "bg-blue-900 text-white"
                  : "bg-white text-gray-800 border border-gray-200"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.text}</p>
              <p
                className={`text-xs mt-1 ${
                  message.sender === "user" ? "text-blue-200" : "text-gray-500"
                }`}
              >
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}
      </CardContent>

      <div className="p-4 border-t bg-white rounded-b-lg">
        <div className="flex gap-2">
          <Input
            placeholder="Ask about properties, prices, areas..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="bg-blue-900 hover:bg-blue-800"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2 mt-2">
          <Badge
            variant="outline"
            className="text-xs cursor-pointer hover:bg-gray-100"
            onClick={() => setInputValue("Show me homes under $400k")}
          >
            Affordable homes
          </Badge>
          <Badge
            variant="outline"
            className="text-xs cursor-pointer hover:bg-gray-100"
            onClick={() => setInputValue("Best schools in Collin County")}
          >
            Top schools
          </Badge>
        </div>
      </div>
    </Card>
  );
}
