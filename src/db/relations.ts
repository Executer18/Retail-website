import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  customers: {
    orders: r.many.orders(),
  },
  products: {
    orderItems: r.many.orderItems(),
  },
  orders: {
    customer: r.one.customers({
      from: r.orders.customerId,
      to: r.customers.customerId,
    }),
    orderItems: r.many.orderItems(),
  },
  orderItems: {
    order: r.one.orders({
      from: r.orderItems.orderId,
      to: r.orders.orderId,
    }),
    product: r.one.products({
      from: r.orderItems.productId,
      to: r.products.productId,
    }),
  },
}));