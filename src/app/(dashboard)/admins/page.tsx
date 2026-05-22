import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { adminDb } from "@/lib/firebase-admin";
import type { AppUser, UserRole } from "@/lib/types";
import { UserList } from "@/components/admins/UserList";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, Shield, UserCheck } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

async function getUsers(): Promise<AppUser[]> {
  try {
    const snapshot = await adminDb
      .collection('users')
      .where('role', 'in', ['admin', 'superadmin', 'user'] as UserRole[])
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      let createdAtString = new Date().toISOString();
      if (data.createdAt?.toDate) {
        createdAtString = data.createdAt.toDate().toISOString();
      }
      return {
        uid:       doc.id,
        email:     data.email || 'N/A',
        role:      data.role as UserRole,
        name:      data.name || 'N/A',
        createdAt: createdAtString,
      } as AppUser;
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

async function getUserStats() {
  try {
    const [total, admins, users, superadmins] = await Promise.all([
      adminDb.collection('users').count().get(),
      adminDb.collection('users').where('role', '==', 'admin').count().get(),
      adminDb.collection('users').where('role', '==', 'user').count().get(),
      adminDb.collection('users').where('role', '==', 'superadmin').count().get(),
    ]);
    return {
      total:       total.data().count,
      admins:      admins.data().count,
      users:       users.data().count,
      superadmins: superadmins.data().count,
    };
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return { total: 0, admins: 0, users: 0, superadmins: 0 };
  }
}

export default async function UserManagementPage() {
  const [users, userStats] = await Promise.all([getUsers(), getUserStats()]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Admin management</h1>
          <p className="text-muted-foreground">Manage user roles, permissions, and system access.</p>
        </div>
        <Link href="/invite?userType=admin">
          <Button className="bg-primary text-white">
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Admin
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{userStats.total}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Admins</p>
                <p className="text-2xl font-bold">{userStats.admins}</p>
              </div>
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Regular Users</p>
                <p className="text-2xl font-bold">{userStats.users}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Super Admins</p>
                <p className="text-2xl font-bold">{userStats.superadmins}</p>
              </div>
              <Shield className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            System Users
          </CardTitle>
          <CardDescription>
            Manage user accounts, roles, and permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserList initialUsers={users} />
        </CardContent>
      </Card>
    </div>
  );
}
