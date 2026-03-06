import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts"
import type { ChartConfig } from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"

interface WdogChartBarProps {
  chartData: Array<Record<string, any>>  // 완전 가변 데이터
  chartConfig: ChartConfig
  xAxisKey: string,  
  title ?: string,
  description ?: string,
  className?: string
}

const WdogChartBar = ({ 
  chartData, 
  chartConfig, 
  xAxisKey = "x_title",
  title = "",
  description = "",
  className = "h-80 w-140 mt-4"
}: WdogChartBarProps) => {
  // chartConfig 키들로 동적 Bar 생성 (가변 Legend)
  const legendKeys = Object.keys(chartConfig) as (keyof ChartConfig)[]

  return (
    <Card>    
      <CardHeader className="flex flex-col items-center space-y-1.5">
        <CardTitle className="text-2xl font-bold tracking-tight">{title}</CardTitle>
        <CardDescription className=" text-primary">{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-0">   
        <ChartContainer config={chartConfig} className={className}>
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey={xAxisKey}
              tickLine={true}
              axisLine={true}
              tickMargin={10}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              tickLine={true}
              axisLine={true}
              tickMargin={10}
              tick={{ fontSize: 12 }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            
            {/* 가변 Bar: chartConfig 키만큼 자동 생성 */}
            {legendKeys.map((key) => (
              <Bar 
                key={key} 
                dataKey={key} 
                radius={4}
                fill={chartConfig[key].color}
              />
            ))}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>      
  )
}

export default WdogChartBar;