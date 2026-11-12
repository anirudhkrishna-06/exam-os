import { RegisterForm } from '@/components/auth/register-form'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { isRegistrationEnabled } from '@/services/app-settings.service'

export const metadata = {
  title: 'Create account | paramaa... padi da',
}

export const instant = false

export default async function RegisterPage() {
  const registrationEnabled = await isRegistrationEnabled()
  if (!registrationEnabled) {
    return <div className="flex min-h-screen items-center justify-center bg-background p-4"><Card className="w-full max-w-sm"><CardHeader><CardTitle>Enrollment is closed</CardTitle><CardDescription>New Paramaa accounts are not being accepted right now.</CardDescription></CardHeader><CardContent><a href="/login" className="text-sm text-primary underline underline-offset-4">Return to login</a></CardContent></Card></div>
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Image src="/logo_parama.png" alt="paramaa... padi da" width={710} height={302} priority className="mx-auto h-12 w-auto" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Create your account</CardTitle>
            <CardDescription>Get started in seconds</CardDescription>
          </CardHeader>
          <CardContent>
            <RegisterForm />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

