"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface Props {
  series: [number, number][];
}

const options: ApexOptions = {
  chart: {
    type: "area",
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
  colors: ["#9f3b27"],
  fill: {
    type: "gradient",
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.3,
      opacityTo: 0.01,
      stops: [0, 100],
    },
  },
  stroke: { curve: "smooth", width: 2 },
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
    labels: { style: { colors: "#62584d", fontSize: "11px" } },
    min: 0,
  },
  grid: {
    borderColor: "rgba(85,63,37,0.08)",
    strokeDashArray: 4,
    padding: { left: 4, right: 4 },
  },
  dataLabels: { enabled: false },
  tooltip: {
    x: { format: "MMM dd, HH:mm" },
    theme: "light",
  },
  markers: { size: 0 },
};

export default function CountChart({ series }: Props) {
  return (
    <Chart
      type="area"
      height={220}
      series={[{ name: "Log Count", data: series }]}
      options={options}
    />
  );
}
