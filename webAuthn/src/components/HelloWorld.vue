<template>
  <div class="hello">
    <h1>{{ msg }}</h1>
    <AButton :disabled="!socket.connected" @click="onRegisterClicked">Register</AButton>
    {{keys}}
  </div>
</template>

<script>
const Buffer = require('buffer/').Buffer;
export default {
  data: function() {
    return {
      msg: "",
      socket: null,
      keys: this.$Sodium.crypto_box_keypair()
    }
  },
  created: function() {
    this.socket = io('http://localhost:9090', { transports: ['websocket'], upgrade: false })  // by specifying the transport and upgrade-false, we are enabling cluster scaling. Android old browsers may not support this    
  },
  mounted: function() {
    // Create a websocket connecting to our Feathers server
    // Listen to new messages being created
    this.socket.on('signup created', message => {
      console.log('Someone created a signup', message);
    });
    this.socket.on("connection", () => this.socketConnected = true);
  },
  methods: {
    start: async function() {
      const publicKeyCredentialCreationOptions = {
        challenge: Uint8Array.from(
          "randomStringFromServer", c => c.charCodeAt(0)),
        rp: {
          name: "Duo Security",
          // id: window.location.origin,
        },
        user: {
          id: Uint8Array.from(
            "UZSL85T9AFC", c => c.charCodeAt(0)),
          name: "lee@webauthn.guide",
          displayName: "Lee",
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }],
        // authenticatorSelection: {
        // 	authenticatorAttachment: "cross-platform",
        // 	userVerification: "discouraged"
        // },
        timeout: 60000,
        attestation: "direct"
      }
      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
      });
      console.log("credential: ", credential);
      window.cred = credential;

      ws.send(JSON.stringify({
        method: 'register.finish',
        params: {
          attestationResponse: {
            id: credential.id,
            rawId: Buffer.from(credential.rawId).toString("base64"),
            response: {
              clientDataJSON: Buffer.from(credential.response.clientDataJSON).toString("base64"),
              attestationObject: Buffer.from(credential.response.attestationObject).toString("base64")
            },
            type: credential.type
          },
          challenge: Buffer.from("randomStringFromServer").toString("base64"),
          origin: window.location.origin
        }
      }))
    },
    onRegisterClicked: async function () {
      const pk = this.keys.boxPk;
      const publicKey= Multibase.encode("base64", this.$toBuffer(this.keys.boxPk)).toString();
      console.log("publickey: ", publicKey);
      this.socket.emit('get', 'signup', null, { 
        publicKey
      }, async (error, result) => {
        if (error) throw error
        console.log("signup challenge: ", result);

        const { sealedBox } = result;
        const sealedBoxBuf = Multibase.decode(Buffer.from(sealedBox));
        const challenge = this.$Sodium.crypto_box_seal_open(sealedBoxBuf, this.keys.boxPk, this.keys.boxSk);

        const tokenBuf = this.$toBuffer(this.$Sodium.crypto_box_seal_open(sealedBoxBuf, this.keys.boxPk, this.keys.boxSk));
        const serverToken = JSON.parse(tokenBuf.toString());
        console.log("server token: ", serverToken);

        const credential = await navigator.credentials.create({
          publicKey: {
            challenge, 
            rp: { name: "something" }, 
            pubKeyCredParams: [{ alg: -7, type: "public-key" }],
            user: { name: "someuser", displayName: "displayusername", id: new Uint8Array(16) }
          }
        });
        console.log("credential: ", credential);        

        this.socket.emit('create', 'signup', credential, (error, messageList) => {
          if (error) throw error
          console.log('Current messages', messageList);
        });
      });

      //start();
    }
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
