let { fetch } = require("undici")
module.exports = async () => {
    peers.forEach(peer => {
        addPeersFrom(peer)
        pushNodeToPeer(peer)
    })
}
let peerFailureCounter = {}
async function addPeersFrom(bootstrap) {
    let subpeers = await fetch("http://" + bootstrap + "/peers").then(res => res.json()).catch(e => { console.log(e); return null })
    if (subpeers == null || !Array.isArray(subpeers)) {
        if (peerFailureCounter[bootstrap]) { peerFailureCounter[bootstrap]++ } else { peerFailureCounter[bootstrap]++ }
        if (peerFailureCounter[bootstrap] > 100) {
            peers.delete(bootstrap)
        }
        console.log("Failed to fetch peers from " + bootstrap)
        return
    }
    if (subpeers.filter(sp => !peers.has(sp)).length < 1) {
        return
    }
    console.log("Added peers " + subpeers.join(", "))
    peers = new Set([...peers, ...subpeers])
    needToWrite.add("peers")
}
async function pushNodeToPeer(peer) {
    await fetch("http://" + peer + "/listPeer", { method: "POST", body: config.externalIp + ":11520" }).then(res => res.json()).catch(e => { console.log(e); return null })
}
