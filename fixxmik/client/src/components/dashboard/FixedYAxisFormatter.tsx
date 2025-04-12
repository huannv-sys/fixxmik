import React from "react";
import { YAxis } from "recharts";
import { formatBytes } from "@/hooks/use-data-formatter";

export const FormattedYAxis: React.FC = () => {
  return (
    <YAxis
      tickFormatter={(value) => formatBytes(Number(value), 1)}
      tick={{ fontSize: 10, fill: "#aaa" }}
    />
  );
};
