"use client";

import dynamic from 'next/dynamic';
import React, { useEffect, useState } from 'react';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

export default function Home() {
  const [chartData, setChartData] = useState<{categories: string[], data: number[]}>({
    categories: [],
    data: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/incidents');
        const json = await response.json();
        
        setChartData({
          categories: json.chartData.categories,
          data: json.chartData.seriesData
        });
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const chartOptions: any = {
    chart: { type: 'line', zoom: { enabled: false } },
    stroke: { curve: 'straight' },
    title: { text: 'Live Incident Trends from BigQuery' },
    xaxis: { categories: chartData.categories },
  };

  const chartSeries = [{
    name: "Incidents",
    data: chartData.data
  }];

  if (loading) return <div className="p-8">Loading Chart...</div>;

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-6">Incident Dashboard</h1>
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
        <Chart options={chartOptions} series={chartSeries} type="line" height={350} />
      </div>
    </main>
  );
}