import { sql } from "drizzle-orm";
import {
  sqliteTable,
  integer,
  text,
  real,
  index,
} from "drizzle-orm/sqlite-core";

// ==========================================
// 1. Customers Table
// ==========================================
export const customers = sqliteTable(
  "Customers",
  {
    customerId: integer("customer_id").primaryKey({ autoIncrement: true }),
    fullName: text("full_name").notNull(),
    phoneNumber: text("phone_number").notNull().unique(),
  },
  (t) => [
    index("idx_customers_phone").on(t.phoneNumber),
  ]
);

// ==========================================
// 2. Products Table
// ==========================================
export const products = sqliteTable(
  "Products",
  {
    productId: integer("product_id").primaryKey({ autoIncrement: true }),
    itemName: text("item_name").notNull(),
    category: text("category").notNull(),
    pricePerKg: real("price_per_kg").notNull(),
    inStockKg: real("in_stock_kg").notNull().default(0.0),
    imageUrl: text("image_url"),
    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("idx_products_category").on(t.category),
  ]
);

// ==========================================
// 3. Orders Table
// ==========================================
export const orders = sqliteTable(
  "Orders",
  {
    orderId: integer("order_id").primaryKey({ autoIncrement: true }),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.customerId),
    orderDate: text("order_date").default(sql`CURRENT_TIMESTAMP`),
    pickupSlot: text("pickup_slot").notNull(),
    status: text("status", {
      enum: ["Reserved", "Confirmed", "Preparing", "Ready", "Collected", "Cancelled"],
    })
      .notNull()
      .default("Reserved"),
    totalAmount: real("total_amount").notNull(),
  },
  (t) => [
    index("idx_orders_status").on(t.status),
    index("idx_orders_customer_id").on(t.customerId),
  ]
);

// ==========================================
// 4. Order Items Table
// ==========================================
export const orderItems = sqliteTable(
  "Order_Items",
  {
    itemId: integer("item_id").primaryKey({ autoIncrement: true }),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.orderId, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.productId),
    pricePerKgAtPurchase: real("price_per_kg_at_purchase").notNull(),
    weightKg: real("weight_kg").notNull(),
  },
  (t) => [
    index("idx_order_items_order_id").on(t.orderId),
    index("idx_order_items_product_id").on(t.productId),
  ]
);