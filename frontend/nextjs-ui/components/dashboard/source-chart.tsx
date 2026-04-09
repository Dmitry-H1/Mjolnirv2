"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface Props {
  categories: string[];
  data: number[];
}

export default function SourceChart({ categories, data }: Props) {
  const options: ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      background: "transparent",
      fontFamily: "inherit",
      animations: { enabled: true, speed: 600 },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 5,
        barHeight: "60%",
      },
    },
    colors: ["#295b3f"],
    xaxis: {
      categories,
      labels: { style: { colors: "#62584d", fontSize: "11px" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: "#62584d", fontSize: "11px" },
        maxWidth: 180,
      },
    },
    grid: {
      borderColor: "rgba(85,63,37,0.08)",
      strokeDashArray: 4,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: false } },
    },
    dataLabels: { enabled: false },
    tooltip: { theme: "light" },
  };

  const height = Math.max(categories.length * 40 + 60, 200);

  return (
    <Chart
      type="bar"
      height={height}
      series={[{ name: "Log Count", data }]}
      options={options}
    />
  );
}
