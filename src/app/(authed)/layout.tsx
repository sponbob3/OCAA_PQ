import { Sidebar } from "@/components/Sidebar";
import {
  DEMO_USERS,
  getCurrentUser,
  ensureDemoUsers,
} from "@/lib/current-user";

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureDemoUsers();
  const current = await getCurrentUser();
  const personaOptions = DEMO_USERS.map((u) => ({
    id: u.id,
    name: u.name,
    role: u.role,
  }));

  return (
    <div className="relative flex min-h-screen">
      <Sidebar
        currentUser={{
          id: current.id,
          name: current.name ?? "Unknown",
          role: current.role,
        }}
        personaOptions={personaOptions}
      />
      <main className="flex-1 p-6 lg:p-10 overflow-x-auto">{children}</main>
    </div>
  );
}
