
"use server";

import { adminDb } from "@/lib/firebase-admin";
import type { ActionResult } from "@/lib/types";

export async function markNotificationAsRead(notificationId: string): Promise<ActionResult> {
  if (!notificationId) {
    return { success: false, message: "Notification ID not provided." };
  }
  try {
    await adminDb.collection("notifications").doc(notificationId).update({ read: true });
    return { success: true, message: "Notification marked as read." };
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return {
      success: false,
      message: `Failed to mark notification as read: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function markAllNotificationsAsRead(notificationIds: string[]): Promise<ActionResult> {
  if (!notificationIds || notificationIds.length === 0) {
    return { success: false, message: "No notification IDs provided to mark as read." };
  }
  try {
    const batch = adminDb.batch();
    notificationIds.forEach(id => {
      batch.update(adminDb.collection("notifications").doc(id), { read: true });
    });
    await batch.commit();
    return { success: true, message: `${notificationIds.length} notifications marked as read.` };
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return {
      success: false,
      message: `Failed to mark all notifications as read: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
