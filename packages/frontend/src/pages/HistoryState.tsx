import WdogTable from "@/components/WdogTable";
import WdogChartLine from "@/components/WdogChartLine";

import type { ChartConfig } from "@/components/ui/chart";
import { useEffect, useState } from "react";
import type { WorkoutRecord, ColDesc } from 'shared';
import { Dumbbell, HeartPulse, Activity, Users } from "lucide-react"
import { addIconsToConfig, createWorkoutChartConfig } from "@/lib/utils";

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

  const [chartConfig, setChartConfig] = useState<ChartConfig>({});
  const [chartData, setChartData] = useState<any[]>([]);
  useEffect(() => {
    fetch('http://localhost:3001/api/get_workout_pivot?memberId=U000001&from=2026-01-01&to=2026-01-31')
      .then(res => res.json())
      .then(data => {
        setChartData(data.data.data);
        console.log('pivot data', data.data.data);
        const config = createWorkoutChartConfig(data.data.columns); 
        setChartConfig(config);
      });
  }, []); 
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-4">
        <div >기록</div>
        <div >{'>'}</div>
        <div className="text-focus">운동내역</div>
      </div>
      <div className="flex gap-4">
        <div className="w-1/2 border rounded-lg p-4 mb-4">
          <WdogTable columns={columns} records={records} caption="운동내역"/>
        </div>
        <div className="w-1/2 border rounded-lg p-4 mb-4 ">
          <WdogChartLine 
            chartData={chartData} 
            chartConfig={chartConfig}
            xAxisKey="wo_dt"
            title="일별 운동 추이"
            description="2024년 1~3월 : 단위 횟수"
          />
        </div>
      </div>
    </div>
  );
}

