let { fetch } = require("undici")
let { bls12_381: bls } = require('@noble/curves/bls12-381');
let crypto = require("crypto")
let stateSuggestions = []
module.exports = async () => {

    for (peer of [...peers]) {
        checkForNewState(peer)
    }

}
async function checkForNewState(peer) {
    let stateSuggestion = await fetch("http://" + peer + "/stateSignature").then(res => res.json()).catch(e => { return null })
    if (!stateSuggestion || !stateSuggestion.stateHash || !stateSuggestion.signature || !stateSuggestion.signer || !stateSuggestion.expires || typeof stateSuggestion.sequence != "number") {
        return console.error("Failed to fetch state suggestion from " + peer + ", error message: " + stateSuggestion?.error)
    }
    if (!currentPowerSet.find(pk => pk.toString("base64url") == stateSuggestion.signer)) { return }
    if (stateSuggestion.sequence <= state.sequence || stateSuggestion.expires < Date.now()) { return }

    let signedText = Buffer.from(stateSuggestion.stateHash + ";" + stateSuggestion.expires + ";" + stateSuggestion.sequence)
    let signer = Buffer.from(stateSuggestion.signer, "base64")
    let signature = Buffer.from(stateSuggestion.signature, "base64")
    if (!bls.verify(signature, signedText, signer)) { return }
    stateSuggestions = [...stateSuggestions.filter(suggestion => suggestion.signer != stateSuggestion.signer), stateSuggestion]

}
async function checkPendingStates() {

    let threshold = Math.floor(currentPowerSet.length / 2) + 1
    let stateHash = crypto.createHash("sha256").update(JSON.stringify(state)).digest()
    stateSuggestions = stateSuggestions.filter(suggestion => suggestion.expires > Date.now() && suggestion.sequence >= (state.sequence || 0) && suggestion.stateHash != stateHash)
    if (stateSuggestions.length < 1) { return }
    let count = stateSuggestions.reduce((pv, cv) => {
        if (!pv[cv.stateHash]) {
            pv[cv.stateHash] = 1
        } else {
            pv[cv.stateHash]++
        }
        return pv
    }, {})
    let nextState = Object.entries(count).find(([hash, votes]) => votes >= threshold)
    if (!nextState) { return } // Our node has most updated state
    nextState = nextState[0]

    let stateFromPeer;
    for (peer of peers) {
        stateFromPeer = await fetch("http://" + peer + "/state").then(res => res.text()).catch(e => { console.log(e); return null })
        if (crypto.createHash("sha256").update(stateFromPeer).digest("base64") == nextState) { break }
    }
    if (!stateFromPeer) {
        return console.error("Error upgrading state! Peers didn't provide elected state")
    }
    state = JSON.parse(stateFromPeer)
    console.log("Upgraded state to " + nextState)
    needToWrite.add("state")
}
setInterval(() => checkPendingStates(), 5000)