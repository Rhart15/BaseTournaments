import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

/** A readable, reasonably strong one-time password shown once on screen. */
export function generateTempPassword(): string {
  const core = randomBytes(9).toString("base64url").replace(/[-_]/g, "").slice(0, 12);
  return `BASE-${core}-7!`;
}

export type NewAdmin = {
  user: { id: string; name: string; email: string; isSuperAdmin: boolean };
  tempPassword: string;
};

/**
 * Creates a brand-new admin account with a generated temporary password.
 * The caller is responsible for showing `tempPassword` to the lead admin
 * once (it is not stored in plain text).
 */
export async function createAdminAccount(input: {
  name: string;
  email: string;
  isSuperAdmin?: boolean;
}): Promise<NewAdmin> {
  const email = input.email.trim().toLowerCase();
  const tempPassword = generateTempPassword();
  const user = await prisma.user.create({
    data: {
      email,
      name: input.name.trim(),
      passwordHash: await bcrypt.hash(tempPassword, 10),
      role: "ADMIN",
      isSuperAdmin: Boolean(input.isSuperAdmin),
      mustChangePassword: true,
    },
    select: { id: true, name: true, email: true, isSuperAdmin: true },
  });
  return { user, tempPassword };
}

/** Resets an existing account's password to a fresh temporary one. */
export async function resetAccountPassword(userId: string): Promise<string> {
  const tempPassword = generateTempPassword();
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await bcrypt.hash(tempPassword, 10),
      mustChangePassword: true,
    },
  });
  return tempPassword;
}
