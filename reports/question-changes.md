# Question changes vs `origin/main`

- Q: 24 new, 2 reworded, 224 unchanged
- F: 6 new, 0 reworded, 46 unchanged

## Questions

| # | domain | p | status | before | after | why |
|---|---|---|---|---|---|---|
| Q33 | logistics | 2 | reworded | At which level is the stock availability of an SKU stored? | Your ERP sends stock for an SKU kept in two warehouses. At which level is the s… |  |
| Q41 | checkout |  | reworded | What is the orderForm? | Your integration keeps a shopping cart through the Checkout API. What is the or… |  |
| Q226 | mkt | 1 | new |  | Put the calls of an external seller's order from a VTEX marketplace in the righ… |  |
| Q227 | mkt | 1 | new |  | In an external seller integration, match each call to its direction. |  |
| Q228 | mkt | 1 | new |  | An external seller calls the catalog change notification for an SKU and gets `4… |  |
| Q229 | mkt | 2 | new |  | How long does a VTEX marketplace wait for an external seller's fulfillment simu… |  |
| Q230 | mkt | 2 | new |  | The marketplace calls the seller's `POST /pvt/orders/{sellerOrderId}/fulfill`. … |  |
| Q231 | mkt | 2 | new |  | An external seller has the tracking number of an invoiced order. How does it se… |  |
| Q232 | mkt | 1 | new |  | A VTEX marketplace wants to cancel an order at an external seller. How does the… |  |
| Q233 | mkt | 2 | new |  | An external seller wants to rename an SKU directly in the VTEX marketplace cata… |  |
| Q234 | orders | 1 | new |  | Put the steps of an ERP order integration that uses the feed in the right order. |  |
| Q235 | orders | 1 | new |  | Match each property to the order notification method it belongs to. |  |
| Q236 | orders | 1 | new |  | Your ERP reads feed events and crashes before it commits them. What happens to … |  |
| Q237 | orders | 1 | new |  | When should the ERP call `POST /api/oms/pvt/orders/{orderId}/start-handling`? |  |
| Q238 | orders | 2 | new |  | You configure a hook with `POST /api/orders/hook/config`, and your endpoint fai… |  |
| Q239 | orders | 2 | new |  | Put these order statuses in the order in which a regular order goes through the… |  |
| Q240 | orders | 2 | new |  | An order has a partial invoice. Can the retailer still cancel it? |  |
| Q241 | orders | 2 | new |  | Your feed receives no new events for longer than its retention period. What hap… |  |
| Q242 | logistics | 1 | new |  | Put the steps to make an SKU sellable from a new warehouse in the right order. |  |
| Q243 | logistics | 1 | new |  | Match each description to the logistics entity. |  |
| Q244 | logistics | 1 | new |  | A shopper adds an SKU to the cart but has not placed the order. Is a reservatio… |  |
| Q245 | logistics | 1 | new |  | An SKU was sold and the order was invoiced. Does VTEX subtract the sold units f… |  |
| Q246 | logistics | 2 | new |  | Which statements about the lead time of an SKU in a warehouse are correct? |  |
| Q247 | logistics | 3 | new |  | What is the maximum lead time you can set for an SKU in a warehouse? |  |
| Q248 | logistics | 2 | new |  | When does an inventory reservation stop being subject to its expiration date? |  |
| Q249 | logistics | 2 | new |  | An SKU has unlimited inventory enabled in its warehouse. Is it valid for sale? |  |

## Flashcards

| # | domain | p | status | before | after | why |
|---|---|---|---|---|---|---|
| F46 | checkout | 1 | new |  | Practical: you have the orderFormId of a complete cart. Place the order and fin… |  |
| F47 | payments | 1 | new |  | Practical: your payment connector gets a payment it can only decide later. Walk… |  |
| F48 | gift | 1 | new |  | Practical: list what an external gift card provider must answer during a purcha… |  |
| F49 | mkt | 1 | new |  | Practical: an external seller gets an order from a VTEX marketplace. List the c… |  |
| F50 | orders | 2 | new |  | Practical: configure a hook for order status changes and make your endpoint pas… |  |
| F51 | logistics | 1 | new |  | Practical: a new store must sell SKU 123 from a new warehouse. Set up the logis… |  |
