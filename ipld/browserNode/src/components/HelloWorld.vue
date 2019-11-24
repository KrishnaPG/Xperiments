<template>
  <div class="hello">
    <h1>{{ msg }}</h1>
  </div>
</template>

<script>
const Buffer = require('buffer').Buffer;
const schema1 = {
  "description": "Divide one number by another",
  "type": "method",
  "returns": { "type": "number" },
  "params": {
    "dividend": { "type": "number" },
    "divisor": { "type": "number" }
  },
  "requiredParams": ["dividend", "divisor"],
  "additionalParams": false
};
const schema2 =  { // same as schema1 above, except for the field orders
  "additionalParams": false,
  "description": "Divide one number by another",
  "params": {
    "dividend": { "type": "number" },
    "divisor": { "type": "number" }
  },
  "requiredParams": ["dividend", "divisor"],
  "returns": { "type": "number" },
  "type": "method"
};
export default {
  name: 'HelloWorld',
  props: {
    msg: String
  },
  mounted: function() {
    // var dht = new DHT()
    // dht.listen(20000, function () {
    //   console.log('now listening')
    // })
    // dht.on('peer', function (peer, infoHash, from) {
    //   console.log('found potential peer ' + peer.host + ':' + peer.port + ' through ' + from.address + ':' + from.port)
    // })
    // // find peers for the given torrent info hash
    // dht.lookup('e3811b9539cacff680e418124272177c47477157');


    var client = new WebTorrent();
    var buf = new Buffer('Some file content');
    buf.name = 'Some file name';
    client.seed(buf, x => {
      console.log("on seed: ", x);
    });    

    const ipfs = this.$ipfs;
    ipfs.swarm.addrs((err, peerInfos) => {
      if (err) 
        return console.error("ipfs.swarm.addrs ", err);
      console.log("ipfs.swarm.addrs", peerInfos);
    });
    ipfs.swarm.peers((err, peerInfos) => {
      if (err) return console.error("ipfs.swarm.peers", err);
      console.log("ipfs.swarm.peers", peerInfos);
    });
    ipfs.dag.put(schema1, null, (error, cid1) => {
      console.log("dag put schema1: ", error, cid1, cid1.toString());
    })
    ipfs.dag.put(schema2, null, (error, cid2) => {
      console.log("dag put schema2: ", error, cid2, cid2.toString());    
      ipfs.dag.get(cid2, "/params", (error, result) => {
        console.log("dag get: ", error, result);
      })
    })

    const id = Math.ceil(Math.random() * 1000);
    console.log("my id: ", id);

    ipfs.pubsub.subscribe("hello", msg => {
      console.log(`${id} received message on hello: `, msg.data.toString("utf8"), msg);
    })

    setInterval(() => {
      ipfs.pubsub.publish("hello", Buffer.from(`from: ${id} @ ${(new Date()).toLocaleString()}`, "utf8"));
    }, 1500);

    const cid = 'QmS4ustL54uo8FzR9455qaxZwuMiUhyvMcX9Ba8nUH4uVv';

    ipfs.dht.provide(new Cids(cid), error => {
      console.log("provide : ", cid, error);
    })
    ipfs.dht.findProvs(new Cids("bafybeig6xv5nwphfmvcnektpnojts33jqcuam7bmye2pb54adnrtccjlsu"), {}, (err, peerInfo) => {
      console.log("findProviders err:", err, ", peerinfo: ", peerInfo);
    })
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>
