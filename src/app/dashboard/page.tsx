import { redirect } from 'next/navigation';

export default function DashboardPage() {
  // Redirect to programs page (main dashboard)
  redirect('/programs');
}

