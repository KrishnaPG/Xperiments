<template>
  <div class="hello">
    <h1>{{ msg }}</h1>
    <p>
      For a guide and recipes on how to configure / customize this project,<br>
      check out the
      <a href="https://cli.vuejs.org" target="_blank" rel="noopener">vue-cli documentation</a>.
    </p>
    <h3>Installed CLI Plugins</h3>
    <ul>
    </ul>
    <h3>Essential Links</h3>
    <ul>
      <li><a href="https://vuejs.org" target="_blank" rel="noopener">Core Docs</a></li>
      <li><a href="https://forum.vuejs.org" target="_blank" rel="noopener">Forum</a></li>
      <li><a href="https://chat.vuejs.org" target="_blank" rel="noopener">Community Chat</a></li>
      <li><a href="https://twitter.com/vuejs" target="_blank" rel="noopener">Twitter</a></li>
      <li><a href="https://news.vuejs.org" target="_blank" rel="noopener">News</a></li>
    </ul>
    <h3>Ecosystem</h3>
    <ul>
      <li><a href="https://router.vuejs.org" target="_blank" rel="noopener">vue-router</a></li>
      <li><a href="https://vuex.vuejs.org" target="_blank" rel="noopener">vuex</a></li>
      <li><a href="https://github.com/vuejs/vue-devtools#vue-devtools" target="_blank" rel="noopener">vue-devtools</a></li>
      <li><a href="https://vue-loader.vuejs.org" target="_blank" rel="noopener">vue-loader</a></li>
      <li><a href="https://github.com/vuejs/awesome-vue" target="_blank" rel="noopener">awesome-vue</a></li>
    </ul>
  </div>
</template>

<script>
const { Hypercore, Hyperdrive, resolveName, deleteStorage, destroy } = require('dat-sdk')();

export default {
  name: 'HelloWorld',
  props: {
    msg: String
  },
  mounted: function() {
    // Create a hypercore
    // Check out the hypercore docs for what you can do with it
    // https://github.com/mafintosh/hypercore
    const myCore = Hypercore(null, {
      valueEncoding: 'json',
      persist: false,
      // storage can be set to an instance of `random-access-*`
      // const RAI = require('random-access-idb')
      // otherwise it defaults to `random-access-web` in the browser
      // and `random-access-file` in node
      storage: null  // storage: RAI
    });
    myCore.on("download", (index, data) => {
      console.log("myCore:download:", index, data);
    });
    myCore.on("sync", () => {
      console.log("myCore:sync:");
    });
    myCore.on("upload", (index, data) => {
      console.log("myCore:upload:", index, data);
    });     

    const myId = Math.ceil(Math.random() * 1000);
    // Add some data to it
    myCore.append(JSON.stringify({
      name: 'Alice' + myId
    }), () => { 
      console.log("myId: ", myId);

      const buf = Buffer.alloc(256);
      buf.write("Hello World");

      // Use extension messages for sending extra data over the p2p connection
      const discoveryCoreKey = buf;//'dat://bee80ff3a4ee5e727dc44197cb9d25bf8f19d50b0f3ad2984cfe5b7d14e75de7'
      const discoveryCore = new Hypercore(discoveryCoreKey, {
        persist: false,
        extensions: ['discovery']
      })

      // When you find a new peer, tell them about your core
      discoveryCore.on('peer-add', (peer) => {
        console.log('Got a peer!');
        peer.extension('discovery', myCore.key);
      })

      // When a peer tells you about their core, load it
      discoveryCore.on('extension', (type, message) => {
        console.log('Got extension message', message);
        if (type !== 'discovery') return
        ///discoveryCore.close()

        const otherCore = new Hypercore(message, {
          valueEncoding: 'json',
          persist: false
        });
        otherCore.on("download", (index, data) => {
          console.log("otherCore:download:", index, data);
        });
        otherCore.on("sync", () => {
          console.log("otherCore:sync:");
        });
         otherCore.on("upload", (index, data) => {
          console.log("otherCore:upload:", index, data);
        });      


        // Render the peer's data from their core
        otherCore.get(0, console.log)
      })
    });
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="less">
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
