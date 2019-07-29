<template>
  <div id="app">
    <pre>{{terminalText}}</pre>
  </div>
</template>

<script>
import HelloWorld from './components/HelloWorld.vue'
  import { Mode, mix as Mix } from '@es-git/core';
  import MemoryRepo from '@es-git/memory-repo';
  import ObjectMixin from '@es-git/object-mixin';
  import Walkers from '@es-git/walkers-mixin';
  import FetchMixin from '@es-git/fetch-mixin';
  import Terminal from '@es-git/terminal';
  import saveAsMixin from '@es-git/save-as-mixin';
  import loadAsMixin from '@es-git/load-as-mixin';

export default {
  name: 'app',
  components: {
    HelloWorld
  },
  data: function() {
    return {
      terminalText: '----'
    }
  },
  mounted: async function() {
    const repoUrl = "https://github.com/phulst/node-tile38"; //https://github.com/es-git/test-pull
    const match = repoUrl && /^\https:\/\/(.*)$/.exec(repoUrl);
    if (!match) {
      throw new Error('not a valid url');
      return;
    }
    const url = `https://cors.isomorphic-git.org/${match[1]}.git`;

    const Repo = Mix(MemoryRepo)
      .with(ObjectMixin)
      .with(Walkers)
      .with(FetchMixin, fetch)
      .with(saveAsMixin)
      .with(loadAsMixin);      

    const terminal = new Terminal(m => this.terminalText = m);
    const repo = new Repo();
    terminal.logLine(`Fetching from ${url}`);
    let result = await repo.fetch(url, 'refs/heads/*:refs/heads/*', {
      progress: message => terminal.log(message)
    })
    // list all refs
    for (const ref of result) {
      terminal.logLine(`* ${ref.name} -> ${ref.hash}`);
    }
    terminal.logLine('');
    terminal.logLine('Done!');      

    //---------------------------------------
    // now lets commit something
    // Save a text file in the repo with the contents `hello`
    const hash = await repo.saveText('hello');
    // Save a folder with one file, the one we created above
    const tree = await repo.saveTree({
      'file.txt': {
        mode: Mode.file,
        hash
      }
    });
    // Commit the file and folder to the repo
    const commitHash = await repo.saveCommit({
      author: {
        name: 'Tim Caswell',
        email: 'tim@creationix.com',
        date: new Date()
      },
      committer: {
        name: 'Marius Gundersen',
        email: 'me@mariusgundersen.net',
        date: new Date()
      },
      message: 'initial commit',
      tree,
      parents: []
    });
    // Point the master branch to the commit
    await repo.setRef('refs/heads/master', commitHash);
    // Get the hash that the master branch points to
    const refHash = await repo.getRef('refs/heads/master');
    if (!refHash) throw new Error('branch does not exist');
    // Get the commit (the hash of the tree and the message) using the hash
    const { tree: treeHash, message } = await repo.loadCommit(refHash);
    console.log(message); // `initial commit`
    // Get the hash to the `file.txt' file in the tree
    const { 'file.txt': { hash: fileHash } } = await repo.loadTree(treeHash);
    // Get the content of the file as a string
    const content = await repo.loadText(fileHash);
    console.log(content, " refHash: ", refHash); // `hello`

    // Let try fetch now
    terminal.logLine(`Fetching from ${url}`);
    result = await repo.fetch(url, 'refs/heads/*:refs/heads/*', {
      progress: message => terminal.log(message)
    })
    // list all refs
    for (const ref of result) {
      terminal.logLine(`* ${ref.name} -> ${ref.hash}`);
    }
    terminal.logLine('');
    terminal.logLine('Done!');  
    return;

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
