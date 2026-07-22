# Client-supplied link configuration

This release seeds the URLs supplied on 22 July 2026. Player URLs power Play only after a game account is active. Provider-admin URLs are returned only by the authenticated staff API and appear in Game Operations/Platform Links.

The super administrator can replace both URLs without redeploying. A saved admin change takes priority over these defaults and is not overwritten on startup.

## Games

| DreamFyre title | Player / game URL | Staff-only provider URL |
| --- | --- | --- |
| Orion Stars | http://start.orionstars.vip:8580/index.html | https://orionstars.vip:8781/ |
| Panda Master | https://pandamaster.vip:8888/ | https://www.pandamaster.vip/default.aspx |
| Milky Way | https://milkywayapp.xyz/ | https://milkywayapp.xyz:8781/default.aspx |
| Juwa / Juwa 2.0 | http://www.juwa777.com/ | https://ht.juwa777.com/adminList |
| Game Vault 999 | https://gamevault999.com/ | https://agent.gamevault999.com/adminList |
| V Blink | https://www.vblink777.club/ | https://gm.vblink777.club/#/login?redirect=%2F |
| Vegas Sweep | https://m.lasvegassweeps.com/ | https://agent.lasvegassweeps.com/login |
| Fire Kirin | http://web.firekirin.xyz/firekirin/firekirin/ | https://firekirin.xyz:8888/ |
| Ultra Panda | https://www.ultrapanda.mobi/ | https://ht.ultrapanda.mobi/#/login?redirect=%2F |
| Egame / Xgame | https://www.egame99.club/ | https://pko.egame99.club/#/login?redirect=%2Freport%2Fagent-total-profit |
| Blue Dragon | http://app.bluedragon777.com/ | https://agent.bluedragon777.com/Login.aspx |
| Mr All In One | http://www.mrallinone777.com/ | http://dl.mrallinone777.com/ |
| Mafia | http://www.mafia77777.com/ | http://dl.mafia77777.com/ |
| River Sweep | https://bet777.eu/ | https://river-pay.com/agent/show |
| Moolah | https://moolah.vip:8888/ | https://moolah.vip:8781/default.aspx |
| High Stakes | https://www.highstakes.com/ | https://ht.highstakesweeps.com/adminList |
| Hi-Rollin / High Roller | https://www.highrollerdownload.com/ | https://highroller.cc/ |
| Noble | http://dg.noble777.com/ | http://www.noble777.com/ |
| Cash Machine | http://www.cashmachine777.com/ | http://agentserver.cashmachine777.com:8003/ |
| Game Room | http://www.gameroom777.com/ | http://dl.gameroom777.com/ |
| Cash Frenzy | http://www.cashfrenzy777.com/ | http://agentserver.cashfrenzy777.com:8003/ |
| Para Casino | https://download.paracasino.net/ | https://agent.paracasino.net/#/pages/admin/index |
| King of Pop | http://www.slots88888.com/ | http://agentserver.slots88888.com:8003/admin |
| Casino Royal | http://m.casinoroyale07.com/ | http://agent.casinoroyale07.com/adminList |
| YOLO 777 | https://yolo777.game/ | https://agent.yolo777.game/ |
| Big W Play | https://bigwplay.com/ | https://dl.bigwplay.com/admin |
| Vegas Luck | http://start.vegasluck777.com/ | http://www.vegasluck777.com/ |

Billion Balls, Las Vegas and Mega Spin remain in the catalogue with Play disabled until their official player URLs are supplied.

## Payment methods

| Method | Seeded player detail | Initial state |
| --- | --- | --- |
| PayPal | https://taptapup.com/cashme/nex-play-paytap/ | Enabled |
| Cash App | https://taptapup.com/cashme/nex-play-ezpay/ | Enabled |
| Google Pay | https://taptapup.com/cashme/nex-play-card/ | Enabled |
| Apple Pay | https://taptapup.com/cashme/nex-play-card/ | Enabled |
| Chime | `$Isaiah-Santiago-65` plus supplied QR image | Enabled |
| USDT (TRC20) | `TUnjBnqiSvs4oYmRWo7oWquMycXZdzdepe` | Enabled |
| Venmo | Not supplied | Coming Soon / disabled |
| Stripe | Not supplied | Coming Soon / disabled |
| Card Payment | Not supplied | Coming Soon / disabled |
| BTC | No approved address supplied | Disabled |

All enabled methods use manual screenshot review. They are not automatically confirmed by the payment provider.

## Social support

- Facebook: https://www.facebook.com/share/1Ae4DF9Rnf/
- Instagram: https://www.instagram.com/dream.fyre234/
- Gmail and WhatsApp remain disabled until approved destinations are supplied.

The super administrator can replace or disable these contacts under Platform Links. Saved administrator changes are preserved across deployments.
