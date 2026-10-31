'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import type { WeeklyCompletionPoint } from '@/services/analytics.service'

interface WeeklyCompletionChartProps {
  data: WeeklyCompletionPoint[]
}

export function WeeklyCompletionChart({ data }: WeeklyCompletionChartProps) {
  if (data.length === 0) {
    return (
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="p-4 sm:p-5 pb-2">
          <CardTitle className="text-base font-semibold">Weekly Study Velocity</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 flex items-center justify-center h-64 text-sm text-muted-foreground">
          No weekly history recorded yet
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-border/80 shadow-xs">
      <CardHeader className="p-4 sm:p-5 pb-2 border-b border-border/60">
        <CardTitle className="text-base font-semibold">Weekly Study Velocity</CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">
          Completed vs Scheduled sessions by week
        </p>
      </CardHeader>
      <CardContent className="p-4 sm:p-5 pt-6">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--background, #fff)',
                  borderColor: 'var(--border, #e5e7eb)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="scheduled" name="Scheduled" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="skipped" name="Skipped/Overdue" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

