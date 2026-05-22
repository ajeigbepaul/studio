"use server";

import { adminDb, adminAuth, FieldValue } from "@/lib/firebase-admin";
import type { UserRole } from "@/lib/types";
import { revalidatePath } from "next/cache";

export async function ensureAdminRoleDoc(uid: string): Promise<void> {
  if (!uid) return;
  const ref = adminDb.collection("adminRoles").doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({ createdAt: FieldValue.serverTimestamp() });
  }
}

interface ActionResult {
  success: boolean;
  message: string;
}

export async function setSuperAdminRole(uid: string, email: string): Promise<ActionResult> {
  if (email !== process.env.NEXT_PUBLIC_SUPERADMIN_EMAIL) {
    return { success: false, message: "Unauthorized: Email does not match designated superadmin email." };
  }

  try {
    const existing = await adminDb.collection('users').where('role', '==', 'superadmin').get();
    for (const doc of existing.docs) {
      if (doc.id !== uid) {
        return { success: false, message: "A superadmin account already exists for a different user." };
      }
    }

    await adminDb.collection('users').doc(uid).set(
      { email, role: 'superadmin' as UserRole, uid, createdAt: FieldValue.serverTimestamp() },
      { merge: true }
    );

    // Sync custom claim
    await adminAuth.setCustomUserClaims(uid, { role: 'superadmin' });

    return { success: true, message: "Superadmin role configured successfully." };
  } catch (error) {
    console.error("Error setting superadmin role:", error);
    return { success: false, message: "Failed to configure superadmin role." };
  }
}

export async function deleteAppUser(uid: string): Promise<ActionResult> {
  if (!uid) {
    return { success: false, message: "User ID not provided." };
  }

  const superAdminEmail = process.env.NEXT_PUBLIC_SUPERADMIN_EMAIL;
  if (superAdminEmail) {
    const userDoc = await adminDb.collection('users').doc(uid).get();
    if (userDoc.exists && userDoc.data()?.email === superAdminEmail) {
      return { success: false, message: "Superadmin account cannot be deleted through this panel." };
    }
  }

  try {
    await adminDb.collection('users').doc(uid).delete();

    // Also delete Firebase Auth user
    try {
      await adminAuth.deleteUser(uid);
    } catch (authErr) {
      console.warn(`Firestore doc deleted but Auth user ${uid} could not be removed:`, authErr);
    }

    revalidatePath("/admins");
    return { success: true, message: "User removed successfully." };
  } catch (error) {
    console.error(`Error deleting user ${uid}:`, error);
    return { success: false, message: `Failed to delete user: ${error instanceof Error ? error.message : String(error)}` };
  }
}
