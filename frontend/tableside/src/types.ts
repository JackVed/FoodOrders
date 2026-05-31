export type UserRole = "admin" | "management" | "operator";

export type SourceApp = "POS" | "Tableside";

export type OrderStatus = "Sent" | "Printed";

export type MenuItemType = "fixed" | "composable";

export type PricingStrategy =
  | "sum_options"
  | "any_selected"
  | "first_and_additional"
  | "per_selected";

export type PrinterTransportType = "mock" | "network" | "system";

export interface AuthenticatedUser {
  id: number;
  username: string;
  role: UserRole;
  sessionId: number;
}

export interface ApiValidationIssues {
  formErrors?: string[];
  fieldErrors?: Record<string, string[]>;
}

export interface KitchenAreaRef {
  id: number;
  name: string;
}

export interface PrinterRef {
  id: number;
  name: string;
  transportType: PrinterTransportType;
  isEnabled: boolean;
}

export interface MenuOption {
  id: number;
  name: string;
  code: string;
  defaultDeltaCents: number;
}

export interface MenuOptionGroup {
  id: number;
  name: string;
  code: string;
  minSelect: number;
  maxSelect: number;
  pricingStrategy: PricingStrategy;
  firstSelectedDeltaCents: number | null;
  additionalSelectedDeltaCents: number | null;
  anySelectedDeltaCents: number | null;
  perSelectedDeltaCents: number | null;
  options: MenuOption[];
}

export interface MenuItem {
  id: number;
  name: string;
  itemType: MenuItemType;
  basePriceCents: number;
  kitchenAreaId: number | null;
  optionGroups: MenuOptionGroup[];
}

export interface MenuCategory {
  id: number;
  name: string;
  kitchenArea: KitchenAreaRef | null;
  items: MenuItem[];
}

export interface MenuResponse {
  categories: MenuCategory[];
}

export interface OrderSelectionSnapshot {
  id: number;
  orderItemId?: number;
  optionGroupNameSnapshot: string;
  optionNameSnapshot: string;
  priceDeltaCents: number;
  sortOrder: number;
}

export interface OrderItemDetail {
  id: number;
  menuItemId: number;
  displayNameSnapshot: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  createdAt?: string;
  kitchenArea: KitchenAreaRef | null;
  selections: OrderSelectionSnapshot[];
}

export interface TicketItemDetail {
  id: number;
  orderItemId: number;
  displayNameSnapshot: string;
  quantity: number;
  sortOrder: number;
  selections: OrderSelectionSnapshot[];
}

export interface DeliveryAttempt {
  id: number;
  kitchenTicketId: number;
  printerId: number | null;
  attemptedAt: string;
  success: boolean;
  errorMessage: string | null;
  rawResponseJson: Record<string, unknown> | null;
}

export interface KitchenTicketDetail {
  id: number;
  orderId: number;
  orderReference: number;
  insertedByUsernameSnapshot: string;
  sourceApp: SourceApp;
  tableNumber: number;
  status: OrderStatus;
  createdAt: string;
  printedAt: string | null;
  payloadJson: Record<string, unknown>;
  kitchenArea: KitchenAreaRef | null;
  printer: PrinterRef | null;
  items: TicketItemDetail[];
  deliveryAttempts: DeliveryAttempt[];
}

export interface OrderDetail {
  id: number;
  reference: number;
  createdByUserId: number;
  createdByUsernameSnapshot: string;
  sourceApp: SourceApp;
  tableNumber: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  printedAt: string | null;
  totalAmountCents: number;
  items: OrderItemDetail[];
  tickets: KitchenTicketDetail[];
}

export interface TicketDeliveryResult {
  ticketId: number;
  orderId: number;
  success: boolean;
  alreadyPrinted?: boolean;
  attemptId?: number;
  errorMessage?: string | null;
  rawResponseJson?: Record<string, unknown> | null;
}