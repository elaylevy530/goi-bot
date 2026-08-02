import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { createHash, randomInt } from "crypto";
import { IsNull, MoreThan, Repository } from "typeorm";
import { Courier } from "../accounts/entities/courier.entity";
import { CourierPasswordReset } from "../accounts/entities/courier-password-reset.entity";
import { Customer } from "../accounts/entities/customer.entity";
import { User } from "../accounts/entities/user.entity";
import { UserRole } from "../accounts/entities/user-role.entity";
import type { AppRole, AuthProfile, JwtPayload, NestAuthSession } from "./auth.types";
import type { RegisterBusinessDto } from "./dto/register-business.dto";
import type { RegisterCourierDto } from "./dto/register-courier.dto";
import type { RegisterCustomerDto } from "./dto/register-customer.dto";
import {
  businessPhoneToEmail,
  courierPhoneToEmail,
  customerPhoneToEmail,
  normalizePhone,
} from "./phone.util";

function hashResetCode(code: string, phone: string) {
  return createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

function randomTempPassword(len = 8): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[randomInt(0, chars.length)];
  }
  return out;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(UserRole) private readonly userRoles: Repository<UserRole>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(Courier) private readonly couriers: Repository<Courier>,
    @InjectRepository(CourierPasswordReset)
    private readonly passwordResets: Repository<CourierPasswordReset>,
    private readonly jwtService: JwtService,
  ) {}

  async register(email: string, password: string): Promise<NestAuthSession> {
    const user = await this.createUser(email, password);
    return this.issueSession(user);
  }

  async registerCustomer(dto: RegisterCustomerDto): Promise<NestAuthSession> {
    const phone = normalizePhone(dto.phone);
    if (phone.length < 10) {
      throw new BadRequestException("Invalid phone number");
    }
    const email = customerPhoneToEmail(phone);

    const existingPhone = await this.customers.findOne({
      where: { phone },
      select: ["id", "user_id"],
    });
    if (existingPhone?.user_id) {
      throw new ConflictException("כבר קיים חשבון לטלפון הזה. נסה להיכנס.");
    }

    const user = await this.createUser(email, dto.password);

    await this.customers.save(
      this.customers.create({
        user_id: user.id,
        name: dto.full_name.trim(),
        phone,
        email,
        customer_type: "individual",
        status: "active",
        business_niche: "manual_dispatch",
      }),
    );

    return this.issueSession(user);
  }

  async registerBusiness(dto: RegisterBusinessDto): Promise<NestAuthSession> {
    if (dto.terms_accepted !== true) {
      throw new BadRequestException("Terms must be accepted");
    }

    const phone = normalizePhone(dto.phone);
    if (phone.length < 10) {
      throw new BadRequestException("Invalid phone number");
    }

    // Login identity is always phone-based so /auth business login works.
    // Optional contact email is stored on the customers row only.
    const loginEmail = businessPhoneToEmail(phone);
    const contactEmail =
      dto.email && dto.email.trim()
        ? dto.email.trim().toLowerCase()
        : loginEmail;

    const existingPhone = await this.customers.findOne({
      where: { phone },
      select: ["id", "user_id"],
    });
    if (existingPhone?.user_id) {
      throw new ConflictException("כבר קיים חשבון לטלפון הזה. נסה להיכנס.");
    }

    const user = await this.createUser(loginEmail, dto.password);

    const nicheDetails: Record<string, unknown> = {
      service_type: dto.service_type,
    };

    // Use save() (not update()) — TypeORM's update() rejects jsonb Record<string, unknown>.
    await this.customers.save(
      this.customers.create({
        ...(existingPhone ? { id: existingPhone.id } : {}),
        user_id: user.id,
        name: dto.full_name.trim(),
        phone,
        email: contactEmail,
        customer_type: "business",
        status: "active",
        business_name: dto.business_name.trim(),
        business_niche: dto.business_niche ?? "manual_dispatch",
        business_category: dto.business_category.trim(),
        city: dto.city?.trim() || null,
        address: dto.address?.trim() || null,
        pickup_address: dto.address?.trim() || null,
        payment_method_on_file: false,
        niche_details: nicheDetails,
      }),
    );

    await this.userRoles.save(
      this.userRoles.create({ user_id: user.id, role: "business" }),
    );

    return this.issueSession(user);
  }

  async login(email: string, password: string): Promise<NestAuthSession> {
    const normalized = email.trim().toLowerCase();
    const user = await this.users.findOne({ where: { email: normalized } });
    if (!user) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      throw new UnauthorizedException("Invalid email or password");
    }

    return this.issueSession(user);
  }

  async getMe(userId: string, email: string | null) {
    const roles = await this.loadRoles(userId);
    const profile = await this.loadProfile(userId, roles);
    return {
      userId,
      email,
      roles,
      profile,
    };
  }

  async getMyCustomer(userId: string): Promise<Customer | null> {
    return this.customers.findOne({ where: { user_id: userId } });
  }

  async getMyCourier(userId: string): Promise<Courier | null> {
    return this.couriers.findOne({ where: { user_id: userId } });
  }

  async updateMyCustomerName(userId: string, fullName: string) {
    const customer = await this.customers.findOne({ where: { user_id: userId } });
    if (!customer) {
      throw new BadRequestException("Customer profile not found");
    }
    customer.name = fullName.trim();
    await this.customers.save(customer);
    return { ok: true as const, name: customer.name };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException("Not authenticated");
    }
    const ok = await bcrypt.compare(currentPassword, user.password_hash);
    if (!ok) {
      throw new UnauthorizedException("סיסמה נוכחית שגויה");
    }
    user.password_hash = await bcrypt.hash(newPassword, 10);
    await this.users.save(user);
    return { ok: true as const };
  }

  /**
   * Update password without current-password check (admin reset / forgot-password).
   * Prefer changePassword for self-service when current password is known.
   */
  async setPassword(userId: string, newPassword: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    user.password_hash = await bcrypt.hash(newPassword, 10);
    await this.users.save(user);
    return { ok: true as const };
  }

  /** Idempotent WhatsApp / internal private-customer provisioning. */
  async ensureCustomerAccount(
    rawPhone: string,
    fullName?: string,
  ): Promise<{ user_id: string; email: string; phone: string; created: boolean }> {
    const phone = normalizePhone(rawPhone);
    const email = customerPhoneToEmail(phone);

    const existingUser = await this.users.findOne({ where: { email } });
    if (existingUser) {
      const customer = await this.customers.findOne({ where: { phone } });
      if (customer && !customer.user_id) {
        customer.user_id = existingUser.id;
        await this.customers.save(customer);
      }
      return { user_id: existingUser.id, email, phone, created: false };
    }

    const randomPassword = `Goi-${randomTempPassword(18)}`;
    const user = await this.createUser(email, randomPassword);

    const existingCustomer = await this.customers.findOne({ where: { phone } });
    if (existingCustomer) {
      existingCustomer.user_id = user.id;
      if (fullName?.trim()) existingCustomer.name = fullName.trim();
      await this.customers.save(existingCustomer);
    } else {
      await this.customers.save(
        this.customers.create({
          user_id: user.id,
          name: (fullName ?? phone).trim(),
          phone,
          email,
          customer_type: "individual",
          status: "active",
          business_niche: "manual_dispatch",
        }),
      );
    }

    return { user_id: user.id, email, phone, created: true };
  }

  /** Admin: create/link Nest user + temp password for a courier row. */
  async provisionCourierAccount(courierId: string) {
    const courier = await this.couriers.findOne({ where: { id: courierId } });
    if (!courier) {
      throw new NotFoundException("Courier not found");
    }
    if (!courier.whatsapp_phone) {
      throw new BadRequestException("לשליח חסר מספר וואטסאפ");
    }

    const email = courierPhoneToEmail(courier.whatsapp_phone);
    const tempPassword = randomTempPassword(8);
    let userId = courier.user_id;

    if (!userId) {
      const existing = await this.users.findOne({ where: { email } });
      if (existing) {
        userId = existing.id;
        await this.setPassword(existing.id, tempPassword);
      } else {
        const user = await this.createUser(email, tempPassword);
        userId = user.id;
      }
    } else {
      await this.setPassword(userId, tempPassword);
    }

    courier.user_id = userId;
    courier.last_temp_password = tempPassword;
    courier.password_set_at = new Date();
    await this.couriers.save(courier);
    await this.ensureRole(userId, "courier");

    return {
      email,
      tempPassword,
      login_phone: normalizePhone(courier.whatsapp_phone),
    };
  }

  /** Public courier join — Postgres courier row + optional Nest user. */
  async registerCourier(dto: RegisterCourierDto) {
    const phone = normalizePhone(dto.whatsapp_phone);
    if (phone.length < 10) {
      throw new BadRequestException("Invalid phone number");
    }

    const existing = await this.couriers.findOne({
      where: { whatsapp_phone: dto.whatsapp_phone },
      select: ["id"],
    });
    const existingNorm = await this.couriers
      .createQueryBuilder("c")
      .select("c.id")
      .where("regexp_replace(c.whatsapp_phone, '\\D', '', 'g') LIKE :suffix", {
        suffix: `%${phone.slice(-9)}`,
      })
      .getOne();
    if (existing || existingNorm) {
      throw new ConflictException("מספר וואטסאפ כבר רשום במערכת");
    }

    const legacyVehicleEnum = [
      "קטנוע",
      "רכב",
      "אופניים חשמליים",
      "הליכה",
      "קורקינט חשמלי",
      "אופניים רגילים",
    ];
    const vehicleTypes = dto.vehicle_types ?? [];
    const firstVehicle =
      vehicleTypes.find((v) => legacyVehicleEnum.includes(v)) ?? null;

    const JOB_TYPE_ENUM = [
      "משלוח בודד",
      "משמרת לפי שעה",
      "קו חלוקה",
      "משלוחי אוכל",
      "חבילות / מסמכים",
      "אחר",
    ];
    const jobTypesIn = dto.job_types ?? [];
    const wantsAll = jobTypesIn.includes("*");
    const enumJobTypes = wantsAll
      ? JOB_TYPE_ENUM
      : jobTypesIn.filter((j) => JOB_TYPE_ENUM.includes(j));
    const extraJobDetails = jobTypesIn.filter(
      (j) => j !== "*" && !JOB_TYPE_ENUM.includes(j),
    );
    const safeJobTypes = enumJobTypes.length
      ? enumJobTypes
      : extraJobDetails.length
        ? ["אחר"]
        : [];

    const courier = await this.couriers.save(
      this.couriers.create({
        full_name: dto.full_name.trim(),
        whatsapp_phone: dto.whatsapp_phone.trim(),
        base_city: dto.base_city.trim(),
        invoice_status: dto.invoice_status ?? "לא",
        working_areas: dto.wanted_work_areas ?? [],
        job_types: safeJobTypes,
        preferred_job_types: extraJobDetails,
        availability: [],
        courier_status: "ממתין לאישור",
        lead_source: "טופס /join",
        id_number: dto.id_number || null,
        vehicle_type: firstVehicle,
        vehicle_label: vehicleTypes.join(", ") || null,
        vehicle_types: vehicleTypes,
        custom_work_area: dto.custom_work_area ?? null,
        pickup_areas: dto.pickup_areas ?? [],
        custom_pickup_area: dto.custom_pickup_area ?? null,
        dropoff_areas: dto.dropoff_areas ?? [],
        custom_dropoff_area: dto.custom_dropoff_area ?? null,
        work_distance_from_base: dto.work_distance_from_base ?? null,
        courier_experience_status: dto.courier_experience_status ?? null,
        courier_experience_duration: dto.courier_experience_duration ?? null,
        gender: dto.gender ?? null,
        consent_whatsapp: dto.consent_whatsapp ?? true,
        courier_kind: dto.courier_kind ?? "courier",
      }),
    );

    let accountCreated = false;
    if (dto.password) {
      const email = courierPhoneToEmail(phone);
      let user = await this.users.findOne({ where: { email } });
      if (user) {
        await this.setPassword(user.id, dto.password);
      } else {
        user = await this.createUser(email, dto.password);
      }
      courier.user_id = user.id;
      courier.last_temp_password = dto.password;
      courier.password_set_at = new Date();
      await this.couriers.save(courier);
      await this.ensureRole(user.id, "courier");
      accountCreated = true;
    }

    return { id: courier.id, accountCreated };
  }

  async requestCourierPasswordReset(rawPhone: string) {
    const phone = normalizePhone(rawPhone);
    if (phone.length < 10) {
      return { ok: true as const };
    }

    const since = new Date(Date.now() - 60_000);
    const recent = await this.passwordResets.findOne({
      where: { phone, created_at: MoreThan(since) },
      select: ["id"],
    });
    if (recent) {
      return { ok: true as const, throttled: true as const };
    }

    const localPhone = phone.startsWith("972") ? `0${phone.slice(3)}` : phone;
    const courier = await this.couriers
      .createQueryBuilder("c")
      .where("c.whatsapp_phone = :phone OR c.whatsapp_phone = :localPhone", {
        phone,
        localPhone,
      })
      .getOne();

    if (!courier) {
      return { ok: true as const };
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const code_hash = hashResetCode(code, phone);
    const expires_at = new Date(Date.now() + 10 * 60_000);

    await this.passwordResets.save(
      this.passwordResets.create({ phone, code_hash, expires_at }),
    );

    // WhatsApp send lives in WhatsappModule; log in non-production so local reset works.
    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[auth] courier password reset code for ${phone}: ${code}`,
      );
    }

    return { ok: true as const };
  }

  async confirmCourierPasswordReset(
    rawPhone: string,
    code: string,
    newPassword: string,
  ) {
    const phone = normalizePhone(rawPhone);
    const row = await this.passwordResets.findOne({
      where: { phone, consumed_at: IsNull() },
      order: { created_at: "DESC" },
    });

    if (!row) {
      return { ok: false as const, error: "קוד אימות לא נמצא. בקש קוד חדש." };
    }
    if (row.expires_at.getTime() < Date.now()) {
      return { ok: false as const, error: "תוקף הקוד פג. בקש קוד חדש." };
    }
    if ((row.attempts ?? 0) >= 5) {
      row.consumed_at = new Date();
      await this.passwordResets.save(row);
      return {
        ok: false as const,
        error: "בוצעו יותר מדי ניסיונות. בקש קוד חדש.",
      };
    }

    if (hashResetCode(code, phone) !== row.code_hash) {
      row.attempts = (row.attempts ?? 0) + 1;
      await this.passwordResets.save(row);
      return { ok: false as const, error: "קוד שגוי." };
    }

    const localPhone = phone.startsWith("972") ? `0${phone.slice(3)}` : phone;
    const courier = await this.couriers
      .createQueryBuilder("c")
      .where("c.whatsapp_phone = :phone OR c.whatsapp_phone = :localPhone", {
        phone,
        localPhone,
      })
      .getOne();

    if (!courier?.user_id) {
      return {
        ok: false as const,
        error: "לא נמצא חשבון פעיל לשליח עם מספר זה.",
      };
    }

    await this.setPassword(courier.user_id, newPassword);
    row.consumed_at = new Date();
    await this.passwordResets.save(row);
    return { ok: true as const };
  }

  async ensureRole(
    userId: string,
    role: Exclude<AppRole, "customer">,
  ) {
    const existing = await this.userRoles.findOne({
      where: { user_id: userId, role },
    });
    if (!existing) {
      await this.userRoles.save(this.userRoles.create({ user_id: userId, role }));
    }
  }

  /** Public helper for Accounts/WhatsApp modules. */
  async createUserWithPassword(email: string, password: string): Promise<User> {
    return this.createUser(email, password);
  }

  async loadRoles(userId: string): Promise<AppRole[]> {
    const roles: AppRole[] = [];

    const roleRows = await this.userRoles.find({ where: { user_id: userId } });
    for (const row of roleRows) {
      if (
        row.role === "admin" ||
        row.role === "manager" ||
        row.role === "courier" ||
        row.role === "business"
      ) {
        roles.push(row.role);
      }
    }

    // Private customers are inferred from a linked customers row without a business role.
    if (!roles.includes("business")) {
      const customer = await this.customers.findOne({
        where: { user_id: userId },
        select: ["id"],
      });
      if (customer) {
        roles.push("customer");
      }
    }

    // Couriers may be linked via couriers.user_id without a user_roles row yet.
    if (!roles.includes("courier")) {
      const courier = await this.couriers.findOne({
        where: { user_id: userId },
        select: ["id"],
      });
      if (courier) {
        roles.push("courier");
      }
    }

    return roles;
  }

  private async createUser(email: string, password: string): Promise<User> {
    const normalized = email.trim().toLowerCase();
    const existing = await this.users.findOne({ where: { email: normalized } });
    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const password_hash = await bcrypt.hash(password, 10);
    return this.users.save(
      this.users.create({ email: normalized, password_hash }),
    );
  }

  private async issueSession(user: User): Promise<NestAuthSession> {
    const roles = await this.loadRoles(user.id);
    const profile = await this.loadProfile(user.id, roles);
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return {
      accessToken: this.jwtService.sign(payload),
      userId: user.id,
      email: user.email,
      roles,
      profile,
    };
  }

  private async loadProfile(
    userId: string,
    roles: AppRole[],
  ): Promise<AuthProfile> {
    const profile: AuthProfile = {};

    if (roles.includes("business") || roles.includes("customer")) {
      const customer = await this.customers.findOne({
        where: { user_id: userId },
        select: [
          "id",
          "name",
          "phone",
          "business_name",
          "business_niche",
          "customer_type",
          "logo_url",
        ],
      });
      if (customer) {
        profile.customerId = customer.id;
        profile.name = customer.name;
        profile.phone = customer.phone;
        profile.businessName = customer.business_name;
        profile.businessNiche = customer.business_niche;
        profile.customerType = customer.customer_type;
        profile.logoUrl = customer.logo_url;
      }
    }

    if (roles.includes("courier")) {
      const courier = await this.couriers.findOne({
        where: { user_id: userId },
        select: ["id", "full_name", "whatsapp_phone", "courier_status"],
      });
      if (courier) {
        profile.courierId = courier.id;
        profile.name = profile.name ?? courier.full_name;
        profile.phone = profile.phone ?? courier.whatsapp_phone;
        profile.courierStatus = courier.courier_status;
      }
    }

    return profile;
  }
}
