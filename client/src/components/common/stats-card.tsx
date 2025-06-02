import { Card, CardContent } from "@/components/ui/card";
import { ArrowUp, ArrowDown } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
}

export default function StatsCard({ title, value, icon, trend, trendUp }: StatsCardProps) {
  return (
    <Card className="glassmorphism border-white/20 shadow-lg card-hover">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/70 text-sm">{title}</p>
            <p className="text-white text-2xl font-bold">{value}</p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <div className="text-white">
              {icon}
            </div>
          </div>
        </div>
        {trend && (
          <div className={`mt-4 flex items-center gap-1 text-sm ${
            trendUp ? 'text-green-300' : 'text-red-300'
          }`}>
            {trendUp ? (
              <ArrowUp className="w-4 h-4" />
            ) : (
              <ArrowDown className="w-4 h-4" />
            )}
            <span>{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
