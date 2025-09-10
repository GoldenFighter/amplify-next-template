'use client';

import React from 'react';

interface RadarChartProps {
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

export default function RadarChart({ data, size = 300, className = '' }: RadarChartProps) {
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.35;
  
  // Convert scores to coordinates (0-100 scale to 0-1 scale)
  const getCoordinates = (score: number, angle: number) => {
    const normalizedScore = score / 100;
    const x = centerX + Math.cos(angle) * radius * normalizedScore;
    const y = centerY + Math.sin(angle) * radius * normalizedScore;
    return { x, y };
  };

  // Define the 5 criteria with their angles
  const criteria = [
    { key: 'creativity', label: 'Creativity', angle: -Math.PI / 2 }, // Top
    { key: 'technical', label: 'Technical', angle: -Math.PI / 2 + (2 * Math.PI / 5) }, // Top-right
    { key: 'composition', label: 'Composition', angle: -Math.PI / 2 + (4 * Math.PI / 5) }, // Bottom-right
    { key: 'relevance', label: 'Relevance', angle: -Math.PI / 2 + (6 * Math.PI / 5) }, // Bottom-left
    { key: 'originality', label: 'Originality', angle: -Math.PI / 2 + (8 * Math.PI / 5) }, // Top-left
  ];

  // Generate grid circles
  const gridCircles = [0.2, 0.4, 0.6, 0.8, 1.0].map((scale, index) => (
    <circle
      key={index}
      cx={centerX}
      cy={centerY}
      r={radius * scale}
      fill="none"
      stroke="#e5e7eb"
      strokeWidth="1"
    />
  ));

  // Generate grid lines (spokes)
  const gridLines = criteria.map((criterion, index) => {
    const endX = centerX + Math.cos(criterion.angle) * radius;
    const endY = centerY + Math.sin(criterion.angle) * radius;
    return (
      <line
        key={index}
        x1={centerX}
        y1={centerY}
        x2={endX}
        y2={endY}
        stroke="#e5e7eb"
        strokeWidth="1"
      />
    );
  });

  // Generate data points
  const dataPoints = criteria.map((criterion, index) => {
    const coords = getCoordinates(data[criterion.key as keyof typeof data], criterion.angle);
    return (
      <circle
        key={index}
        cx={coords.x}
        cy={coords.y}
        r="4"
        fill="#3b82f6"
        stroke="#1d4ed8"
        strokeWidth="2"
      />
    );
  });

  // Generate the filled area
  const pathData = criteria.map((criterion, index) => {
    const coords = getCoordinates(data[criterion.key as keyof typeof data], criterion.angle);
    return `${index === 0 ? 'M' : 'L'} ${coords.x} ${coords.y}`;
  }).join(' ') + ' Z';

  // Generate labels
  const labels = criteria.map((criterion, index) => {
    const coords = getCoordinates(1.1, criterion.angle); // Slightly outside the chart
    const score = data[criterion.key as keyof typeof data];
    return (
      <g key={index}>
        <text
          x={coords.x}
          y={coords.y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-sm font-medium fill-gray-700"
        >
          {criterion.label}
        </text>
        <text
          x={coords.x}
          y={coords.y + 16}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-xs font-semibold fill-blue-600"
        >
          {score}/100
        </text>
      </g>
    );
  });

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg width={size} height={size} className="overflow-visible">
        {/* Grid circles */}
        {gridCircles}
        
        {/* Grid lines */}
        {gridLines}
        
        {/* Filled area */}
        <path
          d={pathData}
          fill="rgba(59, 130, 246, 0.2)"
          stroke="rgba(59, 130, 246, 0.8)"
          strokeWidth="2"
        />
        
        {/* Data points */}
        {dataPoints}
        
        {/* Labels */}
        {labels}
        
        {/* Center point */}
        <circle
          cx={centerX}
          cy={centerY}
          r="3"
          fill="#1d4ed8"
        />
      </svg>
      
      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        {criteria.map((criterion, index) => {
          const score = data[criterion.key as keyof typeof data];
          const getScoreColor = (score: number) => {
            if (score >= 80) return 'text-green-600';
            if (score >= 60) return 'text-yellow-600';
            if (score >= 40) return 'text-orange-600';
            return 'text-red-600';
          };
          
          return (
            <div key={index} className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="font-medium">{criterion.label}:</span>
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
