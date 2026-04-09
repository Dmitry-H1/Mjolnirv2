"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface Props {
  series: [number, number][];
}

const options: ApexOptions = {
  chart: {
    type: "line",
    toolbar: {
      show: true,
      tools: { download: false, selection: true, zoom: true, zoomin: true, zoomout: true, pan: true, reset: true },
      autoSelected: "zoom",
    },
    zoom: { enabled: true, type: "x" },
    background: "transparent",
    fontFamily: "inherit",
    animations: { enabled: true, speed: 600 },
  },
  colors: ["#9e2f2f"],
  stroke: { curve: "smooth", width: 2.5 },
  xaxis: {
    type: "datetime",
    labels: {
      style: { colors: "#62584d", fontSize: "11px" },
      datetimeUTC: false,
    },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    min: 0,
    max: 1,
    tickAmount: 5,
    decimalsInFloat: 2,
    labels: { style: { colors: "#62584d", fontSize: "11px" } },
  },
  grid: {
    borderColor: "rgba(85,63,37,0.08)",
    strokeDashArray: 4,
    padding: { left: 4, right: 4 },
  },
  annotations: {
    yaxis: [
      {
        y: 0.7,
        borderColor: "#a36714",
        borderWidth: 1.5,
        strokeDashArray: 5,
        label: {
          text: "Alert threshold",
          style: {
            color: "#a36714",
            background: "rgba(163,103,20,0.08)",
            fontSize: "10px",
            fontWeight: 600,
          },
          position: "right",
          offsetX: -8,
        },
      },
    ],
  },
  dataLabels: { enabled: false },
  tooltip: {
    x: { format: "MMM dd, HH:mm" },
    y: { formatter: (v: number) => v.toFixed(4) },
    theme: "light",
  },
  markers: { size: 0 },
};

export default function ScoreChart({ series }: Props) {
  return (
    <Chart
      type="line"
      height={220}
      series={[{ name: "Anomaly Score", data: series }]}
      options={options}
    />
  );
}
