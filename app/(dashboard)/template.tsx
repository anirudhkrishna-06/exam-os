import { PageTransition } from '@/components/layout/page-transition'

/**
 * Templates remount when a dashboard route changes, which lets the client-side
 * transition replay for every page without remounting the sidebar shell.
 */
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>
}
