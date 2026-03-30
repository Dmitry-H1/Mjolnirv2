"use client";

import dynamic from 'next/dynamic';
import React, { useEffect, useState } from 'react';
import { useRouter } from "next/navigation";

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

export default function Home() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      router.push("/login");
    } else {
      setCheckingAuth(false);
    }
  }, [router]);

  useEffect(() => { 
    if (checkingAuth) return; 

    async function fetchData() { 
      try { 
        const res = await fetch('/api/metrics');
        const json = await res.json();

        setData({
          countSeries: json.countSeries,
          scoreSeries: json.scoreSeries,
          sourceObjectSeries: json.sourceObjectSeries
        });

      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [checkingAuth]);

  if (checkingAuth) return null;

  if (loading) return <div className="p-8">Loading Dashboard...</div>;

  // --- CHART 1: INCIDENT VOLUME ---
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

  // --- CHART 2: ANOMALY SCORE ---
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

  // --- CHART 3: SOURCE OBJECT BAR GRAPH ---
  const sourceOptions: any = {
    chart: { id: 'source-chart', type: 'bar' },
    title: { text: 'Incidents by Source Object' },
    xaxis: {
      categories: data?.sourceObjectSeries?.categories || [],
      labels: { rotate: -30 }
    },
    yaxis: {
      title: { text: 'Log Count' }
    },
    colors: ['#10B981'],
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: '60%'
      }
    }
  };

  const sourceSeries = [{
    name: "Logs",
    data: data?.sourceObjectSeries?.data || []
  }];

  return (
    <main className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">
        Incident Dashboard
      </h1>
      
      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <Chart options={countOptions} series={countSeries} type="line" height={300} />
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <Chart options={severityOptions} series={severitySeries} type="scatter" height={300} />
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <Chart options={sourceOptions} series={sourceSeries} type="bar" height={350} />
        </div>
      </div>
    </main>
  );
}