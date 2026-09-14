import type { Repository } from "typeorm";
import { Customer } from "../accounts/entities/customer.entity";
import { TeamMember } from "../accounts/entities/team-member.entity";
import { previewCustomerId } from "./auth-als";

export type BusinessTeamRole = "owner" | "dispatcher";

export async function resolveBusinessAccess(
  customers: Repository<Customer>,
  teamMembers: Repository<TeamMember>,
  userId: string,
): Promise<{ customer: Customer; role: BusinessTeamRole } | null> {
  const previewId = previewCustomerId();
  if (previewId) {
    const customer = await customers.findOne({ where: { id: previewId } });
    return customer ? { customer, role: "owner" } : null;
  }

  const owned = await customers.findOne({ where: { user_id: userId } });
  if (owned) return { customer: owned, role: "owner" };

  const member = await teamMembers.findOne({ where: { user_id: userId } });
  if (!member) return null;
  const customer = await customers.findOne({ where: { id: member.business_id } });
  if (!customer) return null;
  return { customer, role: "dispatcher" };
}
