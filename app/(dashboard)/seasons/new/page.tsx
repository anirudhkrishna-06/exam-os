import { SeasonForm } from '@/components/seasons/season-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = {
  title: 'New season | ExamOS',
}

export default function NewSeasonPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create exam season</h1>
        <p className="text-muted-foreground mt-1">
          Add a new exam season with subjects and examination dates
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Season details</CardTitle>
          <CardDescription>
            Enter your exam season details and add all subjects you'll be preparing for
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SeasonForm />
        </CardContent>
      </Card>
    </div>
  )
}

