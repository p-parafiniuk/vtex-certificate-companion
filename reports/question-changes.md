# Question changes vs `origin/main`

- Q: 32 new, 0 reworded, 250 unchanged
- F: 4 new, 0 reworded, 52 unchanged

## Questions

| # | domain | p | status | before | after | why |
|---|---|---|---|---|---|---|
| Q250 | auth | 1 | new |  | Match each HTTP method to its RFC 9110 properties. |  |
| Q251 | auth | 1 | new |  | A `PUT` that updates a price times out before any response arrives. Per RFC 911… |  |
| Q252 | auth | 2 | new |  | Per RFC 9110, which header must a `401 Unauthorized` response include? |  |
| Q253 | auth | 1 | new |  | A VTEX API call returns `403` although the app key and token are correct. What … |  |
| Q254 | auth | 1 | new |  | Your integration sends `GET` with `If-None-Match` and the stored ETag, which st… |  |
| Q255 | auth | 2 | new |  | A `PUT` carries `If-Match` with an outdated ETag. What does RFC 9110 say the se… |  |
| Q256 | auth | 2 | new |  | Which values can the `Retry-After` header carry? |  |
| Q257 | auth | 2 | new |  | Match each `Cache-Control` directive to what it tells a cache. |  |
| Q258 | auth | 1 | new |  | Your backend integration syncs orders every hour. Which authentication do the V… |  |
| Q259 | auth | 2 | new |  | In which cookie does the user token of a store shopper travel? |  |
| Q260 | auth | 2 | new |  | For how long can a VTEX ID user token authenticate requests to VTEX APIs? |  |
| Q261 | auth | 2 | new |  | A user token issued for account A is used to call an API on account B's host. W… |  |
| Q262 | auth | 1 | new |  | An API you need cannot be authenticated with application keys. How do you still… |  |
| Q263 | auth | 2 | new |  | Which permissions does a token from `POST /api/vtexid/apptoken/login` have? |  |
| Q264 | auth | 1 | new |  | Match each request source to the authentication the VTEX docs give for it. |  |
| Q265 | auth | 1 | new |  | Your call to `GET /api/oms/pvt/orders` returns `401`. What do you check first? |  |
| Q266 | sec | 1 | new |  | Put the steps of rotating an API token without downtime in the right order. |  |
| Q267 | sec | 1 | new |  | Right after the `renew` call, what happens to the old API token? |  |
| Q268 | sec | 2 | new |  | Which credentials authenticate the `renew` call for an API key? |  |
| Q269 | sec | 2 | new |  | How does the `finish-renewal` response confirm that the rotation is complete? |  |
| Q270 | sec | 2 | new |  | After `finish-renewal` you find an integration that still used the old token. C… |  |
| Q271 | sec | 1 | new |  | Your team wants to reuse the store's browser JavaScript to build a back-office … |  |
| Q272 | sec | 2 | new |  | Which data should an integration cache to avoid rate-limit errors? |  |
| Q273 | sec | 2 | new |  | A legacy client calls a VTEX API over plain HTTP. What does it get? |  |
| Q274 | sec | 2 | new |  | Your integration queues API calls to stay within rate limits. Which requests sh… |  |
| Q275 | sec | 1 | new |  | An integration gets a rate-limit error. How should it space its retries? |  |
| Q276 | sec | 2 | new |  | A VTEX IO app calls VTEX APIs directly in many places and hits rate limits. Wha… |  |
| Q277 | sec | 2 | new |  | Why do the VTEX docs suggest GraphQL for storefront data when rate limits are a… |  |
| Q278 | sec | 2 | new |  | Your client calls `https://sandbox.vtexcommercestable.com.br/api/test` and gets… |  |
| Q279 | sec | 1 | new |  | An integration retries a failed `POST /api/checkout/pub/orders` automatically. … |  |
| Q280 | sec | 2 | new |  | How often can the API Keys settings remind you to renew keys? |  |
| Q281 | sec | 2 | new |  | Why should a store run a periodic access review of its API keys? |  |

## Flashcards

| # | domain | p | status | before | after | why |
|---|---|---|---|---|---|---|
| F52 | auth | 1 | new |  | Practical: make a conditional GET that saves bandwidth, and say what each answe… |  |
| F53 | auth | 1 | new |  | Practical: an API you need rejects application keys. Authenticate with your key… |  |
| F54 | sec | 1 | new |  | Practical: design the retry policy of an integration that hits rate limits. |  |
| F55 | sec | 2 | new |  | Practical: check whether your client can call VTEX APIs securely before you go … |  |
