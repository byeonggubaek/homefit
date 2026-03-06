import WdogTable from "@/components/WdogTable";
import type { ChartConfig } from "@/components/ui/chart";
import WdogChartLine from "@/components/WdogChartLine";

import { useEffect, useState } from "react";
import type { WorkoutRecord, ColDesc, WorkoutSummary } from 'shared';

export default function HistoryState() {  

  const colors: string[] = ['bg-table-1', 'bg-table-2', 'bg-table-3', 'bg-table-4', 'bg-table-5'];

  const [records, setRecords] = useState<WorkoutRecord[]>([]);
  useEffect(() => {
    fetch('http://localhost:3001/api/get_workout_records?memberId=U000001')
      .then(res => res.json())
      .then(data => {
        setRecords(data.data);  
      });
  }, []);

  const [columns, setColumns] = useState<ColDesc[]>([]);
  useEffect(() => {
    fetch('http://localhost:3001/api/get_col_descs?table=WorkoutRecord')
      .then(res => res.json())
      .then(data => {
        setColumns(data.data);  
      });
  }, []);

  const [chartData, setChartData] = useState<WorkoutSummary[]>([]);
  useEffect(() => {
    fetch('http://localhost:3001/api/get_workout_pivot?memberId=U000001&from=2026-01-01&to=2026-01-03')
      .then(res => res.json())
      .then(data => {
        console.log('pivot', data.data);
        const dailyData = data.data.map(({ date, workouts }: { date: string; workouts: any }) => {
          // "2026-01-01T00:00:00" → "2026-01-01"
          const [dateOnly] = date.split("T");

          return {
            date: dateOnly,
            ...workouts
          };
        });        
        console.log('dailyData', dailyData);
        setChartData(dailyData);  
      });
  }, []); 
  const dynamicConfig = {
    "W0001_reps": { label: "신대", color: "var(--chart-1)" },
    "W0002_reps": { label: "연향동", color: "var(--chart-2)" },
    "W0003_reps": { label: "중앙동", color: "var(--chart-3)" }
  } satisfies ChartConfig;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-4">
        <div >기록</div>
        <div >{'>'}</div>
        <div className="text-focus">운동내역</div>
      </div>
      <div className="flex gap-4">
        <div className="w-1/2 border rounded-lg p-4 mb-4">
          <WdogTable columns={columns} records={records} caption="운동내역" colors={colors} />
        </div>
        <div className="w-1/2 border rounded-lg p-4 mb-4 ">
          <WdogChartLine 
            chartData={chartData} 
            chartConfig={dynamicConfig}
            xAxisKey="date"
            title="일별 운동 추이"
            description="2024년 1~3월 : 단위 횟수"
          />
        </div>
      </div>
    </div>
  );
}

