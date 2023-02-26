let { fetch } = require("undici")
let crypto = require("crypto")
let attemptAddingPowerSnapshot = require("../utils/attemptAddingSnapshot")
module.exports = async () => {

    for (peer of peers) {
        checkForNewSnapshots(peer)
    }

}
async function checkForNewSnapshots(peer) {

    let newSnapshots = await fetch("http://" + peer + "/snapshotsSince/" + crypto.createHash("sha256").update(powerSnapshots[powerSnapshots.length - 1].split(":")[0].split(";")[0]).digest("base64url")).then(res => res.json()).catch(e => { return null })
    if (!newSnapshots || newSnapshots.error || !Array.isArray(newSnapshots.snapshots)) {
        return console.error("Failed to fetch snapshots from " + peer)
    }
    for (snapshot of newSnapshots.snapshots) {
        await attemptAddingPowerSnapshot(snapshot).catch(e => console.error(e))
    }

}
