# Question changes vs `origin/main`

- Q: 24 new, 2 reworded, 200 unchanged
- F: 0 new, 0 reworded, 46 unchanged

## Questions

| # | domain | p | status | before | after | why |
|---|---|---|---|---|---|---|
| Q43 | checkout | 2 | reworded | Which data is sent in the cart simulation request body? | Your integration simulates a cart before it places an order. Which data goes in… |  |
| Q48 | checkout | 2 | reworded | What is the `orderGroup`? | Your integration placed an order and got an `orderGroup` back. What is the `ord… |  |
| Q202 | checkout | 1 | new |  | Put the calls that place an order from an existing cart in the right order. |  |
| Q203 | checkout | 1 | new |  | Put the steps of placing a new order without a cart in the right order. |  |
| Q204 | checkout | 1 | new |  | Match each statement to the way of placing an order it describes. |  |
| Q205 | checkout | 1 | new |  | Your integration placed an order from a cart. It sends the payment information … |  |
| Q206 | checkout | 1 | new |  | `POST /api/checkout/pub/gatewayCallback/{orderGroup}` returns `500`. Which caus… |  |
| Q207 | checkout | 2 | new |  | A headless storefront calls `GET /api/checkout/pub/orderForm` without the `Chec… |  |
| Q208 | checkout | 2 | new |  | Your integration places an order with only the email of an existing customer in… |  |
| Q209 | checkout | 2 | new |  | You place an order from a cart worth $24.99 with `POST .../orderForm/{orderForm… |  |
| Q210 | payments | 1 | new |  | Put the steps of an asynchronous payment in the Payment Provider Protocol in th… |  |
| Q211 | payments | 1 | new |  | Match each situation to the PPP request VTEX sends to the provider. |  |
| Q212 | payments | 1 | new |  | Create Payment returned `undefined`, and the provider has not called back yet. … |  |
| Q213 | payments | 2 | new |  | A payment connector built on VTEX IO gets the final result of an `undefined` pa… |  |
| Q214 | payments | 2 | new |  | The provider's callback does not include `delayToAutoSettle`. Which value does … |  |
| Q215 | payments | 2 | new |  | VTEX sends the same settlement request twice for one payment. What should the p… |  |
| Q216 | payments | 2 | new |  | A provider sets `delayToCancel` for a payment method that can stay pending for … |  |
| Q217 | payments | 1 | new |  | A store refunds one of three items from a payment that was already captured. Wh… |  |
| Q218 | gift | 1 | new |  | Put the calls of a purchase paid with a gift card through the Gift Card Hub in … |  |
| Q219 | gift | 1 | new |  | Match each task to the part of the gift card integration that does it. |  |
| Q220 | gift | 2 | new |  | A gift card provider receives `GET /giftcards/{giftCardId}`. What must its resp… |  |
| Q221 | gift | 2 | new |  | Where does VTEX take the `{transactionId}` for the gift card settlement and can… |  |
| Q222 | gift | 2 | new |  | A store wants the native gift card provider and an external one at the same tim… |  |
| Q223 | gift | 2 | new |  | Before a settlement, VTEX calls GET and finds no amount left to settle. What do… |  |
| Q224 | gift | 1 | new |  | Which credentials authenticate `PUT /api/giftcardproviders/{giftCardProviderId}… |  |
| Q225 | gift | 2 | new |  | In the gift card integration, what is the external provider responsible for? |  |

## Flashcards

| # | domain | p | status | before | after | why |
|---|---|---|---|---|---|---|
