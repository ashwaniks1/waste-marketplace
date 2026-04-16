import { AppHeader } from "@/components/AppHeader";
import { prisma } from "@/lib/prisma";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <>
      <AppHeader title="Users" backHref="/admin" role="admin" />
      <div className="divide-y divide-slate-200 px-4 pt-4">
        {users.map((u) => (
          <div key={u.id} className="flex flex-col gap-1 py-3">
            <p className="font-semibold text-slate-900">{u.name}</p>
            <p className="text-sm text-slate-600">{u.email}</p>
            <span className="w-fit rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
              {u.role}
            </span>
            {u.phone ? <p className="text-xs text-slate-500">{u.phone}</p> : null}
          </div>
        ))}
        {users.length === 0 ? <p className="py-6 text-sm text-slate-600">No users yet.</p> : null}
      </div>
    </>
  );
}
