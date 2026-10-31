'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import type { SessionStatusBreakdown } from '@/services/analytics.service'

interface SessionDistributionProps {
  data: SessionStatusBreakdown[]
}

export function SessionDistribution({ data }: SessionDistributionProps) {
  const activeData = data.filter((d) => d.count > 0)
  const total = data.reduce((acc, d) => acc + d.count, 0)

  return (
    <Card className="border border-border/80 shadow-xs">
      <CardHeader className="p-4 sm:p-5 pb-2 border-b border-border/60">
        <CardTitle className="text-base font-semibold">Session Status Distribution</CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">
          Breakdown of all {total} planned sessions
        </p>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        {total === 0 ? (
          <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
            No study sessions generated yet
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="h-56 w-56 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    formatter={(val, name) => [`${val} sessions`, name]}
                    contentStyle={{
                      backgroundColor: 'var(--background, #fff)',
                      borderColor: 'var(--border, #e5e7eb)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Pie
                    data={activeData}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {activeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex-1 space-y-2 w-full">
              {data.map((item) => {
                const pct = total > 0 ? Math.round((item.count / total) * 100) : 0
                return (
                  <div
                    key={item.status}
                    className="flex items-center justify-between text-xs py-1 px-2 rounded-md hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-medium text-foreground">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-muted-foreground">{pct}%</span>
                      <span className="font-semibold text-foreground w-8 text-right">
                        {item.count}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

