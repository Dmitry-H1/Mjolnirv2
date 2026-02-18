"use client";

import dynamic from 'next/dynamic';
import React, { useEffect, useState } from 'react';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    async function fetchData() { 
      try { 
        const [incidentsRes, logsRes] = await Promise.all([ 
          fetch('/api/incidents'), 
          fetch('/api/logs')
        ]);

        const incidentsJson = await incidentsRes.json();
        const logsJson = await logsRes.json();

        setData({ 
          countSeries: incidentsJson.chartData.countSeries, 
          scoreSeries: logsJson.scoreSeries, 
          logs: logsJson.rows
        });

      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // --- CHART 1: INCIDENT TRENDS (COUNT) ---
  const countOptions: any = {
    chart: { id: 'count-chart', type: 'line', zoom: { enabled: true } },
    title: { text: 'Incident Volume Over Time' },
    xaxis: { type: 'datetime' },
    yaxis: { min: 0, forceNiceScale: true },
    stroke: { curve: 'smooth', width: 3 },
    colors: ['#3B82F6']
  };

  const countSeries = [{
    name: "Incident Count",
    data: data?.countSeries || []
  }];

  // --- CHART 2: SEVERITY SCORE (ANOMOLY SCORE) ---
  const severityOptions: any = {
    chart: { id: 'severity-chart', type: 'scatter', zoom: { enabled: true } },
    title: { text: 'Anomaly Severity (Anomaly Score)' },
    xaxis: { type: 'datetime' },
    yaxis: { 
      min: 0, 
      max: 1, 
      title: { text: 'Severity Score' } 
    },
    colors: ['#EF4444'],
    markers: { size: 6 }
  };

  const severitySeries = [{ 
    name: "Anomaly Score", 
    data: data?.scoreSeries || [] 
  }];

  if (loading) return <div className="p-8">Loading Dashboard...</div>;

  return (
    <main className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Incident Dashboard</h1>
      
      <div className="grid grid-cols-1 gap-8">
        {/* Chart 1: Volume */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <Chart options={countOptions} series={countSeries} type="line" height={300} />
        </div>

        {/* Chart 2: Severity */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <Chart options={severityOptions} series={severitySeries} type="scatter" height={300} />
        </div>
      </div>
    </main>
  );
}


