import { bech32 } from 'bech32';

export function npubToHex(npub: string) {
  const { prefix, words } = bech32.decode(npub);
  if (prefix === 'npub') {
    const bytes = bech32.fromWords(words).slice(0, 32);
    const pubkey = Buffer.from(bytes).toString('hex');
    return pubkey;
  }
  throw new Error('not an npub key');
}

export function hexToNpub(hex: string) {
  const derivedNPub = bech32.encode(
    'npub',
    bech32.toWords(Buffer.from(hex, 'hex'))
  );
  const { words } = bech32.decode(derivedNPub);
  if (words.length > 0) {
    return derivedNPub;
  }
  throw new Error('not a valid hex');
}

export const defaultRelays = [
  'wss://nostr-relay.wlvs.space',
  'wss://nostr-pub.wellorder.net',
  'wss://nostr-2.zebedee.cloud',
  // 'wss://relay.damus.io',
  // 'wss://relay.nostr.ch',
  // 'wss://rsslay.nostr.net',
  // 'wss://nostr-relay.untethr.me',
  // 'wss://nostr-pub.semisol.dev',
  // 'wss://nostr.rocks',
  // 'wss://astral.ninja',
  // 'wss://expensive-relay.fiatjaf.com',

  // 'wss://nostr.zebedee.cloud',
  //   "wss://nostr.shadownode.org",
  //   "wss://nostr.nymsrelay.com",
  //   "wss://relay.sovereign-stack.org",
  //   "wss://nostr.sandwich.farm",
  //   "wss://relay.oldcity-bitcoiners.info",
  //   "wss://relay.bitid.nz",
  //   "wss://relay.nostr.xyz",
  //   "wss://relay.futohq.com",
  //   "wss://nostr.rdfriedl.com",
  //   "wss://relay.farscapian.com",
  //   "wss://nostr-3.orba.ca",
  //   "wss://satstacker.cloud",
  // 'wss://freedom-relay.herokuapp.com/ws',
  //   "wss://nostr-relay.freeberty.net",
  // 'wss://nostr-relay-dev.wlvs.space',
  //   "wss://nostr.onsats.org",
  // 'wss://nostr-relay.lnmarkets.com',
  //   "wss://nostr.unknown.place",
  // 'wss://nostr.semisol.dev',
  // 'wss://nostr-verified.wellorder.net',
  //   "wss://nostr.drss.io",
  // 'wss://nostr.bitcoiner.social',
  //   "wss://nostr.openchain.fr",
  //   "wss://nostr.delo.software",
  // 'wss://relay.nostr.info',
  //   "wss://relay.nostr.pro",
  // 'wss://relay.minds.com/nostr/v1/ws',
  // 'wss://nostr.zaprite.io',
  //   "wss://nostr.oxtr.dev",
  //   "wss://nostr.ono.re",
  // 'wss://relay.grunch.dev',
  //   "wss://relay.cynsar.foundation",
  //   "wss://relay.kronkltd.net",
  //   "wss://relay.r3d.red",
  //   "wss://relay.valireum.net",
  //   "wss://nostr.fmt.wiz.biz",
  //   "wss://nostr.v0l.io",
  //   "wss://relay.cryptocculture.com",
  //   "wss://nostr.fly.dev",
  //   "wss://nostr.nordlysln.net",
  //   "wss://nostr-relay.gkbrk.com",
  // 'wss://nostr.zerofeerouting.com',
  // 'wss://no.str.cr',
  //   "wss://nostr.cercatrova.me",
  //   "wss://public.nostr.swissrouting.com",
  //   "wss://nostr-relay.nonce.academy",
  //   "wss://nostr.rewardsbunny.com",
  //   "wss://nostr.slothy.win",
  // 'wss://nostr.coinos.io',
  //   "wss://relay.nostropolis.xyz/websocket",
  //   "wss://lv01.tater.ninja",
  //   "wss://nostr-2.orba.ca",
  //   "wss://nostr.orba.ca",
  //   "wss://nostr.supremestack.xyz",
  //   "wss://nostrrelay.com",
  //   "wss://nostr-01.bolt.observer",
  //   "wss://nostr.mom",
  //   "wss://relay.nostr.au",
  //   "wss://nostr.swiss-enigma.ch",
  //   "wss://nostr.oooxxx.ml",
  //   "wss://nostr.yael.at",
  //   "wss://nostr-relay.trustbtc.org",
  //   "wss://nostr.namek.link",
  //   "wss://nostr-relay.wolfandcrow.tech",
  //   "wss://nostr.8e23.net",
  //   "wss://nostr.actn.io",
  //   "wss://relay.sendstr.com",
  //   "wss://nostr.satsophone.tk",
  //   "wss://nostr-relay.derekross.me",
  //   "wss://nostr.jiashanlu.synology.me",
  //   "wss://nostr.radixrat.com",
  //   "wss://nostr.shawnyeager.net",
  //   "wss://nostr.pobblelabs.org",
  //   "wss://relay.dev.kronkltd.net",
  //   "wss://nostr2.namek.link",
  // 'wss://nostr-dev.wellorder.net',
  //   "wss://nostr.mwmdev.com",
  //   "wss://relay.21spirits.io",
  //   "wss://nostr-relay.freedomnode.com",
  // 'wss://relay.minds.io/nostr/v1/ws',
  // 'wss://wlvs.space',
  //   "wss://nostr.einundzwanzig.space",
  //   "wss://nostr.d11n.net",
  //   "wss://nostr1.tunnelsats.com",
  //   "wss://nostr.tunnelsats.com",
  //   "wss://nostr.leximaster.com",
  //   "wss://nostr.hugo.md",
  //   "wss://mule.platanito.org",
  //   "wss://relay.ryzizub.com",
  //   "wss://nostr.w3ird.tech",
  //   "wss://nostr.robotechy.com",
  //   "wss://relay.stoner.com",
  //   "wss://relay.nostrmoto.xyz",
  //   "wss://relay.boring.surf",
  //   "wss://nostr.bongbong.com",
  //   "wss://nostr.gruntwerk.org",
  //   "wss://nostr.mado.io",
  //   "wss://nostr.corebreach.com",
  //   "wss://nostr.hyperlingo.com",
  //   "wss://nostr.ethtozero.fr",
  //   "wss://nostr-relay.digitalmob.ro",
  // 'wss://relay.nvote.co',
  //   "wss://jiggytom.ddns.net",
  //   "wss://nostr.sectiontwo.org",
  //   "wss://nostr.roundrockbitcoiners.com",
  //   "wss://nostr.nodeofsven.com",
  //   "wss://nostr.jimc.me",
  //   "wss://nostr.utxo.lol",
  //   "wss://relay.lexingtonbitcoin.org",
  //   "wss://nostr.mikedilger.com",
  //   "wss://nostr.f44.dev",
  //   "wss://relay.nyx.ma",
  //   "wss://nostr.walletofsatoshi.com",
  //   "wss://nostr.shmueli.org",
  //   "wss://wizards.wormrobot.org",
  //   "wss://nostr.orangepill.dev",
  //   "wss://paid.no.str.cr",
  //   "wss://nostr.sovbit.com",
  //   "wss://nostr.datamagik.com",
  //   "wss://relay.nostrid.com",
  // 'wss://nostr1.starbackr.me',
  //   "wss://nostr-relay.schnitzel.world",
  //   "wss://relay.nostr.express",
  //   "wss://sg.qemura.xyz",
  //   "wss://nostr.formigator.eu",
  //   "wss://nostr.xpersona.net",
  //   "wss://relay.n057r.club",
  //   "wss://nostr.digitalreformation.info",
  //   "wss://nostr.gromeul.eu",
  //   "wss://nostr-relay.alekberg.net",
  //   "wss://nostr2.actn.io",
  //   "wss://nostr-relay.usebitcoin.space",
  //   "wss://nostrich.friendship.tw",
  //   "wss://nostr.mustardnodes.com",
  //   "wss://nostr-alpha.gruntwerk.org",
  //   "wss://nostr-relay.australiaeast.cloudapp.azure.com",
  //   "wss://nostr.bch.ninja",
  //   "wss://nostr-relay.smoove.net",
  //   "wss://nostr-relay.j3s7m4n.com",
  //   "wss://nostr.demovement.net",
  //   "wss://nostr.thesimplekid.com",
  //   "wss://nostr.aozing.com",
  //   "wss://nostr.blocs.fr",
  // 'wss://no.str.watch',
  // 'wss://nostr.vulpem.com',
  //   "wss://btc.klendazu.com",
  //   "wss://nostr.hackerman.pro",
  //   "wss://relay.realsearch.cc",
  //   "wss://nostr3.actn.io",
  //   "wss://nostr.pwnshop.cloud",
  //   "wss://nostr.mrbits.it",
  //   "wss://echo.obsolete.org",
  // 'wss://brb.io',
  //   "wss://nostr.massmux.com",
  //   "wss://nostream-production-3dbe.up.railway.app",
  //   "wss://pow32.nostr.land"
];
