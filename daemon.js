let { bls12_381: bls } = require('@noble/curves/bls12-381');
let path = require("path");
let { fetch } = require("undici")
let os = require('os');
let fs = require("fs");
const fastify = require('fastify')({})
const AutoLoad = require("@fastify/autoload");
module.exports = async (dirname) => {
    global.peers = new Set(JSON.parse(fs.readFileSync(path.join(dirname, "peers.json"))))
    global.anchorLocks = new Map()
    console.log("Starting daemon in", dirname)


    global.powerSnapshots = JSON.parse(fs.readFileSync(path.join(dirname, "powerSnapshots.json")))
    global.config = JSON.parse(fs.readFileSync(path.join(dirname, "config.json")))
    global.state = JSON.parse(fs.readFileSync(path.join(dirname, "state.json")))
    global.currentPowerSet = powerSnapshots[powerSnapshots.length - 1].split(":")[1].split(";").map(pubkey => Buffer.from(pubkey, "base64"))
    let senatorNode = !!currentPowerSet.find(pk => config.pubkey == pk.toString("base64url"))
    global.needToWrite = new Set()
    console.log("Authorized as " + config.pubkey)
    console.log("Current power snapshot: " + powerSnapshots[powerSnapshots.length - 1])

    let updatePeers = require("./daemon-core/p2p-discovery")
    let updateState = require("./daemon-core/state-sync")
    let updateSnapshots = require("./daemon-core/snapshot-sync")
    updatePeers()
    updateSnapshots()
    updateState()
    setInterval(updatePeers, 10000)
    setInterval(updateSnapshots, 20000)
    setInterval(updateState, 10000)
    function saveUpdates() {
        if (needToWrite.has("powerSnapshots")) {
            fs.writeFileSync(path.join(dirname, "powerSnapshots.json"), JSON.stringify(powerSnapshots))
            needToWrite.delete("powerSnapshots")
        }
        if (needToWrite.has("peers")) {
            fs.writeFileSync(path.join(dirname, "peers.json"), JSON.stringify([...peers]))
            needToWrite.delete("peers")
        }
        if (needToWrite.has("state")) {
            fs.writeFileSync(path.join(dirname, "state.json"), JSON.stringify(state))
            needToWrite.delete("state")
        }
    }
    setInterval(saveUpdates, 10000)



    // Start http server via fastify
    try {
        fastify.register(AutoLoad, {
            dir: path.join(__dirname, "routes"),
            options: Object.assign({}, {}),
        });
        await fastify.listen({ port: 11520, host: "0.0.0.0" })
        console.log("Daemon listening at http://" + config.externalIp + ":11520")
    } catch (err) {
        console.log(err)
        fastify.log.error(err)
        process.exit(1)
    }
}

