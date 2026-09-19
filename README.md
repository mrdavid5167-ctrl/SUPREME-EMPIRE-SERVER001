# Supreme Empire Server v3

Render:
- Build: `npm install`
- Start: `npm start`

The server exposes complete character data including level, XP, money, SE Coins, health, armor, hunger/food, vehicles, inventory, banks, properties, businesses, pets, faction, jobs, missions, position, statistics and event history.

Account limits: 5 characters. Nicknames are globally unique.

Main routes:
`GET /api/status`
`GET /api/config`
`POST /api/account`
`GET /api/account/:accountId`
`POST /api/account/:accountId/characters`
`GET /api/account/:accountId/characters/:characterId/data`
`POST /api/account/:accountId/characters/:characterId/save`
