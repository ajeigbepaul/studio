"use server";

import type { CounsellorStatus } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { adminDb, FieldValue } from "@/lib/firebase-admin";

export async function deleteCounselorAction(counsellorId: string): Promise<{ success: boolean; message: string }> {
  if (!counsellorId) return { success: false, message: "Counsellor ID not provided." };
  try {
    await adminDb.collection("counselors").doc(counsellorId).delete();
    revalidatePath("/counsellors");
    return { success: true, message: "Counsellor deleted successfully." };
  } catch (error) {
    console.error("Error deleting counsellor:", error);
    return { success: false, message: `Failed to delete counsellor: ${error instanceof Error ? error.message : String(error)}` };
  }
}

interface VerificationResult {
  success: boolean;
  message: string;
  counsellorId?: string;
  newStatus?: CounsellorStatus;
}

export async function updateCounsellorStatus(counsellorId: string, newStatus: CounsellorStatus): Promise<VerificationResult> {
  if (!counsellorId || typeof counsellorId !== 'string' || !counsellorId.trim()) {
    return { success: false, message: "Invalid Counsellor ID.", counsellorId };
  }

  const id = counsellorId.trim();

  try {
    const docSnap = await adminDb.collection('counselors').doc(id).get();
    if (!docSnap.exists) {
      return { success: false, message: `Counsellor ${id} not found.`, counsellorId: id };
    }

    const data = docSnap.data()!;
    const updatePayload: Record<string, unknown> = {
      status:    newStatus,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (newStatus === "Verified") {
      updatePayload.isVerified = true;
    } else {
      updatePayload.isVerified = false;
    }

    await adminDb.collection('counselors').doc(id).update(updatePayload);

    if (newStatus === "Pending") {
      await adminDb.collection('notifications').add({
        type:      "counsellor_pending_verification",
        title:     "Counsellor Awaiting Verification",
        message:   `${data.personalInfo?.fullName || 'A counsellor'} is now pending verification.`,
        link:      `/counsellors?action=verify&id=${id}`,
        read:      false,
        timestamp: FieldValue.serverTimestamp(),
      });
    }

    revalidatePath("/counsellors");
    revalidatePath("/");

    return { success: true, message: `Counsellor status updated to ${newStatus}.`, counsellorId: id, newStatus };
  } catch (error) {
    console.error(`Error updating counsellor ${id}:`, error);
    return {
      success: false,
      message: `Failed to update status: ${error instanceof Error ? error.message : String(error)}`,
      counsellorId: id,
    };
  }
}
