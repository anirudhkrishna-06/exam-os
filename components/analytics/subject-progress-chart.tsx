'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

interface SubjectChartData {
  name: string
  percent: number
  color: string
}

interface SubjectProgressChartProps {
  data: SubjectChartData[]
}

export function SubjectProgressChart({ data }: SubjectProgressChartProps) {
  if (data.length === 0) {
    return (
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="p-4 sm:p-5 pb-2">
          <CardTitle className="text-base font-semibold">Subject Syllabus Completion</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 flex items-center justify-center h-64 text-sm text-muted-foreground">
          No subject data available
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-border/80 shadow-xs">
      <CardHeader className="p-4 sm:p-5 pb-2 border-b border-border/60">
        <CardTitle className="text-base font-semibold">Subject Syllabus Completion</CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">
          Weighted progress percent per subject
        </p>
      </CardHeader>
      <CardContent className="p-4 sm:p-5 pt-6">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                interval={0}
                angle={-15}
                textAnchor="end"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11 }}
                unit="%"
              />
              <Tooltip
                formatter={(val) => [`${val ?? 0}%`, 'Completion']}
                contentStyle={{
                  backgroundColor: 'var(--background, #fff)',
                  borderColor: 'var(--border, #e5e7eb)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="percent" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || '#6366f1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

