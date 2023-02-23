let { fetch } = require("undici")
module.exports = async () => {

    for (peer of peers) {
        await checkForNewSnapshots(peer)
    }

}
async function checkForNewSnapshots(peer) {

    let newSnapshots = await fetch("http://" + peer + "/snapshotsSince/" + powerSnapshots[powerSnapshots.length - 1].split(":")[0].split(";")[0]).then(res => res.json()).catch(e => { console.log(e); return null })
    if (!newSnapshots || newSnapshots.error || !Array.isArray(newSnapshots.snapshots)) {
        return console.error("Failed to fetch snapshots from " + peer)
    }
    for (snapshot of newSnapshots.snapshots) {
        await attemptAddingPowerSnapshot(snapshot)
    }

}
async function attemptAddingPowerSnapshot(snapshotString) {
    let signature = Buffer.from(snapshotString.split(":")[0].split(";")[0], "base64")
    let signers = snapshotString.split(":")[0].split(";")[1].split(",").map(signerPubkey => Buffer.from(signerPubkey, "base64"))
    let newPowerSet = snapshotString.split(":")[1].split(";").map(pubkey => Buffer.from(pubkey, "base64"))
    let correlatedSigners = currentPowerSet.filter(signerInActivePowerSet => signers.find(signer => signer.toString("base64") == signerInActivePowerSet.toString("base64")))
    if (Math.floor(correlatedSigners.length / 2) + 1 < currentPowerSet.length) {
        return console.warn("[Updating power set] Threshold for power update is not met")
    }
    if (!bls.verify(signature, snapshotString.split(":")[1], signers)) {
        return console.warn("[Updating power set] Snapshot rejected due to failure of signature verification")
    }
    currentPowerSet = newPowerSet;
    powerSnapshots.push(snapshotString)
    needToWrite.add("powerSnapshots")
    console.log("[Updated power set], new current snapshot: " + snapshotString)
}