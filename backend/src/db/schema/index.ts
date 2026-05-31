import * as authSchema from "./auth.js";
import * as enumSchema from "./enums.js";
import * as menuSchema from "./menu.js";
import * as orderSchema from "./orders.js";

export * from "./auth.js";
export * from "./enums.js";
export * from "./menu.js";
export * from "./orders.js";

export const schema = {
	...authSchema,
	...enumSchema,
	...menuSchema,
	...orderSchema,
};