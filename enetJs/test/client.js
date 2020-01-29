/**********************************************************
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const ActiveHandles = require('why-is-node-running') // should be your first require
const Discovery = require('@hyperswarm/discovery');
const { performance } = require('perf_hooks');

const DISCO_BOOTSTRAP = [
	'bootstrap1.hyperdht.org:49737',
	'bootstrap2.hyperdht.org:49737',
	'bootstrap3.hyperdht.org:49737'
];

class LocatorMetricsNone {
	getBootstrapServers(def = [] ) {
		return Promise.resolve(def);
	}
	/**
	 * @returns true if referrer is blacklisted
	 * Implementation Notes: Referrers may be holding old data on DHT. 
	 * 	They cannot be blacklisted purely based on their wrong/old entries.
	 *  They may be ranked based on their no. of correct answers and restrict
	 *  only those above certain minimum rank to be considered for referrals.
	 *  By default, all new/unknown hosts should be given the minimum rank to start with. 
	 *  As time progresses, the ranks may be refined to reflect the reality.
	 */
	isReferrerBlacklisted(referrer) {
		return Promise.resolve(false);
	}
	/**
	 * @returns true if the peer was blacklisted earlier
	 * Peers can be blacklisted based on their previous failures to validate
	 * the target keys that they announced.
	 * Peer not being online or not connectable to verify, is not good enough reason
	 * to blacklist it. Peers may come online and go away while roaming.
	 * Blacklisting is a serious business that is targeted at peers that are 
	 * online but announce wrong results (crypto verification fails).
	 */
	isPeerBlacklisted({ port, host, local, referrer }) {
		return local ? Promise.reject(true) : Promise.resolve(false);
	}
	/**
	 * Verifies if the peer is valid owner of the said targetKey.
	 */
	isPeerValid({ port, host, local, referrer }, targetKey) {
		// 1. check if duplicate (pending validation / ongoing validation)
		// 2. check if previously validated
		// 3. connect and ask if it is valid
		return Promise.resolve(true);
	}
	recordEntry(peer, targetKey, timeSpent) {
		// 1. add referrer to bootstrap nodes
		// 2. save the { targetKey -> peer } mapping, along with the current timestamp (last accessed)
		// 3. save the timeSpent performance metric
	}
	close() {
		// shutdown any database connections and cleanup the resources
	}
};

class LookupTracker {
	constructor(targetKey, metrics) {
		this.targetKey = targetKey;
		this.metrics = metrics;
		this.p = new Promise((resolve, reject) => { this.resolve = resolve; this.reject = reject; });
		this.candidates = {}; // TODO: how about trie?
		this.finished = this.cancelled = false;
		this.tStart = performance.now();
	}
	// returns true if peer is found / search cancelled
	onPeer(peer) {
		if (this.finished || this.cancelled) return Promise.resolve(true);
		// check if referrer is blacklisted
		return this.metrics.isReferrerBlacklisted(peer.referrer).then(referrerBlacklisted => {
			if (referrerBlacklisted || this.candidates[peer.host + ":" + peer.port]) return false; // ignore duplicates
			this.candidates[peer.host + ":" + peer.port] = {};
			this.metrics.isPeerBlacklisted(peer).then(peerBlacklisted => {
				if (peerBlacklisted) return false;
				// check if peer is valid for the given key
				this.metrics.isPeerValid(peer, targetKey).then(valid => {
					if (!valid) return false;
					this.tEnd = performance.now();
					this.finished = true;
					this.resolve(peer);
					this.metrics.recordEntry(peer, targetKey, this.timeSpent());
					return true; // found a peer, finally
				});
			});
		});
	}
	cancel(reason) {
		if (this.finished) return;
		this.tEnd = performance.now();
		this.cancelled = true;
		this.reject(reason);
	}
	isInProgress() {
		return !this.finished && !this.cancelled;
	}
	timeSpent() {
		return (this.tEnd ? this.tEnd : performance.now()) - this.tStart;
	}
}

class HyperDiscoveryLookup {
	constructor(d, targetKey, timeout, tracker) {
		const topic = d.lookup(targetKey);
		topic.on('peer', peer => tracker.onPeer(peer));
		topic.on('update', () => {
			if (!tracker.isInProgress()) return;
			// tracker is running, but discovery is complete - this means lookup failed. Start again or cancel
			const waitPeriod = 5000 * ++this.nRetryAttempt;
			if (tracker.timeSpent() + waitPeriod >= timeout)
				tracker.cancel(new Error(`Timeout - lookup did not find any results in ${timeout}ms`));
			else
				this.retryTimer = setTimeout(() => topic.update(), waitPeriod);
		});
		this.topic = topic;
		this.nRetryAttempt = 0;
	}
	close() {
		if (this.retryTimer) clearTimeout(this.retryTimer);
		this.topic.destroy();
		this.topic = null;
	}
}

class Locator {
	constructor(d, m) {
		this.disco = d;
		this.metrics = m;
	}
	static create({
		ephemeral = true,
		bootstrap = DISCO_BOOTSTRAP,
		locatorMetrics = new LocatorMetricsNone() } = {})
	{
		return locatorMetrics.getBootstrapServers(bootstrap).then(bootstrap => 
			new Locator(Discovery({ ephemeral, bootstrap }), locatorMetrics)
		);
	}
	findOwner(pubKeyBuf, timeout = 30000) {
		if (!pubKeyBuf || pubKeyBuf.length != 32)
			throw new Error("pubKeyBuf should be a publicKey buffer of length 32 bytes");
		
		const tracker = new LookupTracker(pubKeyBuf, this.metrics);
		const hdLookup = new HyperDiscoveryLookup(this.disco, pubKeyBuf, timeout, tracker); // TODO: add other discovery lookups here
		
		return tracker.p.finally(() => hdLookup.close());
	}
	close() {
		this.disco.destroy();
		this.disco = null;
		this.metrics.close();
		this.metrics = null;
	}
}

const targetKey = Buffer.from("1696a0b9268596cc1d9257e6e49715aa0999a7ce1fc86b04e209f966d097c08d", "hex");

Locator.create().then(l => {
	l.findOwner(targetKey, 90000).then(console.log).catch(console.log).finally(() => l.close());
});