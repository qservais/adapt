import type React from "react";
import {
  XAxis as _XAxis,
  YAxis as _YAxis,
  Tooltip as _Tooltip,
  Bar as _Bar,
  Line as _Line,
  ReferenceLine as _ReferenceLine,
} from "recharts";
import type {
  XAxisProps,
  YAxisProps,
  TooltipProps,
  BarProps,
  LineProps,
  ReferenceLineProps,
} from "recharts";

export {
  ResponsiveContainer,
  LineChart,
  BarChart,
  CartesianGrid,
  Cell,
} from "recharts";

export const XAxis = _XAxis as unknown as React.FC<XAxisProps>;
export const YAxis = _YAxis as unknown as React.FC<YAxisProps>;
export const Tooltip = _Tooltip as unknown as React.FC<
  TooltipProps<number | string, string>
>;
export const Bar = _Bar as unknown as React.FC<BarProps>;
export const Line = _Line as unknown as React.FC<LineProps>;
export const ReferenceLine = _ReferenceLine as unknown as React.FC<ReferenceLineProps>;
