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
  catJudgeMode?: boolean;
}

export default function MUIRadarChart({ data, size = 400, className = '', catJudgeMode = false }: MUIRadarChartProps) {
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
      fillArea: true, // Enable filled area
    }
  ];

  const metrics = catJudgeMode ? [
    { name: 'Cuteness Factor', max: 100 },
    { name: 'Expression Quality', max: 100 },
    { name: 'Photo Technical Quality', max: 100 },
    { name: 'Composition Appeal', max: 100 },
    { name: 'Overall Charm', max: 100 },
  ] : [
    { name: 'Creativity', max: 100 },
    { name: 'Technical', max: 100 },
    { name: 'Composition', max: 100 },
    { name: 'Relevance', max: 100 },
    { name: 'Originality', max: 100 },
  ];

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div 
        className="w-full max-w-md mx-auto"
        style={{ 
          backgroundColor: '#f8fafc', // Light grey background
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          border: '1px solid #e2e8f0'
        }}
      >
        <div className="w-full" style={{ height: size, width: size }}>
          <MuiRadarChart
            height={size - 40}
            width={size - 40}
            series={seriesData}
            radar={{
              max: 100,
              metrics: metrics,
            }}
            slotProps={{
              tooltip: {
                trigger: 'axis',
              },
            }}
          />
        </div>
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
