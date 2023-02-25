let { fetch } = require("undici")
let { bls12_381: bls } = require('@noble/curves/bls12-381');
let attemptAddingPowerSnapshot = require("../utils/attemptAddingSnapshot")
module.exports = async () => {
    if (!state?.senators) { return console.log("Waiting for state sync") }
    if (Object.keys(state.senators).join(",") == currentPowerSet.map(senatorpk => senatorpk.toString("base64url")).join(",")) {
        return
    }
    console.log("Snapshot corresponds state, trying to generate new snapshot...")
    let contentToSign = Buffer.from(Object.keys(state.senators).join(","))
    let signatures = []

    peers.forEach(async peer => {
        let signatureForNextSnapshot = await fetch("http://" + peer + "/signatureForNextSnapshot").then(res => res.json()).catch(e => { return null })
        if (!signatureForNextSnapshot || !signatureForNextSnapshot.signer || !signatureForNextSnapshot.signature || !currentPowerSet.find(pk => pk.toString("base64url") == signatureForNextSnapshot.signer)) { return }
        if (!bls.verify(Buffer.from(signatureForNextSnapshot.signature, "base64"), contentToSign, Buffer.from(signatureForNextSnapshot.signer, "base64url"))) { return }
        signatures.push(signatureForNextSnapshot)
    })
    setTimeout(async () => {
        if (signatures.length < 1) {
            return
        }
        attemptAddingPowerSnapshot(Buffer.from(bls.aggregateSignatures(signatures.map(s => Buffer.from(s.signature, "base64")))).toString("base64url") + ";" + signatures.map(sig => sig.signer.toString("base64url")).join(",") + ":" + contentToSign)
    }, 10000)
}