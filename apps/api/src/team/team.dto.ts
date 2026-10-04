import { Transform } from "class-transformer";
import { IsEmail, IsIn, MaxLength } from "class-validator";

export const TEAM_ROLES = ["STAFF", "ADMIN"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export class GrantRoleDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value)) @IsEmail() @MaxLength(200) email!: string;
  @IsIn(TEAM_ROLES, { message: "Choose Staff or Admin." }) role!: TeamRole;
}

export class ChangeRoleDto {
  /** CUSTOMER removes someone from the team. */
  @IsIn([...TEAM_ROLES, "CUSTOMER"], { message: "Choose Staff, Admin or remove." }) role!: TeamRole | "CUSTOMER";
}
