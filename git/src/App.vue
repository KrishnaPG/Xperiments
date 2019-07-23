<template>
  <div id="app">
  </div>
</template>

<script>
import HelloWorld from './components/HelloWorld.vue'

export default {
  name: 'app',
  components: {
    HelloWorld
  },
  mounted: async function() {
    // window.dir = 'xyz'
    // console.log(dir);
    // window.fs.mkdir(dir, '0777', () => 
    // {
    //   console.log("mkdircb ", arguments);
    //   // Behold - it is empty!
    //   window.fs.readdir("/", (contents) => console.log("readdircb ", contents));  
    // });
    window.dir = '/tutorial'
    console.log(dir);
    await pfs.mkdir(dir).catch(ex => console.log(ex));
    // Behold - it is empty!
    console.log("contents: ", await pfs.readdir("/"));

    await git.clone({
      dir,
      corsProxy: 'https://cors.isomorphic-git.org',
      url: 'https://github.com/isomorphic-git/isomorphic-git',
      ref: 'master',
      singleBranch: true,
      depth: 10
    });

    // Now it should not be empty...
    console.log("contents: ", await pfs.readdir(dir));
  }
}
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
