"use server";

import { adminDb } from "@/lib/firebase-admin";

export async function getSidebarCounts(): Promise<{
  pendingCounsellors: number;
  flaggedContent: number;
}> {
  try {
    const [counsellorsSnap, postsSnap, messagesSnap] = await Promise.all([
      adminDb.collection("counselors").where("status", "in", ["Pending", "Invited"]).count().get(),
      adminDb.collection("posts").where("moderationStatus", "==", "flagged").count().get(),
      adminDb.collection("messages").where("moderationStatus", "==", "flagged").count().get(),
    ]);

    return {
      pendingCounsellors: counsellorsSnap.data().count,
      flaggedContent: postsSnap.data().count + messagesSnap.data().count,
    };
  } catch (error) {
    console.error("Error fetching sidebar counts:", error);
    return { pendingCounsellors: 0, flaggedContent: 0 };
  }
}
