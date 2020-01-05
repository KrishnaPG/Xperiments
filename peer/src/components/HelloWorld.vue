<template>
  <div class="hello">
    <textarea id="remoteOffer" :visible="!isInitiator"></textarea>
    <button @click="onInitiate">Initiate</button>
    <pre id="offer"></pre>
    <p :visible="isInitiator">Copy the above offer/response and paste it into the remote browser window</p>
  </div>
</template>

<script>
const SimplePeer = require('simple-peer')  ;
export default {
  name: 'HelloWorld',
  props: {
    msg: String
  },
  data: function() {
    return {
      isInitiator: false
    }
  },
  mounted: function() {
    const p = new SimplePeer({
      initiator: location.hash === '#1',
      trickle: false
    })

    p.on('error', err => console.log('error', err))

    p.on('signal', data => {
      console.log('SIGNAL', JSON.stringify(data))
      document.querySelector('#outgoing').textContent = JSON.stringify(data)
    })

    document.querySelector('form').addEventListener('submit', ev => {
      ev.preventDefault()
      p.signal(JSON.parse(document.querySelector('#incoming').value))
    })

    p.on('connect', () => {
      console.log('CONNECT')
      p.send('whatever' + Math.random())
    })

    p.on('data', data => {
      console.log('data: ' + data)
    })    
  },
  methods: {
    onInitiate: function() {
      this.isInitiator = true;   
    },
    startPeer: function(initiator = false) {
      const p = new SimplePeer({
        initiator,
        trickle: false
      })

      p.on('error', err => console.log('error', err))

      p.on('signal', data => {
        console.log('SIGNAL', JSON.stringify(data))
        document.querySelector('#outgoing').textContent = JSON.stringify(data)
      })   
    }
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
#outgoing {
  width: 600px;
  word-wrap: break-word;
  white-space: normal;
}
</style>
