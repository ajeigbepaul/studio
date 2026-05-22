"use server";

import { adminDb, FieldValue } from "@/lib/firebase-admin";
import type { ActionResult, InviteAdminOrUserInput, InviteCounselorInput, UserRole, CounsellorStatus } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { sendMail } from "@/lib/email";
import { buildAdminInviteEmail, buildCounselorInviteEmail } from "@/lib/emailTemplates";
import crypto from 'crypto';

function generateTemporaryPassword(length = 12) {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_BASE_URL ||
  (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : "http://localhost:9002");

export async function inviteAdminOrUserAction(data: InviteAdminOrUserInput): Promise<ActionResult> {
  const { email, name, role } = data;

  if (!email || !name || !role) {
    return { success: false, message: "Missing required fields for admin/user invitation." };
  }

  try {
    // Check for existing user by email
    const existing = await adminDb.collection('users').where('email', '==', email).get();
    if (!existing.empty) {
      return { success: false, message: `A user with email ${email} already exists.` };
    }

    // Create Firestore document
    const newDocRef = adminDb.collection('users').doc();
    await newDocRef.set({
      uid:       newDocRef.id,
      email,
      name,
      role:      role as UserRole,
      createdAt: FieldValue.serverTimestamp(),
    });

    const temporaryPassword = generateTemporaryPassword();
    const setPasswordLink = `${APP_BASE_URL}/set-initial-password?email=${encodeURIComponent(email)}&tempPass=${encodeURIComponent(temporaryPassword)}`;

    const mailResult = await sendMail({
      to: email,
      subject: `You're invited to Speak Admin as ${role.charAt(0).toUpperCase() + role.slice(1)}`,
      text: `Hello ${name},\n\nYou have been invited to join Speak Admin as a ${role}.\nPlease set your initial password: ${setPasswordLink}\nTemporary password: ${temporaryPassword}\n\nThanks,\nSpeak Admin Team`,
      html: buildAdminInviteEmail(name, role, setPasswordLink, temporaryPassword),
    });

    if (!mailResult.success) {
      return {
        success: true,
        message: `${role} '${name}' invited. Email failed: ${mailResult.message}. Set password link: ${setPasswordLink}`,
      };
    }

    revalidatePath("/admins");
    revalidatePath("/invite");

    return {
      success: true,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} '${name}' invited successfully. An email has been sent to ${email}.`,
    };
  } catch (error) {
    console.error("Error inviting admin/user:", error);
    return { success: false, message: `Failed to invite: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function inviteCounselorAction(data: InviteCounselorInput): Promise<ActionResult> {
  const { email, name } = data;

  if (!email || !name) {
    return { success: false, message: "Missing required fields for counselor invitation." };
  }

  try {
    // Check for existing counselor
    const existing = await adminDb.collection('counselors').where('personalInfo.email', '==', email).get();
    if (!existing.empty) {
      return { success: false, message: `A counselor with email ${email} already exists or has been invited.` };
    }

    // Create counselor document
    const newCounselorRef = adminDb.collection('counselors').doc();
    await newCounselorRef.set({
      personalInfo:     { fullName: name, email },
      professionalInfo: {},
      isVerified:       false,
      status:           "Invited" as CounsellorStatus,
      createdAt:        FieldValue.serverTimestamp(),
      updatedAt:        FieldValue.serverTimestamp(),
    });

    // Create notification
    await adminDb.collection('notifications').add({
      type:      "new_counsellor_invited",
      title:     "New Counsellor Invited",
      message:   `${name} has been invited and is awaiting profile completion.`,
      link:      `/counsellors?action=verify&id=${newCounselorRef.id}`,
      read:      false,
      timestamp: FieldValue.serverTimestamp(),
    });

    const temporaryPassword = generateTemporaryPassword();
    const setPasswordLink = `${APP_BASE_URL}/set-initial-password?email=${encodeURIComponent(email)}&tempPass=${encodeURIComponent(temporaryPassword)}&type=counselor`;

    const mailResult = await sendMail({
      to: email,
      subject: "You're invited to join Speak as a Counselor",
      text: `Hello ${name},\n\nYou have been invited to join Speak as a Counselor.\nSet your password: ${setPasswordLink}\nTemporary password: ${temporaryPassword}\n\nThanks,\nSpeak Admin Team`,
      html: buildCounselorInviteEmail(name, setPasswordLink, temporaryPassword),
    });

    if (!mailResult.success) {
      return {
        success: true,
        message: `Counselor '${name}' invited. Email failed: ${mailResult.message}. Set password link: ${setPasswordLink}`,
      };
    }

    revalidatePath("/counsellors");
    revalidatePath("/invite");

    return {
      success: true,
      message: `Counselor '${name}' invited successfully. An email has been sent to ${email}.`,
    };
  } catch (error) {
    console.error("Error inviting counselor:", error);
    return { success: false, message: `Failed to invite counselor: ${error instanceof Error ? error.message : String(error)}` };
  }
}
