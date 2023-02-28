module.exports = async (tx) => {
    let threshold = Math.floor(currentPowerSet.length / 2) + 1
    if (!tx.input || !tx.input.senatorPubkey) {
        throw new Error("Not enough info")
    }
    if (!state.senateCandidates[tx.input.senatorPubkey]) { return new Error("No senator with this pubkey is in candidates list") }
    if (!currentPowerSet.find(senatorpk => senatorpk.toString("base64url") == tx.signer)) {
        throw new Error("Signer is not senator")
    }

    state.senateCandidates[tx.input.senatorPubkey].votes.push(tx.signer)
    if (state.senateCandidates[tx.input.senatorPubkey].votes.length >= threshold) {
        state.senators[tx.input.senatorPubkey] = { ...state.senateCandidates[tx.input.senatorPubkey] }
    }
}