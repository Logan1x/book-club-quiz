import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminHome() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Admin</CardTitle>
          <CardDescription>
            If <span className="font-mono">ADMIN_KEY</span> is set, include it as <span className="font-mono">?key=...</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Link className="block underline" href="/admin/cohorts">
            Cohorts
          </Link>
          <Link className="block underline" href="/admin/quizzes/import">
            Import quiz
          </Link>
          <Link className="block underline" href="/admin/analytics">
            Analytics
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
