import "server-only";

export type ProviderGameLink = {
  playerUrl: string;
  adminUrl: string;
};

// Client-approved provider destinations. Player URLs are used only by active
// player-account Play buttons. Admin URLs are returned only by the protected
// staff API and are never included in the public/player snapshots.
export const PROVIDER_GAME_LINKS: Record<string, ProviderGameLink> = {
  "orion-stars": {
    playerUrl: "http://start.orionstars.vip:8580/index.html",
    adminUrl: "https://orionstars.vip:8781/",
  },
  "panda-master": {
    playerUrl: "https://pandamaster.vip:8888/",
    adminUrl: "https://www.pandamaster.vip/default.aspx",
  },
  "milky-way": {
    playerUrl: "https://milkywayapp.xyz/",
    adminUrl: "https://milkywayapp.xyz:8781/default.aspx",
  },
  juwa: {
    playerUrl: "http://www.juwa777.com/",
    adminUrl: "https://ht.juwa777.com/adminList",
  },
  "juwa-2": {
    playerUrl: "http://www.juwa777.com/",
    adminUrl: "https://ht.juwa777.com/adminList",
  },
  "game-vault-999": {
    playerUrl: "https://gamevault999.com/",
    adminUrl: "https://agent.gamevault999.com/adminList",
  },
  "v-blink": {
    playerUrl: "https://www.vblink777.club/",
    adminUrl: "https://gm.vblink777.club/#/login?redirect=%2F",
  },
  "vegas-sweep": {
    playerUrl: "https://m.lasvegassweeps.com/",
    adminUrl: "https://agent.lasvegassweeps.com/login",
  },
  "fire-kirin": {
    playerUrl: "http://web.firekirin.xyz/firekirin/firekirin/",
    adminUrl: "https://firekirin.xyz:8888/",
  },
  "ultra-panda": {
    playerUrl: "https://www.ultrapanda.mobi/",
    adminUrl: "https://ht.ultrapanda.mobi/#/login?redirect=%2F",
  },
  "egame-xgame": {
    playerUrl: "https://www.egame99.club/",
    adminUrl: "https://pko.egame99.club/#/login?redirect=%2Freport%2Fagent-total-profit",
  },
  "blue-dragon": {
    playerUrl: "http://app.bluedragon777.com/",
    adminUrl: "https://agent.bluedragon777.com/Login.aspx",
  },
  "mr-all-in-one": {
    playerUrl: "http://www.mrallinone777.com/",
    adminUrl: "http://dl.mrallinone777.com/",
  },
  mafia: {
    playerUrl: "http://www.mafia77777.com/",
    adminUrl: "http://dl.mafia77777.com/",
  },
  "river-sweep": {
    playerUrl: "https://bet777.eu/",
    adminUrl: "https://river-pay.com/agent/show",
  },
  moolah: {
    playerUrl: "https://moolah.vip:8888/",
    adminUrl: "https://moolah.vip:8781/default.aspx",
  },
  "high-stakes": {
    playerUrl: "https://www.highstakes.com/",
    adminUrl: "https://ht.highstakesweeps.com/adminList",
  },
  "hi-rollin": {
    playerUrl: "https://www.highrollerdownload.com/",
    adminUrl: "https://highroller.cc/",
  },
  noble: {
    playerUrl: "http://dg.noble777.com/",
    adminUrl: "http://www.noble777.com/",
  },
  "cash-machine": {
    playerUrl: "http://www.cashmachine777.com/",
    adminUrl: "http://agentserver.cashmachine777.com:8003/",
  },
  "game-room": {
    playerUrl: "http://www.gameroom777.com/",
    adminUrl: "http://dl.gameroom777.com/",
  },
  "cash-frenzy": {
    playerUrl: "http://www.cashfrenzy777.com/",
    adminUrl: "http://agentserver.cashfrenzy777.com:8003/",
  },
  "para-casino": {
    playerUrl: "https://download.paracasino.net/",
    adminUrl: "https://agent.paracasino.net/#/pages/admin/index",
  },
  "king-of-pop": {
    playerUrl: "http://www.slots88888.com/",
    adminUrl: "http://agentserver.slots88888.com:8003/admin",
  },
  "casino-royale": {
    playerUrl: "http://m.casinoroyale07.com/",
    adminUrl: "http://agent.casinoroyale07.com/adminList",
  },
  "yolo-777": {
    playerUrl: "https://yolo777.game/",
    adminUrl: "https://agent.yolo777.game/",
  },
  "big-w-play": {
    playerUrl: "https://bigwplay.com/",
    adminUrl: "https://dl.bigwplay.com/admin",
  },
  "vegas-luck": {
    playerUrl: "http://start.vegasluck777.com/",
    adminUrl: "http://www.vegasluck777.com/",
  },
};
