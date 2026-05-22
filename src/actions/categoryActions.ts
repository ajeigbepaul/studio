"use server";

import { adminDb, FieldValue } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";

export interface CategoryData {
  name: string;
  icon: string;
  color: string;
  description: string;
  order: number;
  isActive: boolean;
}

interface ActionResult { success: boolean; message: string; id?: string }

export async function createCategoryAction(data: CategoryData): Promise<ActionResult> {
  if (!data.name?.trim()) return { success: false, message: "Category name is required." };
  try {
    const ref = await adminDb.collection("categories").add({
      ...data,
      createdAt: FieldValue.serverTimestamp(),
    });
    revalidatePath("/categories");
    return { success: true, message: "Category created.", id: ref.id };
  } catch (error) {
    console.error("Error creating category:", error);
    return { success: false, message: `Failed to create: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function updateCategoryAction(id: string, data: CategoryData): Promise<ActionResult> {
  if (!id) return { success: false, message: "Category ID required." };
  try {
    await adminDb.collection("categories").doc(id).update({ ...data, updatedAt: FieldValue.serverTimestamp() });
    revalidatePath("/categories");
    return { success: true, message: `Saved ${data.name}.` };
  } catch (error) {
    console.error("Error updating category:", error);
    return { success: false, message: `Failed to save: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  if (!id) return { success: false, message: "Category ID required." };
  try {
    await adminDb.collection("categories").doc(id).delete();
    revalidatePath("/categories");
    return { success: true, message: "Category removed." };
  } catch (error) {
    console.error("Error deleting category:", error);
    return { success: false, message: `Failed to delete: ${error instanceof Error ? error.message : String(error)}` };
  }
}
