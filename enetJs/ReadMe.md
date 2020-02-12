# Execution order
Reference: https://dev.to/logicmason/settimeout-vs-setimmediate-vs-process-nexttick-3lj2

````
current event loop
nextTick
timeout
immediate
````

- The first one executed was `process.nextTick`, which puts its callback at the front of the event queue. It will execute after the code currently being executed but before any I/O events or timers.
- Next is "timeout". Since we passed setTimeout a timeout of 0, there's no additional enforced delay before its execution, and it is placed on into the timer queue during the next loop.
- Finally, we have setImmediate, which is clearly not as immediate as its name suggests! Its callback is placed in the check queue of the next cycle of the event loop. Since the check queue occurs later than the timer queue, setImmediate will be slower than setTimeout 0.

All in all, the event loop looks like this:
````
timers -> IO -> poll -> check ->close -> timers -> ...
````

# Options
 - Socket.io p2p (webRTC, with signalling through socket.io server)
 - KCP UDP (sacrifices bandwidth for speed). Faster than Raknet, ENet
 - Netcode.io (Crypto + MITM etc.)
 - Pjon alternate network stack for IOT devices
 - Node.js Datagram
 - IPFS pub/sub as signaling server for k-rpc-webRTC

Ref: Holepunching, NAT Check https://www.usenix.org/legacy/event/usenix05/tech/general/full_papers/ford/ford.pdf

 - RPC with WebTorrent (https://github.com/chr15m/bugout)
   - Has good request-response paradigm over WebTorrent
   - Browser-to-Browser and NodeJs
   - does not support streams as response
   - 20 byte infohash, compatible with Torrents
   - RPC happens with Torrent RPC API. Each call is routed through DHT (no direct connection?)
   - Uses pubKey encryption to validate the RPC. 

 - DHT-RPC
   - supports streams
   - 32 byte lookup keys, not compatible with Torrents (Mainline DHT)
   - RPC happens through DHT with custom commands. Each call is routed through DHT. No direct connection (after discovery, manual connection has to be established with @hyperswarm/ packages)

  - WebRTC with IPFS PubSub Signalling (https://github.com/cretz/webrtc-ipfs-signaling)
    - ICE (STUN) + Signalling with PubSub + UDP (WebRTC)
    - Need to maintain public STUN / TURN servers + PubSub Infra, for direct P2P connection

1. DHT-RPC (@hyperswarm/network) does hole-punching (STUN). With a temp TCP/UDP connection, exchange the webRTC offer/answer. UDP -> promotes to webRTC ?
2. RPC with WebTorrent: use it for initial signalling and promote to webRTC?
3. Use pubsub IPFS for signalling, for webRTC.