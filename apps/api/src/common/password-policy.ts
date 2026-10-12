import { BadRequestException } from "@nestjs/common";
import { checkPassword } from "./password-strength";

/** Refuses a weak password with the same suggestions the sign-up meter shows. */
export function assertStrongEnough(password: string, personal: (string | null | undefined)[] = []) {
  const result = checkPassword(password, personal);
  if (result.level === "weak") {
    throw new BadRequestException(`That password is too weak. ${result.suggestions.slice(0, 3).join(" ")}`.trim());
  }
}
