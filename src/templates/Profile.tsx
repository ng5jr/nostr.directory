/* eslint-disable @typescript-eslint/no-loop-func */
/* eslint-disable no-await-in-loop */
import * as React from 'react';
import { useEffect, useState } from 'react';

import {
  ArrowCircleRightOutlined,
  ContentCopy,
  HelpOutline,
  QrCode,
  CheckCircle,
  Cancel,
  Close,
  ContentCopyRounded,
} from '@mui/icons-material';
import {
  Card,
  CardHeader,
  Avatar,
  CardContent,
  Typography,
  Tooltip,
  Alert,
  Snackbar,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  InputAdornment,
  TextField,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Link,
  LinearProgress,
} from '@mui/material';
import { initNostr, SendMsgType } from '@nostrgg/client';
import axios from 'axios';
import { useRouter } from 'next/router';
import { nip19 } from 'nostr-tools';
import * as nostrTools from 'nostr-tools';
import type { ProfilePointer } from 'nostr-tools/nip19';
import { QRCodeSVG } from 'qrcode.react';

import DynamicButton from '../button/DynamicButton';
import BadgeCard from '../cards/BadgeCard';
import { Section } from '../layout/Section';
import { db } from '../utils/firebase';
import { defaultRelays, hexToNpub, npubToHex } from '../utils/helpers';

interface CustomWindow extends Window {
  nostr?: any;
}
declare const window: CustomWindow;

const Profile = () => {
  const [tweet, setTweet] = useState({
    screenName: '',
    entities: {
      urls: [
        {
          url: '',
        },
      ],
    },
    nPubKey: '',
    hexPubKey: '',
    profileImageUrl: '',
    mastodon: '',
    mastodonEvent: '',
    id_str: '',
    verified: false,
    verifyEvent: '',
    donated: false,
    userId: '',
    telegram: '',
    telegramUserName: '',
    telegramMsgId: '',
    telegramEvent: '',
  });
  const [wotScore, setWotScore] = useState(0);
  const [fetching, setFetching] = useState(false);
  const [userRelays, setUserRelays] = useState<Array<any>>([]);
  const [filteredRelays, setFilteredRelays] = useState<Array<any>>([]);
  const [previousKeys, setPreviousKeys] = useState<Array<any>>([]);
  const [errorAlert, setErrorAlert] = useState({
    open: false,
    text: 'Error while doing stuff',
  });
  const [nProfile, setNProfile] = useState('');
  const [nip05, setNip05] = useState('');
  const [dialog, setDialog] = useState({
    open: false,
    title: '',
    text: <></>,
    button1: <></>,
    button2: '',
  });
  const [validPFP, setValidPFP] = useState(false);
  const [newerKeyExists, setNewerKeyExists] = useState(false);
  const [idNotFound, setIdNotFound] = useState(false);
  const [tweetExists, setTweetExists] = useState(true);
  const [tgVerificationText, setTgVerificationText] = useState('');
  const [alertOpen, setAlertOpen] = useState(false);
  const [tgVerificationDialogOpen, setTgVerificationDialogOpen] =
    useState(false);
  const router = useRouter();

  const handleClose = () => {
    setDialog({
      ...dialog,
      open: false,
    });
  };

  const handleAlertClose = (
    event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (event && reason === 'clickaway') {
      return;
    }
    setAlertOpen(false);
  };

  const handleErrorAlertClose = (
    event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (event && reason === 'clickaway') {
      return;
    }

    setErrorAlert({
      open: false,
      text: '',
    });
  };

  const checkAdd = (relay: { url: string; read: string; write: string }) => {
    // console.log('checkAdd ', userRelays, relay);
    setUserRelays((prevState) =>
      // (prevState) => new Set(prevState).add(relay)
      [...prevState, relay]
    );
    // }
  };

  const fetchInitialData = async () => {
    // console.log('getting profile details... ', router, router.query.id);
    const someIdentifier = router.query.id;
    if (!someIdentifier || Array.isArray(someIdentifier)) {
      return;
    }

    setFetching(true);

    // is someIdentifier npub, hex or nprofile?
    let hexPubKey;
    let nPubKey;
    if (someIdentifier.slice(0, 8) === 'nprofile') {
      try {
        const { type } = nip19.decode(someIdentifier);
        const data = nip19.decode(someIdentifier).data as ProfilePointer;
        if (type !== 'nprofile' || !data.pubkey)
          throw new Error('Invalid nprofile');
        hexPubKey = data.pubkey;
      } catch (error) {
        return;
      }
    } else {
      try {
        // check if npub
        hexPubKey = npubToHex(someIdentifier);
      } catch (error) {
        // console.log('error ', error);
        // check if its hex
        hexPubKey = someIdentifier;
      }
    }
    try {
      nPubKey = hexToNpub(hexPubKey);
      // eslint-disable-next-line no-empty
    } catch (error) {}

    // convert twitter handle to pubkey as well
    try {
      if (hexPubKey.length < 64) {
        // console.log(
        //   'after pubkey check if still no pubkey here so it means its a twitter handle? ',
        //   someIdentifier,
        //   nPubKey,
        //   hexPubKey
        // );
        const tweetsByIdentifier: any = [];
        // setFetching(true);
        const tquerySnapshot = await db
          .collection('twitter')
          .where('lcScreenName', '==', someIdentifier.toLowerCase())
          .get();
        tquerySnapshot.forEach((doc: { id: any; data: () => any }) => {
          tweetsByIdentifier.push(doc.data());
        });
        // console.log(
        //   'got tweets by this screenName ',
        //   someIdentifier,
        //   tweetsByIdentifier
        // );
        if (tweetsByIdentifier.length < 1) {
          console.log('handle not found in DB!');
          setIdNotFound(true);
          setFetching(false);
          return;
        }
        if (tweetsByIdentifier.length > 1) {
          const verifiedTweets = tweetsByIdentifier.filter(
            (z: any) => z.verified === true
          );
          if (verifiedTweets.length === 1) {
            // there's only 1 verified tweet
            nPubKey = verifiedTweets[0].nPubKey;
            hexPubKey = verifiedTweets[0].hexPubKey;
          } else if (verifiedTweets.length > 1) {
            // there's more than 1 verified tweet
            const latestVerifiedTweet = verifiedTweets.reduce(
              (prev: any, current: any) =>
                +prev.createdAt > +current.createdAt ? prev : current
            );
            // console.log('latestVerifiedTweet ', latestVerifiedTweet);
            nPubKey = latestVerifiedTweet.nPubKey;
            hexPubKey = latestVerifiedTweet.hexPubKey;
          } else {
            // no verified tweets - pick the most recent one
            const latestTweet = tweetsByIdentifier.reduce(
              (prev: any, current: any) =>
                +prev.createdAt > +current.createdAt ? prev : current
            );
            nPubKey = latestTweet.nPubKey;
            hexPubKey = latestTweet.hexPubKey;
          }
        } else {
          nPubKey = tweetsByIdentifier[0].nPubKey;
          hexPubKey = tweetsByIdentifier[0].hexPubKey;
        }
      }
    } catch (error) {
      console.log('parse handle error ', error);
    }

    // // should have a valid npub here
    // console.log(
    //   'should have valid data here - identifier, nPubKey, hexPubKey: ',
    //   someIdentifier,
    //   nPubKey,
    //   hexPubKey
    // );

    // setUserRelays([]);
    const duplicates: any = [];
    // setFetching(true);
    const querySnapshot = await db
      .collection('twitter')
      .where('nPubKey', '==', nPubKey)
      .get();
    let tweetObj: any;
    querySnapshot.forEach((doc: { id: any; data: () => any }) => {
      tweetObj = doc.data();
      duplicates.push(doc.data());
    });

    if (!tweetObj) {
      console.log('pubkey not found in DB!');
      setIdNotFound(true);
      setFetching(false);
      return;
    }

    // console.log('got duplicates ', duplicates);
    // prefer verified if exists
    tweetObj =
      duplicates.find((x: any) => x.verified === true) || duplicates[0];

    console.log('got data ', tweetObj, fetching);
    setTweet(tweetObj);
    // console.log(`setTweet to `, tweetObj);

    try {
      // check if this screenName has older/revoked keys
      // console.log(
      //   'checking other keys for this screenName ',
      //   tweetObj.screenName
      // );
      let screenNameKeys: any = [];
      const skquerySnapshot = await db
        .collection('twitter')
        .where('lcScreenName', '==', tweetObj.screenName.toLowerCase())
        .get();
      skquerySnapshot.forEach((doc: any) => {
        screenNameKeys.push(doc.data());
      });

      screenNameKeys = screenNameKeys.filter(
        (x: any) => x.nPubKey !== tweetObj.nPubKey
      );
      // console.log('got other keys for this screenName ', screenNameKeys);
      setPreviousKeys(screenNameKeys);

      const newerKey = screenNameKeys.find(
        (y: any) => y.created_at > tweetObj.created_at
      );
      if (newerKey) setNewerKeyExists(true);
    } catch (error) {
      console.log('otherKeys error ', error);
    }

    // check tweetURL if it still exists
    try {
      const response = await axios.get(
        `/api/checktweet?tweetId=${tweetObj.id_str}`
      );
      // console.log('checktweet response ', response.data);
      if (response.data.status === 'OK') {
        setTweetExists(true);
      } else {
        setTweetExists(false);
      }
    } catch (error: any) {
      // console.log('checktweet error ', error);
      if (error.response.status === 404) setTweetExists(false);
    }

    // get nostr profile of user to show users, followers, relays etc.
    for (let index = 0; index < defaultRelays.length; index += 1) {
      const element = defaultRelays[index];
      try {
        const relay = nostrTools.relayInit(element!);
        // setRelayConnection(relay);
        await relay.connect();

        relay.on('connect', () => {
          console.log(`connected to ${relay.url}`);

          const sub = relay.sub([
            {
              kinds: [0, 3],
              authors: [tweetObj.hexPubKey],
              // since: 0,
            },
          ]);
          sub.on('event', async (event: any) => {
            // console.log(
            //   'got event and setUserRelays:  ',
            //   event.content,
            //   'adding to ',
            //   userRelays,
            //   '\nparsed: ',
            //   JSON.parse(event.content)
            // );

            if (event.kind === 3) {
              // console.log('got 3 ', event);
              const relayList = JSON.parse(event.content);
              Object.keys(relayList).forEach((k) => {
                // console.log(
                //   'calling checkAdd with k, ',
                //   k,
                //   relayList[k],
                //   userRelays
                // );
                checkAdd({
                  url: k,
                  read: relayList[k].read,
                  write: relayList[k].write,
                });
              });
            }

            if (event.kind === 0) {
              // console.log('got 0 ', event);
              const metadata = JSON.parse(event.content);
              if (metadata.nip05 && nip05 === '') {
                // validate nip05
                const response = await axios.get(
                  `https://${
                    metadata.nip05.split('@')[1]
                  }/.well-known/nostr.json?name=${metadata.nip05.split('@')[0]}`
                );

                if (
                  response.data.names[metadata.nip05.split('@')[0]] ===
                  tweetObj.hexPubKey
                ) {
                  const formattedNip5 = metadata.nip05.startsWith('_@')
                    ? `@${metadata.nip05.split('@')[1]}`
                    : metadata.nip05;
                  setNip05(formattedNip5);
                }
              }
            }
          });
          sub.on('eose', async () => {
            // console.log('eose');
            sub.unsub();
            setFetching(false);
          });
        });
        relay.on('error', () => {
          console.log(`failed to connect to ${relay.url}`);
          setErrorAlert({
            open: true,
            text: `failed to connect to ${relay.url}`,
          });
          setFetching(false);
        });
      } catch (error: any) {
        console.log('relay connect error ', element, error);
        setFetching(false);
      }
    }
    setFetching(false);
  };

  const signWithNip07 = async () => {
    console.log('enter signWithNip07 tgVerificationText ', tgVerificationText);
    if (!window.nostr) {
      // alert('You need to have a browser extension with nostr support!');
      setErrorAlert({
        open: true,
        text: 'You need to have a browser extension with nostr support!',
      });
      return;
    }

    if (!tgVerificationText) {
      // alert('Please enter your twitter handle first!');
      setErrorAlert({
        open: true,
        text: 'Please paste the string returned to you by @nostrdirectory bot!',
      });
      return;
    }

    try {
      const content = tgVerificationText;
      const pubkey = await window.nostr.getPublicKey();
      const unsignedEvent: any = {
        pubkey,
        created_at: Math.floor(Date.now() / 1000),
        kind: 1,
        tags: [
          [
            'p',
            '5e7ae588d7d11eac4c25906e6da807e68c6498f49a38e4692be5a089616ceb18',
          ],
        ],
        content,
      };
      unsignedEvent.id = nostrTools.getEventHash(unsignedEvent);
      // console.log('unsignedEvent ', unsignedEvent);

      const signedEvent = await window.nostr.signEvent(unsignedEvent);
      // console.log('signedEvent ', signedEvent);

      // publish to some relays via API
      initNostr({
        relayUrls: [
          'wss://nostr.zebedee.cloud',
          // 'wss://nostr-relay.wlvs.space',
          'wss://nostr-pub.wellorder.net',
          // 'wss://nostr-relay.untethr.me',
        ],
        onConnect: (relayUrl, sendEvent) => {
          console.log(
            'Nostr connected to:',
            relayUrl,
            // sendEvent,
            'sending signedEvent ',
            signedEvent
          );

          // Send a REQ event to start listening to events from that relayer:
          sendEvent([SendMsgType.EVENT, signedEvent], relayUrl);
        },
        onEvent: (relayUrl: any, event: any) => {
          console.log('Nostr received event:', relayUrl, event);
          setAlertOpen(true);
          setTgVerificationDialogOpen(false);
        },
        onError(relayUrl, err) {
          console.log('nostr error ', relayUrl, err);
        },
        debug: true, // Enable logs
      });
    } catch (error: any) {
      console.log('signWithNip07 error ', error.message);
    }
  };

  useEffect(() => {
    if (router.isReady) fetchInitialData();
  }, [router.isReady]);

  useEffect(() => {
    // console.log('userRelays updated! ', userRelays);
    const uniqueArray = userRelays.filter((value, index) => {
      const y = JSON.stringify(value);
      return (
        index ===
        userRelays.findIndex((obj) => {
          return JSON.stringify(obj) === y;
        })
      );
    });
    setFilteredRelays(uniqueArray);

    // set nip19 profile now that we have relays
    const relays: string[] = filteredRelays.map((a) => a.url);
    const nprofile = nip19.nprofileEncode({
      pubkey: tweet.hexPubKey,
      relays,
    });
    setNProfile(nprofile);

    // console.log('filtered: ', uniqueArray);
  }, [userRelays]);

  useEffect(() => {
    if (nip05 === '') {
      // increment wotscore
      setWotScore((ws) => ws + 10);
    }
  }, [nip05]);

  useEffect(() => {
    // calculate wotScore
    if (tweet.verified) setWotScore((ws) => ws + 10);
    if (tweet.mastodon) setWotScore((ws) => ws + 10);
    if (tweet.donated) setWotScore((ws) => ws + 10);
    if (tweet.telegram) setWotScore((ws) => ws + 10);
  }, [tweet]);

  useEffect(() => {
    if (validPFP || !tweet.profileImageUrl) return;
    // check and validate profileImageUrl and fix it if it's broken because some people update their pfp for some reason :)
    // https://github.com/pseudozach/nostr.directory/issues/11
    async function fetchPFP() {
      try {
        await axios.get(tweet.profileImageUrl);
        setValidPFP(true);
      } catch (error: any) {
        // console.log(
        //   'tweet.profileImageUrl error ',
        //   error.response.status,
        //   tweet.userId
        // );
        if (error.response.status === 404) {
          // fetch new pfp from twitter API
          const response2 = await axios.get(
            `/api/twitterpfp?userId=${tweet.userId}`
          );
          setTweet({
            ...tweet,
            profileImageUrl: response2.data.profile_image_url,
          });
          setValidPFP(true);
        }
      }
    }
    fetchPFP();
  }, [tweet, validPFP]);

  return (
    <Section
      // title={`${tweet.screenName}'s profile`}
      // description={`Here is the profile of ${tweet.screenName}`}
      mxWidth="max-w-screen-lg"
    >
      <div className="profile-container">
        {idNotFound && (
          <Alert severity="error" sx={{ width: '100%' }}>
            {router.query.id} is not found in our database.
          </Alert>
        )}

        {/* // add alert here if user has a newer verified pubkey */}
        {newerKeyExists && (
          <Alert severity="error" sx={{ width: '100%' }}>
            {tweet.screenName} has a newer key. See{' '}
            <Link href="#keyrotation">
              <a>Key Rotation</a>
            </Link>
            .
          </Alert>
        )}

        <Card
          sx={{
            bgcolor: 'transparent',
            borderRadius: '24px',
            'box-shadow': '0px 12px 40px rgba(69, 93, 101, 0.12)',
            position: 'relative',
            alignItems: 'start',
          }}
        >
          {fetching && <LinearProgress />}
          <DynamicButton
            text={'Go back'}
            button_class={'bg-card-a bg-card-b absolute'}
            variant={'roundUpdate'}
            href={''}
          />
          <CardHeader
            sx={{
              background:
                'linear-gradient(180deg, #ECE5F9 0%, rgba(255, 255, 255, 0) 100%)',

              alignItems: 'start',
              '&.MuiPaper-root .MuiPaper-elevation': {
                background: '#202028',
              },
              '@media (min-width: 0)': {
                padding: '100px 16px 24px 16px',
              },
              '@media (min-width: 700px)': {
                padding: '100px 40px 24px 40px',
              },
            }}
            avatar={
              <Avatar
                sx={{
                  width: '56px',
                  height: '56px',
                }}
                alt={`${tweet.screenName} profile picture`}
                src={tweet.profileImageUrl}
              />
            }
            action={
              <Tooltip
                title="WoT Score"
                className="!my-2 !-ml-[75px]"
                onClick={() =>
                  setDialog({
                    open: true,
                    title: 'WoT Score',
                    text: (
                      <p>
                        Web of Trust score for the user is calculated as 10
                        points per badge at the moment. <br />
                        We are looking for feedback on a WoT scheme where users
                        sign messages with their keys to signal how trusted
                        their connections are. <br />
                        Current plan is to implement{' '}
                        <a
                          href="https://github.com/nostr-protocol/nostr/issues/20#issuecomment-913027389"
                          target={'_blank'}
                          rel="noreferrer"
                          className="!underline"
                        >
                          this scheme by fiatjaf.
                        </a>
                      </p>
                    ),
                    button1: <></>,
                    button2: '',
                  })
                }
              >
                <Avatar
                  sx={{
                    backgroundColor: 'green',
                    color: 'white',
                    height: '32px',
                    width: 'fit-content',
                    background: '#3ACC8E',
                    'border-radius': '24px',
                    padding: '4px 12px',
                    marginLeft: '-50px;',
                  }}
                  variant="rounded"
                >
                  <p style={{ fontSize: '13px' }}>
                    Web of trust -{' '}
                    <span style={{ fontSize: '16px', fontWeight: '700' }}>
                      {wotScore}
                    </span>
                  </p>
                </Avatar>
              </Tooltip>
            }
            title={
              <div className="headerContainer">
                <p className="headerTitle">Twitter Account</p>
                <div className="user">
                  @{tweet.screenName}{' '}
                  <div className="key">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.3333 4.99996C10.3333 4.65875 10.2031 4.31753 9.9428 4.05719C9.68247 3.79684 9.3412 3.66667 9 3.66667M9 9C11.2091 9 13 7.20913 13 5C13 2.79086 11.2091 1 9 1C6.79087 1 5 2.79086 5 5C5 5.18245 5.01221 5.36205 5.03587 5.53803C5.07479 5.82747 5.09424 5.9722 5.08115 6.06373C5.0675 6.15913 5.05013 6.21047 5.00313 6.2946C4.958 6.37533 4.87847 6.45487 4.71942 6.61393L1.31242 10.0209C1.19712 10.1362 1.13947 10.1939 1.09824 10.2611C1.06169 10.3208 1.03475 10.3858 1.01842 10.4539C1 10.5306 1 10.6121 1 10.7751V11.9333C1 12.3067 1 12.4934 1.07266 12.636C1.13658 12.7615 1.23857 12.8634 1.36401 12.9273C1.50661 13 1.6933 13 2.06667 13H3.66667V11.6667H5V10.3333H6.33333L7.38607 9.2806C7.54513 9.12153 7.62467 9.042 7.7054 8.99687C7.78953 8.94987 7.84087 8.93247 7.93627 8.91887C8.0278 8.90573 8.17253 8.9252 8.462 8.96413C8.63793 8.9878 8.81753 9 9 9V9Z"
                        stroke="url(#paint0_linear_15_2592)"
                        strokeWidth="1.33333"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <defs>
                        <linearGradient
                          id="paint0_linear_15_2592"
                          x1="13.0141"
                          y1="-2.85366"
                          x2="1.09003"
                          y2="13.7553"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#5684C9" />
                          <stop offset="1" stopColor="#D3A7FF" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <span>
                      {tweet.nPubKey.slice(0, 8)}...${tweet.nPubKey.slice(-8)}{' '}
                    </span>
                    <IconButton
                      aria-label="delete"
                      onClick={() => {
                        navigator.clipboard.writeText(tweet.nPubKey);
                      }}
                    >
                      <ContentCopyRounded />
                    </IconButton>
                  </div>
                </div>
                <div className="mt-2 mb-4 flex items-center gap-2">
                  <a
                    href={`https://twitter.com/${tweet.screenName}`}
                    className="py-2 md:px-6 px-3 min-w-fit rounded-full text-base font-medium bg-[#5f338414] cursor-pointer flex flex-row items-center gap-2"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <svg
                      width="16"
                      height="12"
                      viewBox="0 0 16 12"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M14.6668 2.845L13.414 2.30787L14.0703 0.875539L12.543 1.38282L12.543 1.38282C12.0566 0.929209 11.4183 0.673782 10.7533 0.666656V0.666656C9.27205 0.669939 8.07205 1.87041 8.06877 3.35228V3.94909C5.95691 4.38476 4.11351 3.23292 2.40136 1.26346C2.10307 2.85495 2.40136 4.04856 3.29621 4.8443L1.3335 4.5459L1.3335 4.5459C1.48999 5.8505 2.55775 6.85584 3.86892 6.93312L2.22835 7.52993C2.82492 8.72354 3.91068 8.90855 5.36034 9.02194L5.36034 9.02194C4.17545 9.83042 2.76739 10.2478 1.3335 10.2156C8.94573 13.5994 13.414 8.62805 13.414 4.24749V3.75214L14.6668 2.845Z"
                        stroke="#455D65"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Profile Link
                  </a>
                  <a
                    href={`https://twitter.com/${tweet.screenName}/status/${tweet.id_str}`}
                    className="py-2 md:px-6 px-3 min-w-fit rounded-full text-base font-medium bg-[#5f338414] cursor-pointer flex flex-row items-center gap-2"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M5.79164 7.60399C6.05101 7.95076 6.38194 8.23766 6.76199 8.44532C7.14203 8.65298 7.5623 8.77644 7.99423 8.80736C8.42621 8.83829 8.85977 8.77595 9.26549 8.62459C9.67126 8.47328 10.0397 8.23639 10.3459 7.93016L12.1579 6.11813C12.708 5.54852 13.0124 4.78565 13.0056 3.9938C12.9987 3.20196 12.681 2.44449 12.1211 1.88455C11.5611 1.32461 10.8037 1.00699 10.0119 1.00011C9.22 0.993229 8.45714 1.29764 7.88756 1.84776L6.84866 2.88062M8.20768 6.39597C7.94826 6.04915 7.61732 5.76224 7.23728 5.55461C6.85724 5.34697 6.43703 5.2235 6.00504 5.19256C5.57311 5.16163 5.13956 5.22395 4.73381 5.37531C4.32806 5.52667 3.9596 5.76352 3.65344 6.06981L1.84142 7.88184C1.29129 8.45142 0.986881 9.21428 0.993767 10.0061C1.00065 10.798 1.31826 11.5554 1.8782 12.1154C2.43814 12.6753 3.19561 12.9929 3.98746 12.9998C4.7793 13.0067 5.54217 12.7023 6.11177 12.1522L7.14463 11.1193"
                        stroke="#455D65"
                        strokeWidth="1.20802"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Proof Link
                    {tweetExists ? (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle
                          cx="7"
                          cy="7"
                          r="6.3"
                          fill="#3ACC8E"
                          stroke="white"
                          strokeWidth="0.6"
                        />
                        <path
                          d="M9.8002 4.89999L5.9502 8.74999L4.2002 6.99999"
                          stroke="white"
                          strokeWidth="0.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <Close color="error" />
                    )}
                  </a>
                </div>
                {/* <IconButton
                  aria-label="copy profile link"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${AppConfig.domain}/p/${tweet.screenName || ''}`
                    );
                  }}
                  size="small"
                >
                  <ContentCopy />
                </IconButton> */}
              </div>
            }
          />
          <CardContent
            sx={{
              '@media (min-width: 0)': {
                padding: '0 16px',
              },
              '@media (min-width: 700px)': {
                padding: '0 40px',
              },
            }}
          >
            <h6 className="font-semibold text-base text-nostr-darker">
              Badges
            </h6>
            <div className="mt-2 mb-4 mx-auto flex-col md:flex-row flex items-center gap-4 justify flex-wrap">
              <div className="my-2 flex items-center w-full md:w-max">
                <BadgeCard
                  variant={'twitter'}
                  verified={tweet.verified}
                  href={
                    tweet.verified
                      ? `https://www.nostr.guru/e/${tweet.verifyEvent}`
                      : undefined
                  }
                >
                  <HelpOutline
                    className="cursor-pointer !ml-1 align-middle"
                    onClick={() =>
                      setDialog({
                        open: true,
                        title: 'Twitter Verification',
                        text: (
                          <>
                            User is expected to: <br />
                            1. tweet their nostr public key by following the
                            format on the nostr.directory homepage.
                            <br />
                            2. send a public (kind 1) note on nostr following
                            the format on the nostr.directory homepage.
                          </>
                        ),
                        button1: <></>,
                        button2: 'ok',
                      })
                    }
                  />
                </BadgeCard>
              </div>
              <div className="my-2 flex items-center w-full md:w-max">
                <BadgeCard
                  variant={'telegram'}
                  verified={!!tweet.telegram}
                  href={
                    tweet.telegram
                      ? `https://www.nostr.guru/e/${tweet.telegramEvent}`
                      : undefined
                  }
                >
                  <HelpOutline
                    className="cursor-pointer !ml-1 align-middle"
                    onClick={() => setTgVerificationDialogOpen(true)}
                  />
                </BadgeCard>
              </div>
              {/* <div className="my-2 flex items-center">
                {tweet.telegram ? (
                  <>
                    <a
                      href={`https://www.nostr.guru/e/${tweet.telegramEvent}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <VerifiedUserIcon
                        color="success"
                        className="mr-2"
                        fontSize="large"
                      />
                    </a>
                    <span>
                      User has signed their <b>telegram</b> profile with their
                      nostr private key.
                    </span>
                  </>
                ) : (
                  <>
                    <VerifiedUserIcon
                      color="error"
                      className="mr-2"
                      fontSize="large"
                    />
                    <span>
                      User has <b>NOT</b> signed their <b>telegram</b> profile
                      with their nostr private key.
                    </span>
                  </>
                )}
                <HelpOutline
                  className="cursor-pointer !ml-1 align-middle"
                  onClick={() => setTgVerificationDialogOpen(true)}
                />
              </div> */}
              <div className="my-2 flex items-center w-full md:w-max">
                <BadgeCard
                  variant={'mastodon'}
                  verified={!!tweet.mastodon}
                  href={
                    tweet.mastodon
                      ? `https://www.nostr.guru/e/${tweet.mastodonEvent}`
                      : undefined
                  }
                >
                  <HelpOutline
                    className="cursor-pointer !ml-1 align-middle"
                    onClick={() =>
                      setDialog({
                        open: true,
                        title: 'Mastodon Verification',
                        text: (
                          <>
                            User is expected to; <br />
                            1. set a meta entry on their mastodon profile {
                              '>'
                            }{' '}
                            appearance {'>'} Profile Metadata with key:value =
                            nostr:<b>hex</b> public key.
                            <br />
                            2. send a public (kind 1) note on nostr following
                            the below format.
                            <br />
                            <br />
                            <div className="mt-1">
                              <code className="break-all mb-4">{`@npub1teawtzxh6y02cnp9jphxm2q8u6xxfx85nguwg6ftuksgjctvavvqnsgq5u Verifying My Public Key for mastodon: "${'Your mastodon profile link e.g. https://mastodon.social/@melvincarvalho'}"`}</code>
                            </div>
                          </>
                        ),
                        button1: <></>,
                        // (
                        //   <div
                        //     className="cursor-pointer"
                        //     onClick={() => {
                        //       navigator.clipboard.writeText(
                        //         `@5e7ae588d7d11eac4c25906e6da807e68c6498f49a38e4692be5a089616ceb18 Verifying My Public Key for mastodon: "${'Your mastodon profile link e.g. https://mastodon.social/@melvincarvalho'}"`
                        //       );
                        //     }}
                        //   >
                        //     <OutlinedButton>
                        //       Copy Verification Text
                        //     </OutlinedButton>
                        //   </div>
                        // ),
                        button2: 'ok',
                      })
                    }
                  />
                </BadgeCard>
              </div>

              {/* Add information for github */}
              <div className="my-2 flex items-center w-full md:w-max">
                <BadgeCard
                  variant={'github'}
                  verified={!!tweet.telegram}
                  href={
                    tweet.telegram
                      ? `https://www.nostr.guru/e/${tweet.telegramEvent}`
                      : undefined
                  }
                >
                  <HelpOutline
                    className="cursor-pointer !ml-1 align-middle"
                    onClick={() => setTgVerificationDialogOpen(true)}
                  />
                </BadgeCard>
              </div>
              <div className="my-2 flex items-center w-full md:w-max">
                <BadgeCard
                  text={nip05}
                  variant={'nip'}
                  verified={!!nip05}
                  href={
                    nip05
                      ? `https://${
                          nip05.split('@')[1]
                        }/.well-known/nostr.json?name=${nip05.split('@')[0]}`
                      : undefined
                  }
                >
                  <HelpOutline
                    className="cursor-pointer !ml-1 align-middle"
                    onClick={() =>
                      setDialog({
                        open: true,
                        title: 'NIP-05 Verification',
                        text: (
                          <>
                            User is expected to: <br />
                            Have a nip05 tag on their nostr profile that
                            resolves to their Hex Public Key as per
                            <a
                              href="https://github.com/nostr-protocol/nips/blob/master/05.md"
                              target={'_blank'}
                              rel="noreferrer"
                              className="!underline"
                              style={{ display: 'inline' }}
                            >
                              NIP-05 nostr specification.
                            </a>
                          </>
                        ),
                        button1: <></>,
                        button2: 'ok',
                      })
                    }
                  />
                </BadgeCard>
              </div>
              <div className="my-2 flex items-center w-full md:w-max">
                <BadgeCard variant={'btc'} verified={!!tweet.donated}>
                  <HelpOutline
                    className="cursor-pointer !ml-1 align-middle"
                    onClick={() =>
                      setDialog({
                        open: true,
                        title: 'Donation Badge',
                        text: (
                          <>
                            User is expected to send at least 1000 sats donation
                            to{' '}
                            <a
                              href="lightning:nostrdirectory@getalby.com"
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold underline"
                            >
                              {' '}
                              nostrdirectory@getalby.com
                            </a>{' '}
                            Lightning Address and set their pubkey as the{' '}
                            <a
                              href="https://getalby.com/p/nostrdirectory"
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold underline"
                              style={{ display: 'inline' }}
                            >
                              message/comment/payer
                            </a>
                          </>
                        ),
                        button1: <></>,
                        button2: 'ok',
                      })
                    }
                  />
                </BadgeCard>
              </div>
            </div>

            <h6 className="font-semibold text-base text-nostr-darker mb-2">
              NIP 19
            </h6>
            <TextField
              label="hexPubKey"
              id="hexPubKey"
              className="!my-2"
              value={tweet.hexPubKey}
              fullWidth
              InputProps={{
                style: {
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0px 4px 16px rgba(69, 93, 101, 0.04)',
                  borderRadius: '12px',
                  border: '1px solid #F5F6F6',
                },
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    {' '}
                    <IconButton
                      aria-label="copy hex pubkey"
                      onClick={() => {
                        setDialog({
                          open: true,
                          title: 'hexPubKey QR Code',
                          text: (
                            <div
                              style={{
                                width: '100%',
                                display: 'grid',
                                placeItems: 'center',
                              }}
                            >
                              <QRCodeSVG
                                value={tweet.hexPubKey || ''}
                                size={256}
                              />
                            </div>
                          ),
                          button1: <></>,
                          button2: 'ok',
                        });
                      }}
                    >
                      <QrCode />
                    </IconButton>
                    <IconButton
                      aria-label="copy npub"
                      onClick={() => {
                        navigator.clipboard.writeText(tweet.hexPubKey || '');
                      }}
                    >
                      <ContentCopy />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="nPubKey"
              id="nPubKey"
              className="!my-2"
              value={tweet.nPubKey}
              fullWidth
              InputProps={{
                style: {
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0px 4px 16px rgba(69, 93, 101, 0.04)',
                  borderRadius: '12px',
                  border: 'none',
                },
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    {' '}
                    <IconButton
                      aria-label="copy hex pubkey"
                      onClick={() => {
                        setDialog({
                          open: true,
                          title: 'nPubKey QR Code',
                          text: (
                            <QRCodeSVG value={tweet.nPubKey || ''} size={256} />
                          ),
                          button1: <></>,
                          button2: 'ok',
                        });
                      }}
                    >
                      <QrCode />
                    </IconButton>
                    <IconButton
                      aria-label="copy hex pubkey"
                      onClick={() => {
                        navigator.clipboard.writeText(tweet.nPubKey || '');
                      }}
                    >
                      <ContentCopy />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="nProfile"
              id="nProfile"
              className="!mt-2"
              value={nProfile}
              fullWidth
              InputProps={{
                style: {
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0px 4px 16px rgba(69, 93, 101, 0.04)',
                  borderRadius: '12px',
                  border: 'none',
                },
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    {' '}
                    <IconButton
                      aria-label="copy hex pubkey"
                      onClick={() => {
                        setDialog({
                          open: true,
                          title: 'nProfile QR Code',
                          text: <QRCodeSVG value={nProfile} size={256} />,
                          button1: <></>,
                          button2: 'ok',
                        });
                      }}
                    >
                      <QrCode />
                    </IconButton>
                    <IconButton
                      aria-label="copy hex pubkey"
                      onClick={() => {
                        navigator.clipboard.writeText(nProfile || '');
                      }}
                    >
                      <ContentCopy />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            {filteredRelays.length > 0 && (
              <div className="my-4 flex-vertical items-center">
                <h6 className="font-semibold text-base text-nostr-darker mb-2">
                  Relay
                </h6>
                <TableContainer component={Paper} className="my-2">
                  <Table
                  // sx={{ minWidth: 650 }}
                  >
                    {/* <TableHead>
                    <TableRow>
                      <TableCell>Relay URLs</TableCell>
                      <TableCell align="right">Read</TableCell>
                      <TableCell align="right">Write</TableCell>
                    </TableRow>
                  </TableHead> */}

                    <TableBody>
                      {filteredRelays.map((row: any) => (
                        <TableRow
                          key={Math.random()}
                          sx={{
                            '&:last-child td, &:last-child th': { border: 0 },
                          }}
                        >
                          <TableCell component="th" scope="row">
                            <p style={{ marginBottom: '3px' }}>URL</p>
                            {row.url}
                          </TableCell>
                          <TableCell
                            sx={{
                              padding: '0',
                              width: '100px',
                            }}
                            align="right"
                          >
                            <p
                              className={`iconTrue ${!row.read && 'iconFalse'}`}
                            >
                              Read
                            </p>
                          </TableCell>
                          <TableCell
                            sx={{
                              padding: '0',
                              width: '100px',
                            }}
                            align="right"
                          >
                            <p
                              className={`iconTrue ${
                                !row.write && 'iconFalse'
                              }`}
                            >
                              Write
                            </p>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </div>
            )}

            {/* <Typography variant="h6" color="text.secondary" className="!mt-2">
              Social Proofs
            </Typography>

            {tweet.mastodon && (
              <div className="my-4 flex items-center">
                <Image
                  src={'/assets/images/Mastodonlogo.svg'}
                  alt="mastodon logo"
                  width={40}
                  height={40}
                />
                <a>
                  <a
                    href={`${tweet.mastodon}`}
                    className="mx-2 underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Profile Link
                  </a>
                </a>
                <a
                  href={`${tweet.mastodon}.json`}
                  className="mx-2 underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Proof Link
                </a>
              </div>
            )}
            {tweet.telegram && (
              <div className="my-4 flex items-center">
                <Telegram sx={{ height: '40px', width: '40px' }} />
                <a>
                  <a
                    href={`https://t.me/${tweet.telegramUserName}`}
                    className="mx-2 underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Profile Link
                  </a>
                </a>
                <a
                  href={`https://t.me/nostrdirectory/${tweet.telegramMsgId}`}
                  className="mx-2 underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Proof Link
                </a>
              </div>
            )} */}
            {previousKeys.length > 0 && (
              <>
                <Typography
                  variant="h6"
                  color="text.secondary"
                  className="!mt-2"
                >
                  Key Rotation
                </Typography>
                <div
                  className="my-2 flex-vertical items-center"
                  id="keyrotation"
                >
                  <TableContainer component={Paper} className="my-2">
                    <Table
                    // sx={{ minWidth: 650 }}
                    >
                      <TableHead>
                        <TableRow>
                          <TableCell>
                            Other Keys for <b>{tweet.screenName}</b>
                          </TableCell>
                          <TableCell align="right">Date Posted</TableCell>
                          <TableCell align="center">Verified?</TableCell>
                          <TableCell align="center">Profile</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {previousKeys.map((row: any) => (
                          <TableRow
                            key={Math.random()}
                            sx={{
                              '&:last-child td, &:last-child th': { border: 0 },
                            }}
                          >
                            <TableCell component="th" scope="row">
                              {row.nPubKey}
                            </TableCell>
                            <TableCell align="right">{`${new Date(
                              row.created_at
                            ).toLocaleString()}`}</TableCell>
                            <TableCell
                              component="th"
                              scope="row"
                              align="center"
                            >
                              {row.verified === true ? (
                                <Link
                                  href={`https://www.nostr.guru/e/${row.verifyEvent}`}
                                >
                                  <a target="_blank">
                                    <CheckCircle htmlColor="green" />
                                  </a>
                                </Link>
                              ) : (
                                <Tooltip
                                  title="Pubkey is not verified on nostr."
                                  placement="top"
                                >
                                  <Cancel htmlColor="red" />
                                </Tooltip>
                              )}
                            </TableCell>
                            <TableCell align="center">
                              <Link href={`/p/${row.nPubKey}`}>
                                <a>
                                  <ArrowCircleRightOutlined className="text-nostr-light" />
                                </a>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Dialog
          open={dialog.open}
          onClose={handleClose}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
          fullWidth
          PaperProps={{
            style: {
              background: '#202028',
              boxShadow: '0px 12px 40px rgba(69, 93, 101, 0.12)',
              borderRadius: '12px',
              display: 'flex',
              gap: '6px',
              padding: ' 16px',
              width: '370px',
            },
          }}
        >
          <DialogTitle
            id="alert-dialog-title"
            sx={{
              color: 'white',
              fontWeight: 800,
              fontSize: '16px',
              padding: 0,
            }}
          >
            {dialog.title}
          </DialogTitle>
          <DialogContent sx={{ padding: 0 }}>
            <DialogContentText
              id="alert-dialog-description"
              className="flex justify-center"
              sx={{
                color: 'white',
                fontWeight: 400,
                fontSize: '13px',

                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {dialog.text}
            </DialogContentText>
          </DialogContent>
          {/* <DialogActions>
            {dialog.button1 && dialog.button1}

            <div className="cursor-pointer">
              <Button onClick={handleClose}>{dialog.button2}</Button>
            </div>
          </DialogActions> */}
        </Dialog>

        <Dialog
          open={tgVerificationDialogOpen}
          onClose={handleClose}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
          fullWidth
          PaperProps={{
            style: {
              background: '#202028',
              boxShadow: '0px 12px 40px rgba(69, 93, 101, 0.12)',
              borderRadius: '12px',
              display: 'flex',
              gap: '6px',
              padding: ' 16px',
              width: '370px',
            },
          }}
        >
          <DialogTitle
            sx={{
              color: 'white',
              fontWeight: 800,
              fontSize: '16px',
              padding: 0,
            }}
            id="tg-popup"
          >
            Telegram Verification
          </DialogTitle>
          <DialogContent>
            <DialogContentText
              id="tg-popup-description"
              className="flex justify-center"
              sx={{
                color: 'white',
                fontWeight: 400,
                fontSize: '13px',

                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Typography className="mt-4">
                <>
                  User is expected to; <br />
                  <b>1.</b> Join{' '}
                  <a
                    href="https://t.me/nostrdirectory"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    @nostrdirectory telegram group
                  </a>
                  <br />
                  <br />
                  <b>2.</b> Post a public message in the telegram group in below
                  format:
                  <br />
                  <div className="mt-1">
                    <code className="break-all mb-4">{`Verifying My Public Key: "Paste your public key here"`}</code>
                  </div>
                  nostrdirectorybot will auto-reply to your message and provide
                  you with your verification text.
                  <br />
                  <br />
                  <b>3.</b> If you have Alby or nos2x extension installed, paste
                  your verification text below to publish your note from here by
                  clicking &quot;Publish with Extension&quot;
                  <TextField
                    id="telegram-string"
                    className="!my-4 text-[white]"
                    required
                    label="Telegram Verification Text"
                    variant="outlined"
                    placeholder={`@npub1tea...nsgq5u Verifying My Public Key for telegram: "pseudozach:123123123"`}
                    onChange={(e) => setTgVerificationText(e.target.value)}
                    value={tgVerificationText}
                    fullWidth
                    inputProps={{ style: { color: 'white', outline: 'white' } }}
                    InputLabelProps={{
                      sx: {
                        // set the color of the label when not shrinked
                        color: 'white',
                      },
                    }}
                  />
                  <br />
                  <b>OR</b> Publish the telegram verification text on nostr as a
                  public (kind 1) note from your favorite client.
                  {/* , it should look
                  like the below:
                  <br />
                  <div className="mt-1">
                    <code className="break-all mb-4">{`@npub1teawtzxh6y02cnp9jphxm2q8u6xxfx85nguwg6ftuksgjctvavvqnsgq5u Verifying My Public Key for telegram: "${'Your telegram screenName:Your telegram user ID'}"`}</code>
                  </div> */}
                </>
              </Typography>
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <div className="cursor-pointer">
              <Button onClick={signWithNip07}>Publish with Extension</Button>
            </div>

            <div className="cursor-pointer">
              <Button
                onClick={() => {
                  setTgVerificationDialogOpen(false);
                }}
              >
                ok
              </Button>
            </div>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={errorAlert.open}
          autoHideDuration={10000}
          onClose={handleErrorAlertClose}
        >
          <Alert
            onClose={handleErrorAlertClose}
            severity="error"
            sx={{ width: '100%' }}
          >
            {errorAlert.text}
          </Alert>
        </Snackbar>
        <Snackbar
          open={alertOpen}
          autoHideDuration={10000}
          onClose={handleAlertClose}
        >
          <Alert
            onClose={handleAlertClose}
            severity="success"
            sx={{ width: '100%' }}
          >
            Note published successfully.
          </Alert>
        </Snackbar>

        {/* <AlertSnackbar
          open={alertOpen}
          severity="success"
          text="Note published successfully."
        /> */}
      </div>
      <style jsx>{`
        .profile-container {
          background-color: transparent;
          /* card shadow */

          box-shadow: 0px 12px 40px rgba(69, 93, 101, 0.12);
          border-radius: 24px;
        }
        .headerTitle {
          font-weight: 400;
          font-size: 16px;
          line-height: 26px;
          letter-spacing: -0.02em;

          color: #455d65;
        }
        .user {
          font-weight: 800;
          font-size: 24px;
          line-height: 38px;

          letter-spacing: -0.02em;

          color: #27363a;
          display: flex;
          flex-direction: row;
        }
        .user span {
          font-weight: 400;
          font-size: 16px;
          background: linear-gradient(
            215.68deg,
            #5684c9 -18.74%,
            #d3a7ff 103.35%
          );
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-fill-color: transparent;
        }
        .iconTrue {
          display: grid;
          place-items: center;
          width: 55px;
          height: 28px;
          background: rgba(29, 67, 88, 0.08);
          border-radius: 24px;
          font-weight: 400;
          font-size: 13px;
          color: #27363a;
        }
        .iconFalse {
          color: #455d655e;
        }
         {
          /* .headerContainer {
          display: flex;
        } */
        }
        @media (min-width: 0) {
          .user {
            flex-direction: column;
          }
          .key {
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 5px;
          }
        }
        @media (min-width: 700px) {
          .user {
            flex-direction: row;
            gap: 10px;
            align-items: center;
          }
        }
      `}</style>
    </Section>
  );
};

export { Profile };
