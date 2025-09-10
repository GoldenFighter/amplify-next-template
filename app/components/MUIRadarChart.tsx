'use client';

import React from 'react';
import { RadarChart as MuiRadarChart } from '@mui/x-charts/RadarChart';

interface MUIRadarChartProps {
  data: {
    creativity: number;
    technical: number;
    composition: number;
    relevance: number;
    originality: number;
  };
  size?: number;
  className?: string;
}

export default function MUIRadarChart({ data, size = 400, className = '' }: MUIRadarChartProps) {
  // Convert our data format to MUI format
  const seriesData = [
    {
      label: 'Cat Photo Score',
      data: [
        data.creativity,
        data.technical,
        data.composition,
        data.relevance,
        data.originality
      ],
      color: '#3b82f6', // Blue color to match our theme
    }
  ];

  const metrics = [
    { name: 'Creativity', max: 100 },
    { name: 'Technical', max: 100 },
    { name: 'Composition', max: 100 },
    { name: 'Relevance', max: 100 },
    { name: 'Originality', max: 100 },
  ];

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div style={{ width: size, height: size }}>
        <MuiRadarChart
          height={size}
          width={size}
          series={seriesData}
          radar={{
            max: 100,
            metrics: metrics,
          }}
        />
      </div>
      
      {/* Custom Legend */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        {metrics.map((metric, index) => {
          const score = data[metric.name.toLowerCase() as keyof typeof data];
          const getScoreColor = (score: number) => {
            if (score >= 80) return 'text-green-600';
            if (score >= 60) return 'text-yellow-600';
            if (score >= 40) return 'text-orange-600';
            return 'text-red-600';
          };
          
          return (
            <div key={index} className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="font-medium">{metric.name}:</span>
              <span className={`font-semibold ${getScoreColor(score)}`}>
                {score}/100
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
