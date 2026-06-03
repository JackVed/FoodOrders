import { apiRequest, buildQueryString } from "./client";
import type {
  AuthenticatedUser,
  KitchenAreaRecord,
  KitchenTicketDetail,
  ManagementConfiguration,
  MenuCategoryRecord,
  MenuItemRecord,
  MenuOptionGroup,
  MenuResponse,
  OptionGroupRecord,
  OptionRecord,
  OrderDetail,
  PrinterRecord,
  TicketDeliveryResult,
  UserRecord,
  UserRole,
} from "../types";

export interface LoginInput {
  username: string;
  password: string;
}

export interface CreateOrderItemInput {
  menuItemId: number;
  quantity: number;
  selections: Array<{
    optionGroupId: number;
    optionId: number;
  }>;
}

export interface CreateOrderInput {
  sourceApp: "POS";
  tableNumber: number;
  items: CreateOrderItemInput[];
}

export interface OrderListFilters {
  status?: "Sent" | "Printed";
  sourceApp?: "POS" | "Tableside";
  tableNumber?: number;
  createdByUserId?: number;
  limit?: number;
}

export interface KitchenTicketListFilters {
  status?: "Sent" | "Printed";
  sourceApp?: "POS" | "Tableside";
  tableNumber?: number;
  orderId?: number;
  kitchenAreaId?: number;
  printerId?: number;
  limit?: number;
}

export interface CreateKitchenAreaInput {
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CreatePrinterInput {
  kitchenAreaId: number;
  name: string;
  transportType: "mock" | "network" | "system";
  connectionConfigJson: Record<string, unknown>;
  isEnabled: boolean;
}

export interface CreateCategoryInput {
  kitchenAreaId: number;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CreateMenuItemInput {
  categoryId: number;
  kitchenAreaId: number | null;
  name: string;
  itemType: "fixed" | "composable";
  basePriceCents: number;
  sortOrder: number;
  isActive: boolean;
}

export interface CreateOptionGroupInput {
  name: string;
  code: string;
  minSelect: number;
  maxSelect: number;
  pricingStrategy: "sum_options" | "any_selected" | "first_and_additional" | "per_selected";
  firstSelectedDeltaCents?: number;
  additionalSelectedDeltaCents?: number;
  anySelectedDeltaCents?: number;
  perSelectedDeltaCents?: number;
  sortOrder: number;
  isActive: boolean;
}

export interface CreateOptionInput {
  name: string;
  code: string;
  defaultDeltaCents: number;
  sortOrder: number;
  isActive: boolean;
}

export interface CreateUserInput {
  username: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserInput {
  username?: string;
  role?: UserRole;
  isEnabled?: boolean;
}

export const authApi = {
  login(input: LoginInput) {
    return apiRequest<{ user: AuthenticatedUser }>("/api/auth/login", {
      method: "POST",
      body: input,
    });
  },
  me() {
    return apiRequest<{ user: AuthenticatedUser }>("/api/auth/me");
  },
  logout() {
    return apiRequest<null>("/api/auth/logout", {
      method: "POST",
    });
  },
};

export const menuApi = {
  getMenu() {
    return apiRequest<MenuResponse>("/api/menu");
  },
};

export const ordersApi = {
  list(filters: OrderListFilters) {
    return apiRequest<{ orders: OrderDetail[] }>(`/api/orders${buildQueryString(filters)}`);
  },
  get(orderId: number) {
    return apiRequest<{ order: OrderDetail }>(`/api/orders/${orderId}`);
  },
  create(input: CreateOrderInput) {
    return apiRequest<{ order: OrderDetail; deliveryResults: TicketDeliveryResult[] }>("/api/orders", {
      method: "POST",
      body: input,
    });
  },
  retryDelivery(orderId: number) {
    return apiRequest<{ order: OrderDetail; deliveryResults: TicketDeliveryResult[] }>(`/api/orders/${orderId}/retry-delivery`, {
      method: "POST",
    });
  },
};

export const ticketsApi = {
  list(filters: KitchenTicketListFilters) {
    return apiRequest<{ kitchenTickets: KitchenTicketDetail[] }>(`/api/kitchen-tickets${buildQueryString(filters)}`);
  },
  get(ticketId: number) {
    return apiRequest<{ kitchenTicket: KitchenTicketDetail }>(`/api/kitchen-tickets/${ticketId}`);
  },
  retryDelivery(ticketId: number) {
    return apiRequest<{ kitchenTicket: KitchenTicketDetail; deliveryResult: TicketDeliveryResult }>(`/api/kitchen-tickets/${ticketId}/retry-delivery`, {
      method: "POST",
    });
  },
  markPrinted(ticketId: number) {
    return apiRequest<{ kitchenTicket: KitchenTicketDetail }>(`/api/kitchen-tickets/${ticketId}/mark-printed`, {
      method: "PATCH",
    });
  },
};

export const managementApi = {
  getConfiguration() {
    return apiRequest<ManagementConfiguration>("/api/management/configuration");
  },
  createKitchenArea(input: CreateKitchenAreaInput) {
    return apiRequest<{ kitchenArea: KitchenAreaRecord }>("/api/management/kitchen-areas", {
      method: "POST",
      body: input,
    });
  },
  updateKitchenArea(id: number, input: Partial<CreateKitchenAreaInput>) {
    return apiRequest<{ kitchenArea: KitchenAreaRecord }>(`/api/management/kitchen-areas/${id}`, {
      method: "PATCH",
      body: input,
    });
  },
  createPrinter(input: CreatePrinterInput) {
    return apiRequest<{ printer: PrinterRecord }>("/api/management/printers", {
      method: "POST",
      body: input,
    });
  },
  updatePrinter(id: number, input: Partial<CreatePrinterInput>) {
    return apiRequest<{ printer: PrinterRecord }>(`/api/management/printers/${id}`, {
      method: "PATCH",
      body: input,
    });
  },
  createCategory(input: CreateCategoryInput) {
    return apiRequest<{ category: MenuCategoryRecord }>("/api/management/menu-categories", {
      method: "POST",
      body: input,
    });
  },
  updateCategory(id: number, input: Partial<CreateCategoryInput>) {
    return apiRequest<{ category: MenuCategoryRecord }>(`/api/management/menu-categories/${id}`, {
      method: "PATCH",
      body: input,
    });
  },
  createMenuItem(input: CreateMenuItemInput) {
    return apiRequest<{ item: MenuItemRecord }>("/api/management/menu-items", {
      method: "POST",
      body: input,
    });
  },
  updateMenuItem(id: number, input: Partial<CreateMenuItemInput>) {
    return apiRequest<{ item: MenuItemRecord }>(`/api/management/menu-items/${id}`, {
      method: "PATCH",
      body: input,
    });
  },
  createOptionGroup(menuItemId: number, input: CreateOptionGroupInput) {
    return apiRequest<{ optionGroup: OptionGroupRecord }>(`/api/management/menu-items/${menuItemId}/option-groups`, {
      method: "POST",
      body: input,
    });
  },
  updateOptionGroup(id: number, input: CreateOptionGroupInput) {
    return apiRequest<{ optionGroup: OptionGroupRecord }>(`/api/management/option-groups/${id}`, {
      method: "PATCH",
      body: input,
    });
  },
  createOption(optionGroupId: number, input: CreateOptionInput) {
    return apiRequest<{ option: OptionRecord }>(`/api/management/option-groups/${optionGroupId}/options`, {
      method: "POST",
      body: input,
    });
  },
  updateOption(id: number, input: Partial<CreateOptionInput>) {
    return apiRequest<{ option: OptionRecord }>(`/api/management/options/${id}`, {
      method: "PATCH",
      body: input,
    });
  },
};

export const usersApi = {
  list() {
    return apiRequest<{ users: UserRecord[] }>("/api/users");
  },
  get(userId: number) {
    return apiRequest<{ user: UserRecord }>(`/api/users/${userId}`);
  },
  create(input: CreateUserInput) {
    return apiRequest<{ user: UserRecord }>("/api/users", {
      method: "POST",
      body: input,
    });
  },
  update(userId: number, input: UpdateUserInput) {
    return apiRequest<{ user: UserRecord }>(`/api/users/${userId}`, {
      method: "PATCH",
      body: input,
    });
  },
  updatePassword(userId: number, password: string) {
    return apiRequest<{ user: UserRecord }>(`/api/users/${userId}/password`, {
      method: "PATCH",
      body: { password },
    });
  },
};