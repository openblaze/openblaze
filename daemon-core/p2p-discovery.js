let { fetch } = require("undici")
module.exports = async () => {
    peers.forEach(peer => {
        addPeersFrom(peer)
        pushNodeToPeer(peer)
    })
}
let peerFailureCounter = {}
async function addPeersFrom(bootstrap) {

    let subpeers = await fetch("http://" + bootstrap + "/peers").then(res => res.json()).catch(e => { return null })
    if (subpeers == null || !Array.isArray(subpeers)) {
        if (peerFailureCounter[bootstrap]) { peerFailureCounter[bootstrap]++ } else { peerFailureCounter[bootstrap] = 1 }
        console.log("Failure count for " + bootstrap + " - " + peerFailureCounter[bootstrap])
        if (peerFailureCounter[bootstrap] > 10) {
            peers.delete(bootstrap)
            return
        }
        console.log("Failed to fetch peers from " + bootstrap)
        return
    }
    if (subpeers.filter(sp => peers.has(sp)).length < 1) {
        return
    }
    subpeers = subpeers.filter(subpeer => peerFailureCounter[subpeer] < 10)

    console.log("Added peers " + subpeers.filter(sp => peers.has(sp)).join(", "))

    peers = new Set([...peers, ...subpeers])
    needToWrite.add("peers")
}
async function pushNodeToPeer(peer) {
    await fetch("http://" + peer + "/listPeer", { method: "POST", body: config.externalIp + ":11520" }).then(res => res.json()).catch(e => { return null })
}
