
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpIcon, ArrowDownIcon, BarChart3 } from 'lucide-react';

interface TrendProps {
  value: number;
  isPositive: boolean;
}
interface MetricCardProps {
  title: string;
  value: string;
  icon?: React.ReactNode;
  trend?: TrendProps | 'increase' | 'decrease' | 'neutral';
  percentage?: string;
  description?: string;
  className?: string;
  onClick?: () => void;
  accent?: 'blue' | 'green' | 'purple' | 'red';
  sparkline?: React.ReactNode;
  growth?: number;
}

const accentMap = {
  blue: "blue",
  green: "green",
  purple: "purple",
  red: "red",
  default: "blue"
};

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  icon, 
  trend, 
  percentage, 
  description,
  className,
  onClick,
  accent = 'default',
  sparkline,
  growth
}) => {
  const trendObject = typeof trend === 'object' ? trend : 
                      trend === 'increase' ? { value: 0, isPositive: true } :
                      trend === 'decrease' ? { value: 0, isPositive: false } :
                      trend === 'neutral' ? { value: 0, isPositive: true } : 
                      undefined;

  const renderTrendIcon = () => {
    if (!trendObject) return null;
    return trendObject.isPositive 
      ? <ArrowUpIcon className="h-5 w-5 text-green-600" /> 
      : <ArrowDownIcon className="h-5 w-5 text-red-500" />;
  };

  return (
    <Card 
      className={`metric-card animate-card-in ${className || ''} ${onClick ? 'cursor-pointer hover:shadow-card-hover transition-shadow' : ''}`}
      accent={accentMap[accent] || 'blue'}
    >
      <CardContent className="p-0">
        <div className="flex items-center justify-between px-6 pt-4">
          <span className="text-sm font-bold text-muted-foreground">{title}</span>
          <div className="icon-bg">
            {icon ? React.cloneElement(icon as React.ReactElement, { size: 20, color: '#1E3A8A' }) : <BarChart3 size={20} color="#1E3A8A" />}
          </div>
        </div>
        <div className="px-6 pb-4 mt-2 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary">{value}</span>
            {growth !== undefined && (
              <span className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full font-semibold ml-1">
                +{growth}%
              </span>
            )}
          </div>
          {sparkline && <div className="mt-2">{sparkline}</div>}
          {(trend || percentage) && (
            <div className="flex items-center gap-2 mt-1">
              {renderTrendIcon()}
              {trendObject && (
                <span className={`text-xs font-medium ${trendObject.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {trendObject.value > 0 ? `${trendObject.value}%` : percentage}
                </span>
              )}
              {description && (
                <span className="text-xs text-muted-foreground ml-1">{description}</span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MetricCard;
